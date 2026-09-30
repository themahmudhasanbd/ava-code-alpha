//! Project-scoped `.ava-code/` context index loading.
//!
//! Loads `<project>/.ava-code/{rules,workflows,design,plans}/index.md` as a
//! lightweight catalog that is injected with each prompt. The agent reads the
//! index, matches it against the user's prompt, and loads the relevant detail
//! files on-demand via its file tools (smart two-stage context).
//!
//! Controlled by `[project_context]` in config.toml:
//! ```toml
//! [project_context]
//! enabled = true    # master switch, default true
//! rules = true      # per-section toggles, default true
//! workflows = true
//! design = true
//! plans = true
//! ```
//!
//! Strictly project-scoped: the project root is resolved from the turn's
//! working directory using the same root markers as AGENTS.md discovery.
//! This module never reads user-level data (`~/.ava/`, `~/.ava-code/`, or
//! home-directory configs).

use crate::config::Config;
use crate::environment_selection::TurnEnvironmentSnapshot;
use ava_config::ConfigLayerSource;
use ava_config::default_project_root_markers;
use ava_config::merge_toml_values;
use ava_config::project_root_markers_from_config;
use ava_exec_server::ExecutorFileSystem;
use ava_exec_server::ReadFileOptions;
use ava_file_system::FindUpErrorPolicy;
use ava_file_system::find_nearest_ancestor_with_markers;
use ava_utils_path_uri::PathUri;
use std::io;
use toml::Value as TomlValue;
use tracing::warn;

/// Directory under the project root holding the context index.
pub const AVA_CODE_DIR_NAME: &str = ".ava-code";
/// Index file name inside each context section directory.
pub const INDEX_FILE_NAME: &str = "index.md";
/// Max total bytes across all index files. Indexes are small catalogs, so
/// this stays far below the AGENTS.md budget.
pub const MAX_INDEX_TOTAL_BYTES: usize = 8192;

/// One loaded `.ava-code/<section>/index.md` catalog.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct ProjectContextSection {
    /// Section name: `rules`, `workflows`, `design`, or `plans`.
    pub name: String,
    /// Raw contents of the section's `index.md`.
    pub index_text: String,
}

/// The project context index visible to the model for this turn.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct LoadedProjectContext {
    pub sections: Vec<ProjectContextSection>,
}

impl LoadedProjectContext {
    pub fn is_empty(&self) -> bool {
        self.sections.is_empty()
    }
}

