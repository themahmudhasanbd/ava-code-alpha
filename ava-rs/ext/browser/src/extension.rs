use std::sync::Arc;

use codex_config::types::BrowserConfig;
use codex_core::config::Config;
use codex_core::context::{BrowserContextFragment, ContextualUserFragment};
use codex_extension_api::ConfigContributor;
use codex_extension_api::ContentItemKind;
use codex_extension_api::ContextContributor;
use codex_extension_api::ExtensionData;
use codex_extension_api::ExtensionFuture;
use codex_extension_api::ExtensionRegistryBuilder;
use codex_extension_api::PromptFragment;
use codex_extension_api::ThreadLifecycleContributor;
use codex_extension_api::ThreadStartInput;
use codex_extension_api::ToolCall;
use codex_extension_api::ToolContributor;
use codex_extension_api::ToolExecutor;
use codex_otel::MetricsClient;

use crate::coordinator::BrowserCoordinator;
use crate::prompts::build_browser_developer_instructions;
use crate::tools::BrowserTool;

#[derive(Clone, Default)]
pub(crate) struct BrowserExtension {
    metrics_client: Option<MetricsClient>,
}

impl BrowserExtension {
    pub(crate) fn new(metrics_client: Option<MetricsClient>) -> Self {
        Self { metrics_client }
    }
}

#[derive(Clone, Debug)]
pub(crate) struct BrowserExtensionConfig {
    pub(crate) enabled: bool,
    pub(crate) browser: BrowserConfig,
}

impl BrowserExtensionConfig {
    fn from_config(config: &Config) -> Self {
        Self {
            enabled: config.browser.enabled,
            browser: config.browser.clone(),
        }
    }
}

impl ContextContributor for BrowserExtension {
    fn contribute_thread_context<'a>(
        &'a self,
        _session_store: &'a ExtensionData,
        thread_store: &'a ExtensionData,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Vec<PromptFragment>> + Send + 'a>> {
        Box::pin(async move {
            let Some(config) = thread_store.get::<BrowserExtensionConfig>() else {
                return Vec::new();
            };
            if !config.enabled {
                return Vec::new();
            }

            let instructions = build_browser_developer_instructions();
            if instructions.is_empty() {
                return Vec::new();
            }

            let rendered = BrowserContextFragment::Instructions(instructions).render();
            vec![PromptFragment::developer_policy(
                rendered,
                ContentItemKind("browser.instructions".to_string()),
            )]
        })
    }
}

impl ThreadLifecycleContributor<Config> for BrowserExtension {
    fn on_thread_start<'a>(
        &'a self,
        input: ThreadStartInput<'a, Config>,
    ) -> ExtensionFuture<'a, ()> {
        Box::pin(async move {
            input
                .thread_store
                .insert(BrowserExtensionConfig::from_config(input.config));
        })
    }
}

impl ConfigContributor<Config> for BrowserExtension {
    fn on_config_changed(
        &self,
        _session_store: &ExtensionData,
        thread_store: &ExtensionData,
        _previous_config: &Config,
        new_config: &Config,
    ) {
        thread_store.insert(BrowserExtensionConfig::from_config(new_config));
    }
}

impl ToolContributor for BrowserExtension {
    fn tools(
        &self,
        _session_store: &ExtensionData,
        thread_store: &ExtensionData,
    ) -> Vec<Arc<dyn for<'call> ToolExecutor<ToolCall<'call>>>> {
        let Some(config) = thread_store.get::<BrowserExtensionConfig>() else {
            return Vec::new();
        };
        if !config.enabled {
            return Vec::new();
        }

        let coordinator = Arc::new(BrowserCoordinator::new(config.browser.clone()));
        vec![Arc::new(BrowserTool::new(
            coordinator,
            self.metrics_client.clone(),
        ))]
    }
}

pub fn install(
    registry: &mut ExtensionRegistryBuilder<Config>,
    metrics_client: Option<MetricsClient>,
) {
    let extension = Arc::new(BrowserExtension::new(metrics_client));
    registry.thread_lifecycle_contributor(extension.clone());
    registry.config_contributor(extension.clone());
    registry.prompt_contributor(extension.clone());
    registry.tool_contributor(extension);
}
