//! User profile & personality configuration TOML types.

use codex_protocol::user_profile::PersonalityPreset;
use codex_protocol::user_profile::UserProfileConfig;
use schemars::JsonSchema;
use serde::Deserialize;
use serde::Serialize;

/// User profile and persona configuration loaded from config.toml.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Default, JsonSchema)]
#[schemars(deny_unknown_fields)]
pub struct UserProfileToml {
    /// Full user display name (e.g., "Mahmud Hasan", "Ayman").
    pub name: Option<String>,
    /// Server / workspace username (e.g. "ava", "ayman").
    pub username: Option<String>,
    /// Profile avatar image URL or base64 data URL.
    pub avatar: Option<String>,
    /// User role or title (e.g. "Lead Engineer & System Architect").
    pub role_or_title: Option<String>,
    /// AI Assistant name (e.g. "AvA").
    pub ai_name: Option<String>,
    /// AI specialization / role (e.g. "Autonomous Pair Programmer").
    pub ai_role: Option<String>,
    /// Selected personality preset (autonomous, friendly, pragmatic, socratic, custom).
    pub personality_preset: Option<PersonalityPreset>,
    /// Freeform custom personality & tone instructions.
    pub custom_personality: Option<String>,
    /// Engineering characteristics & traits.
    pub characteristics: Option<String>,
    /// Custom background instructions about the user & preferences.
    pub custom_instructions: Option<String>,
    /// Explicit engineering rules and constraints.
    #[serde(default)]
    pub user_rules: Option<Vec<String>>,
    /// Whether dynamic user context injection is enabled.
    pub enabled: Option<bool>,
}

impl From<UserProfileToml> for UserProfileConfig {
    fn from(toml: UserProfileToml) -> Self {
        let defaults = UserProfileConfig::default();
        Self {
            name: toml.name.or(defaults.name),
            username: toml.username.or(defaults.username),
            avatar: toml.avatar.or(defaults.avatar),
            role_or_title: toml.role_or_title.or(defaults.role_or_title),
            ai_name: toml.ai_name.or(defaults.ai_name),
            ai_role: toml.ai_role.or(defaults.ai_role),
            personality_preset: toml
                .personality_preset
                .unwrap_or(defaults.personality_preset),
            custom_personality: toml.custom_personality.or(defaults.custom_personality),
            characteristics: toml.characteristics.or(defaults.characteristics),
            custom_instructions: toml.custom_instructions.or(defaults.custom_instructions),
            user_rules: toml.user_rules.unwrap_or(defaults.user_rules),
            enabled: toml.enabled.unwrap_or(defaults.enabled),
        }
    }
}

impl From<UserProfileConfig> for UserProfileToml {
    fn from(config: UserProfileConfig) -> Self {
        Self {
            name: config.name,
            username: config.username,
            avatar: config.avatar,
            role_or_title: config.role_or_title,
            ai_name: config.ai_name,
            ai_role: config.ai_role,
            personality_preset: Some(config.personality_preset),
            custom_personality: config.custom_personality,
            characteristics: config.characteristics,
            custom_instructions: config.custom_instructions,
            user_rules: Some(config.user_rules),
            enabled: Some(config.enabled),
        }
    }
}