/// Load the `.ava-code/` context index for the turn's environments.
///
/// Returns `Ok(None)` when disabled via `[project_context]`, when the project
/// is untrusted, or when the project has no `.ava-code/` index files.
/// Unexpected I/O failures are logged and skipped; missing index files are
/// silently skipped.
#[tracing::instrument(name = "project_context.load", skip_all)]
pub(crate) async fn load_project_context(
    config: &Config,
    environments: &TurnEnvironmentSnapshot,
) -> io::Result<Option<LoadedProjectContext>> {
    if config.active_project.is_untrusted() {
        return Ok(None);
    }

    let mut loaded = LoadedProjectContext::default();
    let mut remaining = MAX_INDEX_TOTAL_BYTES;

    for turn_environment in environments.turn_environments() {
        if remaining == 0 {
            break;
        }
        let filesystem = turn_environment.environment.get_filesystem();
        let sandbox = (!turn_environment
            .permission_profile()
            .file_system_sandbox_policy()
            .has_full_disk_read_access())
        .then(|| turn_environment.sandbox_context(/*additional_permissions*/ None));
        match read_project_context_index(
            config,
            filesystem.as_ref(),
            turn_environment.cwd(),
            remaining,
            sandbox.as_ref(),
        )
        .await
        {
            Ok(Some(mut sections)) => {
                for section in sections.drain(..) {
                    remaining = remaining.saturating_sub(section.index_text.len());
                    loaded.sections.push(section);
                    if remaining == 0 {
                        break;
                    }
                }
            }
            Ok(None) => {}
            Err(error) => {
                warn!(
                    environment_id = turn_environment.selection.environment_id,
                    "error trying to load .ava-code context index: {error:#}"
                );
            }
        }
        // Only the primary environment's project index is needed.
        break;
    }

    Ok((!loaded.is_empty()).then_some(loaded))
}
/// Resolve the project root and read `.ava-code/<section>/index.md` files.
///
/// The `[project_context]` section of `<project>/.ava-code/config.toml` is
/// read fresh on each turn so that edits (manual or via the mobile app's
/// workspace preferences) take effect immediately without a server restart.
/// Project config.toml values take precedence over the server's merged Config.
async fn read_project_context_index(
    config: &Config,
    fs: &dyn ExecutorFileSystem,
    cwd: &PathUri,
    max_total: usize,
    sandbox: Option<&ava_file_system::FileSystemSandboxContext>,
) -> io::Result<Option<Vec<ProjectContextSection>>> {
    if max_total == 0 {
        return Ok(None);
    }

    // Resolve project root with the same markers as AGENTS.md discovery.
    // Project-level config layers are skipped, matching agents_md behavior.
    let mut merged = TomlValue::Table(toml::map::Map::new());
    for layer in config.config_layer_stack.layers_low_to_high() {
        if matches!(layer.name, ConfigLayerSource::Project { .. }) {
            continue;
        }
        merge_toml_values(&mut merged, &layer.config);
    }
    let project_root_markers = match project_root_markers_from_config(&merged) {
        Ok(Some(markers)) => markers,
        Ok(None) => default_project_root_markers(),
        Err(err) => {
            warn!("invalid project_root_markers: {err}");
            default_project_root_markers()
        }
    };
    let project_root = find_nearest_ancestor_with_markers(
        fs,
        cwd,
        project_root_markers,
        FindUpErrorPolicy::Ignore,
        sandbox,
    )
    .await?;
    let Some(root) = project_root else {
        return Ok(None);
    };

    let ava_code_dir = root
        .join(AVA_CODE_DIR_NAME)
        .map_err(|err| io::Error::new(io::ErrorKind::InvalidInput, err))?;

    // Fresh per-turn read of the project's config.toml so mobile/manual edits
    // apply immediately. Project-level values override the server Config.
    let mut enabled = config.project_context.enabled;
    let mut rules = config.project_context.rules;
    let mut workflows = config.project_context.workflows;
    let mut design = config.project_context.design;
    let mut plans = config.project_context.plans;
    let config_toml_path = ava_code_dir
        .join("config.toml")
        .map_err(|err| io::Error::new(io::ErrorKind::InvalidInput, err))?;
    if let Ok(data) = fs
        .read_file(&config_toml_path, ReadFileOptions::default(), sandbox)
        .await
    {
        if let Some((o_enabled, o_rules, o_workflows, o_design, o_plans)) =
            parse_project_context_override(&data)
        {
            if let Some(v) = o_enabled {
                enabled = v;
            }
            if let Some(v) = o_rules {
                rules = v;
            }
            if let Some(v) = o_workflows {
                workflows = v;
            }
            if let Some(v) = o_design {
                design = v;
            }
            if let Some(v) = o_plans {
                plans = v;
            }
        }
    }
    if !enabled {
        return Ok(None);
    }
    let mut sections: Vec<&str> = Vec::new();
    if rules {
        sections.push("rules");
    }
    if workflows {
        sections.push("workflows");
    }
    if design {
        sections.push("design");
    }
    if plans {
        sections.push("plans");
    }
    if sections.is_empty() {
        return Ok(None);
    }

    let mut loaded_sections = Vec::new();
    let mut remaining = max_total as u64;
    for section_name in sections {
        if remaining == 0 {
            break;
        }
        let section_dir = ava_code_dir
            .join(section_name)
            .map_err(|err| io::Error::new(io::ErrorKind::InvalidInput, err))?;
        let index_path = section_dir
            .join(INDEX_FILE_NAME)
            .map_err(|err| io::Error::new(io::ErrorKind::InvalidInput, err))?;

        let mut data = match fs
            .read_file(&index_path, ReadFileOptions::default(), sandbox)
            .await
        {
            Ok(data) => data,
            Err(err) if err.kind() == io::ErrorKind::NotFound => continue,
            Err(err) => return Err(err),
        };
        if data.len() as u64 > remaining {
            warn!(
                path = %index_path,
                remaining_bytes = remaining,
                ".ava-code index exceeds remaining budget; truncating"
            );
            data.truncate(remaining as usize);
        }
        let text = String::from_utf8_lossy(&data).to_string();
        if !text.trim().is_empty() {
            remaining = remaining.saturating_sub(data.len() as u64);
            loaded_sections.push(ProjectContextSection {
                name: section_name.to_string(),
                index_text: text,
            });
        }
    }

    Ok((!loaded_sections.is_empty()).then_some(loaded_sections))
}

/// Parse the `[project_context]` section from a config.toml's bytes.
///
/// Returns `(enabled, rules, workflows, design, plans)` with `None` for any
/// key that is absent or not a boolean.
fn parse_project_context_override(
    data: &[u8],
) -> Option<(
    Option<bool>,
    Option<bool>,
    Option<bool>,
    Option<bool>,
    Option<bool>,
)> {
    let text = std::str::from_utf8(data).ok()?;
    let value: TomlValue = toml::from_str(text).ok()?;
    let section = value.get("project_context")?.as_table()?;
    let get_bool = |key: &str| section.get(key).and_then(TomlValue::as_bool);
    Some((
        get_bool("enabled"),
        get_bool("rules"),
        get_bool("workflows"),
        get_bool("design"),
        get_bool("plans"),
    ))
}
