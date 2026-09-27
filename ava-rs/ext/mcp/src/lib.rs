use ava_core::config::Config;
use ava_extension_api::ExtensionFuture;
use ava_extension_api::ExtensionRegistryBuilder;
use ava_extension_api::McpServerContribution;
use ava_extension_api::McpServerContributionContext;
use ava_extension_api::McpServerContributor;
use ava_mcp::AVA_APPS_MCP_SERVER_NAME;
use ava_mcp::hosted_plugin_runtime_mcp_server_config;

mod cloud_plugin;
#[cfg(test)]
#[path = "event_stream_tests.rs"]
mod event_stream_tests;
mod plugin;
mod plugin_contributor;
mod plugin_contributor_state;
mod plugin_providers;
mod stream_manager;

pub use ava_core_plugins::PluginListQuery;
pub use ava_core_plugins::PluginProvider;
pub use ava_core_plugins::PluginProviderError;
pub use ava_core_plugins::PluginProviderFuture;
pub use ava_core_plugins::PluginProviderResult;
pub use plugin_contributor::install_plugin_providers;
pub use plugin_contributor::install_plugins;
pub use plugin_contributor_state::PluginsThreadState;
pub use plugin_providers::PluginProviders;
pub use stream_manager::McpEventStreamManager;
pub use stream_manager::McpEventStreamUpdate;

#[cfg(test)]
#[path = "stream_manager_tests.rs"]
mod stream_manager_tests;

struct HostedPluginRuntimeExtension;

impl McpServerContributor<Config> for HostedPluginRuntimeExtension {
    fn id(&self) -> &'static str {
        "hosted_plugin_runtime"
    }

    fn contribute<'a>(
        &'a self,
        context: McpServerContributionContext<'a, Config>,
    ) -> ExtensionFuture<'a, Vec<McpServerContribution>> {
        Box::pin(async move {
            let config = context.config();
            let name = AVA_APPS_MCP_SERVER_NAME.to_string();
            if !config.features.enabled(ava_features::Feature::Apps) {
                return vec![McpServerContribution::Remove { name }];
            }

            vec![McpServerContribution::HostedApps {
                config: Box::new(hosted_plugin_runtime_mcp_server_config(
                    &config.chatgpt_base_url,
                    config.apps_mcp_product_sku.as_deref(),
                    context.originator(),
                )),
                protocol_mode: None,
            }]
        })
    }
}

pub fn install(builder: &mut ExtensionRegistryBuilder<Config>) {
    builder.mcp_server_contributor(std::sync::Arc::new(HostedPluginRuntimeExtension));
}

#[cfg(test)]
#[path = "lib_tests.rs"]
mod tests;
