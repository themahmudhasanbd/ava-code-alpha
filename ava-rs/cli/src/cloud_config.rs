use anyhow::Context;
use anyhow::Result;
use ava_cloud_config::cloud_config_bundle_loader_for_storage;
use ava_config::CloudConfigBundleLoader;
use ava_config::ConfigLoadOptions;
use ava_core::config::Config;
use ava_core::config::ConfigBuilder;
use ava_core::config::ConfigOverrides;
use ava_core::config::LoaderOverrides;
use ava_core::config::bootstrap_auth_config;
use ava_core::config::find_ava_home;
use ava_core::config::load_config_toml_with_layer_stack;
use ava_utils_absolute_path::AbsolutePathBuf;
use ava_utils_cli::CliConfigOverrides;

pub(crate) async fn load_config(
    config_overrides: &CliConfigOverrides,
    loader_overrides: LoaderOverrides,
) -> Result<Config> {
    config_builder(
        config_overrides,
        loader_overrides,
        ConfigOverrides::default(),
    )
    .await?
    .build()
    .await
    .context("failed to load configuration")
}

pub(crate) async fn config_builder(
    config_overrides: &CliConfigOverrides,
    loader_overrides: LoaderOverrides,
    harness_overrides: ConfigOverrides,
) -> Result<ConfigBuilder> {
    let cli_overrides = config_overrides
        .parse_overrides()
        .map_err(anyhow::Error::msg)?;
    let ava_home = find_ava_home().context("failed to resolve AVA_HOME")?;
    let cwd = match harness_overrides.cwd.as_deref() {
        Some(cwd) => AbsolutePathBuf::relative_to_current_dir(cwd),
        None => AbsolutePathBuf::current_dir(),
    }
    .context("failed to resolve current directory")?;
    let bootstrap_config = load_config_toml_with_layer_stack(
        ava_home.as_path(),
        Some(&cwd),
        cli_overrides.clone(),
        ConfigLoadOptions {
            loader_overrides: loader_overrides.clone(),
            strict_config: false,
            cloud_config_bundle: CloudConfigBundleLoader::default(),
        },
    )
    .await
    .context("failed to load bootstrap configuration")?;
    let cloud_config_bundle = cloud_config_bundle_loader_for_storage(
        bootstrap_auth_config(ava_home.as_path(), &bootstrap_config)
            .context("failed to resolve cloud configuration authentication")?,
        /*enable_ava_api_key_env*/ false,
    )
    .await
    .context("failed to initialize cloud configuration authentication")?;

    Ok(ConfigBuilder::default()
        .ava_home(ava_home.to_path_buf())
        .cli_overrides(cli_overrides)
        .loader_overrides(loader_overrides)
        .harness_overrides(harness_overrides)
        .cloud_config_bundle(cloud_config_bundle)
        .fallback_cwd(Some(cwd.to_path_buf())))
}
