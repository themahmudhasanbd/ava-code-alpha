use std::path::PathBuf;
use std::sync::Arc;

use ava_config::types::MemoriesConfig;
use ava_core::config::Config;
use ava_core::TurnFeedbackSink;
use ava_core::context::ContextualUserFragment;
use ava_core::context::MemoryContextFragment;
use ava_extension_api::ConfigContributor;
use ava_extension_api::ContentItemKind;
use ava_extension_api::ContextContributor;
use ava_extension_api::ExtensionData;
use ava_extension_api::ExtensionFuture;
use ava_extension_api::ExtensionRegistryBuilder;
use ava_extension_api::PromptFragment;
use ava_extension_api::ThreadLifecycleContributor;
use ava_extension_api::ThreadStartInput;
use ava_extension_api::ToolCall;
use ava_extension_api::ToolContributor;
use ava_extension_api::ToolExecutor;
use ava_features::Feature;
use ava_otel::MetricsClient;
use ava_protocol::MemoryVersion;
use ava_utils_absolute_path::AbsolutePathBuf;

use crate::local::LocalMemoriesBackend;
use crate::prompts::build_memory_tool_developer_instructions;
use crate::tools;

/// Contributes Ava memory read-path prompt context and unified memory tool.
#[derive(Clone, Default)]
pub(crate) struct MemoriesExtension {
    metrics_client: Option<MetricsClient>,
}

impl MemoriesExtension {
    fn new(metrics_client: Option<MetricsClient>) -> Self {
        Self { metrics_client }
    }
}

#[derive(Clone, Debug)]
pub(crate) struct MemoriesExtensionConfig {
    pub(crate) enabled: bool,
    pub(crate) dedicated_tools: bool,
    pub(crate) ava_home: AbsolutePathBuf,
    pub(crate) cwd: PathBuf,
    pub(crate) version: MemoryVersion,
    pub(crate) memories: MemoriesConfig,
}

impl MemoriesExtensionConfig {
    fn from_config(config: &Config) -> Self {
        Self {
            enabled: (config.features.enabled(Feature::MemoryTool) || config.memories.use_memories)
                && config.memories.use_memories,
            dedicated_tools: config.memories.dedicated_tools,
            ava_home: config.ava_home.clone(),
            cwd: config.cwd.to_path_buf(),
            version: config.memories.version,
            memories: config.memories.clone(),
        }
    }
}

impl ContextContributor for MemoriesExtension {
    fn contribute_thread_context<'a>(
        &'a self,
        _session_store: &'a ExtensionData,
        thread_store: &'a ExtensionData,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Vec<PromptFragment>> + Send + 'a>> {
        Box::pin(async move {
            let Some(config) = thread_store.get::<MemoriesExtensionConfig>() else {
                return Vec::new();
            };
            if !config.enabled {
                return Vec::new();
            }

            let Some(instructions) =
                build_memory_tool_developer_instructions(&config.ava_home, config.version).await
            else {
                return Vec::new();
            };
            let instructions = match config.version {
                MemoryVersion::V1 => vec![instructions],
                MemoryVersion::V2 => {
                    // Keep the complete summary while respecting each fragment's byte cap.
                    let mut remaining = instructions.as_str();
                    let mut fragments = Vec::new();
                    while !remaining.is_empty() {
                        let end = remaining.floor_char_boundary(remaining.len().min(8_900));
                        fragments.push(
                            MemoryContextFragment::ReadInstructions(remaining[..end].to_string())
                                .render(),
                        );
                        remaining = &remaining[end..];
                    }
                    fragments
                }
            };
            instructions
                .into_iter()
                .map(|instructions| {
                    PromptFragment::developer_policy(
                        instructions,
                        ContentItemKind("memories.instructions".to_string()),
                    )
                })
                .collect()
        })
    }
}

impl ThreadLifecycleContributor<Config> for MemoriesExtension {
    fn on_thread_start<'a>(
        &'a self,
        input: ThreadStartInput<'a, Config>,
    ) -> ExtensionFuture<'a, ()> {
        Box::pin(async move {
            input
                .thread_store
                .insert(MemoriesExtensionConfig::from_config(input.config));
            // GAP6: register the turn-effectiveness feedback sink. Core's
            // post-turn quality gate calls it with (turn_id, outcome,
            // risk_score); the sink joins that with the per-turn memory usage
            // rows recorded by the memory tool.
            let cwd = input.config.cwd.to_path_buf();
            input.session_store.insert(TurnFeedbackSink::new(
                move |turn_id: String, outcome: String, risk_score: Option<i64>| {
                    let cwd = cwd.clone();
                    async move {
                        let dbs = [
                            crate::store::resolve_project_memory_db(cwd.as_path()),
                            crate::store::resolve_global_memory_db(),
                        ];
                        for db_path in dbs {
                            // Never create a memories DB just to record feedback.
                            if !db_path.exists() {
                                continue;
                            }
                            let Ok(store) =
                                crate::store::persistent_store::PersistentMemoryStore::open(
                                    &db_path,
                                )
                                .await
                            else {
                                continue;
                            };
                            let Ok(ids) = store.get_turn_memory_ids(&turn_id).await else {
                                continue;
                            };
                            if ids.is_empty() {
                                continue;
                            }
                            let rows: Vec<(String, String, String, Option<i64>)> = ids
                                .into_iter()
                                .map(|id| (id, turn_id.clone(), outcome.clone(), risk_score))
                                .collect();
                            let _ = store.record_turn_feedback(&rows).await;
                        }
                    }
                },
            ));
        })
    }
}

impl ConfigContributor<Config> for MemoriesExtension {
    fn on_config_changed(
        &self,
        _session_store: &ExtensionData,
        thread_store: &ExtensionData,
        _previous_config: &Config,
        new_config: &Config,
    ) {
        let mut config = MemoriesExtensionConfig::from_config(new_config);
        if let Some(previous) = thread_store.get::<MemoriesExtensionConfig>() {
            // The initial summary and retrieval tools must use the same namespace.
            config.version = previous.version;
        }
        thread_store.insert(config);
    }
}

impl ToolContributor for MemoriesExtension {
    fn tools(
        &self,
        _session_store: &ExtensionData,
        thread_store: &ExtensionData,
    ) -> Vec<Arc<dyn for<'call> ava_extension_api::ToolExecutor<ava_extension_api::ToolCall<'call>>>>
    {
        let Some(config) = thread_store.get::<MemoriesExtensionConfig>() else {
            return Vec::new();
        };
        if !config.enabled {
            return Vec::new();
        }

        let mut tool_list: Vec<Arc<dyn for<'call> ToolExecutor<ToolCall<'call>>>> =
            vec![Arc::new(tools::UnifiedMemoryTool::new(
                config.cwd.clone(),
                config.memories.clone(),
                self.metrics_client.clone(),
            ))];

        if config.dedicated_tools {
            tool_list.extend(tools::memory_tools(
                LocalMemoriesBackend::from_memory_root(
                    config
                        .ava_home
                        .join(config.version.directory_name())
                        .to_path_buf(),
                ),
                self.metrics_client.clone(),
            ));
        }

        tool_list
    }
}

/// Installs the memories extension contributors into the extension registry.
pub fn install(
    registry: &mut ExtensionRegistryBuilder<Config>,
    metrics_client: Option<MetricsClient>,
) {
    let extension = Arc::new(MemoriesExtension::new(metrics_client));
    registry.thread_lifecycle_contributor(extension.clone());
    registry.config_contributor(extension.clone());
    registry.prompt_contributor(extension.clone());
    registry.tool_contributor(extension);
}
