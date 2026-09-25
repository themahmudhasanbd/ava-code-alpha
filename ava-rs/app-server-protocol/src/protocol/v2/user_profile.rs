use crate::JsonSchema;
use crate::TS;
pub use codex_protocol::user_profile::PersonalityPreset;
pub use codex_protocol::user_profile::UserProfileConfig;
use serde::Deserialize;
use serde::Serialize;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, Default, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct UserProfileReadParams {
    /// Optional working directory to resolve project-specific profile overrides if any.
    #[ts(optional = nullable)]
    pub cwd: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct UserProfileReadResponse {
    pub profile: UserProfileConfig,
    pub presets: Vec<PersonalityPresetOption>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct PersonalityPresetOption {
    pub id: PersonalityPreset,
    pub name: String,
    pub description: String,
}

impl PersonalityPresetOption {
    pub fn all() -> Vec<Self> {
        PersonalityPreset::ALL
            .iter()
            .map(|&preset| Self {
                id: preset,
                name: format!("{preset:?}"),
                description: preset.description().to_string(),
            })
            .collect()
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct UserProfileWriteParams {
    pub profile: UserProfileConfig,
    /// When true, reloads updated user persona context dynamically into live threads.
    #[serde(default = "default_true")]
    pub reload_active_threads: bool,
}

const fn default_true() -> bool {
    true
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct UserProfileWriteResponse {
    pub success: bool,
    pub profile: UserProfileConfig,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct PersonalityPresetsListResponse {
    pub presets: Vec<PersonalityPresetOption>,
}
