use ava_cloud_config::cloud_config_bundle_loader_for_storage;
use ava_config::CloudConfigBundleLoader;
use ava_config::ConfigLoadOptions;
use ava_core::config::bootstrap_auth_config;
use ava_core::config::load_config_toml_with_layer_stack;
use ava_utils_absolute_path::AbsolutePathBuf;
use toml::Value as TomlValue;

use super::DebugSandboxConfigOptions;
use super::ManagedRequirementsMode;

pub(super) async fn bootstrap_cloud_config_bundle(
    cli_overrides: &[(String, TomlValue)],
    options: &DebugSandboxConfigOptions,
    resolve_ava_home: impl FnOnce() -> std::io::Result<AbsolutePathBuf>,
    strict_config: bool,
) -> anyhow::Result<CloudConfigBundleLoader> {
    if options.permissions_profile.is_none()
        || !matches!(
            options.managed_requirements_mode,
            ManagedRequirementsMode::Include
        )
    {
        return Ok(CloudConfigBundleLoader::default());
    }

    let ava_home = resolve_ava_home()?;
    let cwd = match options.cwd.as_deref() {
        Some(cwd) => AbsolutePathBuf::relative_to_current_dir(cwd)?,
        None => AbsolutePathBuf::current_dir()?,
    };
    let bootstrap_config = load_config_toml_with_layer_stack(
        ava_home.as_path(),
        Some(&cwd),
        cli_overrides.to_vec(),
        ConfigLoadOptions {
            loader_overrides: options.loader_overrides.clone(),
            strict_config,
            cloud_config_bundle: CloudConfigBundleLoader::default(),
        },
    )
    .await?;
    Ok(cloud_config_bundle_loader_for_storage(
        bootstrap_auth_config(ava_home.as_path(), &bootstrap_config)?,
        /*enable_ava_api_key_env*/ false,
    )
    .await?)
}

#[cfg(test)]
#[path = "cloud_config_tests.rs"]
mod tests;
