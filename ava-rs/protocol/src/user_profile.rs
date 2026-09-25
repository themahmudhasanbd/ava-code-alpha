//! User Profile & Dynamic Persona Context configuration types.

use schemars::JsonSchema;
use serde::Deserialize;
use serde::Serialize;
use strum_macros::Display;
use strum_macros::EnumIter;
use ts_rs::TS;

/// AI personality archetype presets.
#[derive(
    Debug,
    Serialize,
    Deserialize,
    Clone,
    Copy,
    PartialEq,
    Eq,
    Display,
    JsonSchema,
    TS,
    PartialOrd,
    Ord,
    EnumIter,
    Default,
)]
#[serde(rename_all = "lowercase")]
#[strum(serialize_all = "lowercase")]
pub enum PersonalityPreset {
    #[default]
    Autonomous,
    Friendly,
    Pragmatic,
    Socratic,
    Custom,
}

impl PersonalityPreset {
    pub const ALL: &'static [PersonalityPreset] = &[
        Self::Autonomous,
        Self::Friendly,
        Self::Pragmatic,
        Self::Socratic,
        Self::Custom,
    ];

    pub fn description(&self) -> &'static str {
        match self {
            Self::Autonomous => {
                "Autonomous, proactive, high-ownership partner. Anticipates pitfalls, plans thoroughly, and executes tasks to completion with minimal unnecessary friction."
            }
            Self::Friendly => {
                "Friendly, warm, empathetic and collaborative companion. Communicates with encouraging, natural dialogue."
            }
            Self::Pragmatic => {
                "Pragmatic, direct, concise, and purely technical. Prioritizes code, facts, and minimal commentary without conversational fluff."
            }
            Self::Socratic => {
                "Socratic mentor and educator. Guides through thought-provoking explanations, best practices, and foundational architecture."
            }
            Self::Custom => "",
        }
    }
}

/// Effective user profile & dynamic context configuration.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
pub struct UserProfileConfig {
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
    /// Selected personality preset.
    #[serde(default)]
    pub personality_preset: PersonalityPreset,
    /// Freeform custom personality & tone instructions.
    pub custom_personality: Option<String>,
    /// Engineering characteristics & traits (e.g., "Clean modular code, zero UI emojis, end-to-end verification").
    pub characteristics: Option<String>,
    /// Custom background instructions about the user & preferences.
    pub custom_instructions: Option<String>,
    /// Explicit engineering rules and constraints.
    #[serde(default)]
    pub user_rules: Vec<String>,
    /// Whether dynamic user context injection is enabled.
    #[serde(default = "default_true")]
    pub enabled: bool,
}

const fn default_true() -> bool {
    true
}

impl Default for UserProfileConfig {
    fn default() -> Self {
        Self {
            name: None,
            username: None,
            avatar: None,
            role_or_title: None,
            ai_name: Some("AvA".to_string()),
            ai_role: Some("Autonomous Pair Programmer".to_string()),
            personality_preset: PersonalityPreset::Autonomous,
            custom_personality: None,
            characteristics: Some("Proactive, meticulous, high-ownership".to_string()),
            custom_instructions: None,
            user_rules: Vec::new(),
            enabled: true,
        }
    }
}

impl UserProfileConfig {
    /// Renders dynamic user context Markdown prompt for injection without artificial truncation.
    pub fn render_context_text(&self) -> String {
        if !self.enabled {
            return String::new();
        }

        let mut lines = Vec::new();
        lines.push("# User Profile & Dynamic Agent Context".to_string());

        // User info
        if let Some(name) = self.name.as_deref().filter(|s| !s.trim().is_empty()) {
            if let Some(role) = self
                .role_or_title
                .as_deref()
                .filter(|s| !s.trim().is_empty())
            {
                lines.push(format!("- User: {name} ({role})"));
            } else {
                lines.push(format!("- User: {name}"));
            }
        } else if let Some(role) = self
            .role_or_title
            .as_deref()
            .filter(|s| !s.trim().is_empty())
        {
            lines.push(format!("- User Role: {role}"));
        }

        // Assistant Persona
        let ai_name = self.ai_name.as_deref().unwrap_or("AvA");
        if let Some(ai_role) = self.ai_role.as_deref().filter(|s| !s.trim().is_empty()) {
            lines.push(format!("- Assistant Identity: {ai_name} ({ai_role})"));
        } else {
            lines.push(format!("- Assistant Identity: {ai_name}"));
        }

        // Personality
        let preset_desc = self.personality_preset.description();
        if !preset_desc.is_empty() && self.personality_preset != PersonalityPreset::Custom {
            lines.push(format!("- Personality Archetype: {preset_desc}"));
        }

        if let Some(custom_persona) = self
            .custom_personality
            .as_deref()
            .filter(|s| !s.trim().is_empty())
        {
            lines.push(format!("- Custom Persona & Tone:\n  {custom_persona}"));
        }

        if let Some(characteristics) = self
            .characteristics
            .as_deref()
            .filter(|s| !s.trim().is_empty())
        {
            lines.push(format!(
                "- Core Characteristics & Traits: {characteristics}"
            ));
        }

        // Custom Instructions
        if let Some(instructions) = self
            .custom_instructions
            .as_deref()
            .filter(|s| !s.trim().is_empty())
        {
            lines.push(format!(
                "- User Background & Preferences:\n  {instructions}"
            ));
        }

        // Rules
        let non_empty_rules: Vec<&str> = self
            .user_rules
            .iter()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .collect();
        if !non_empty_rules.is_empty() {
            lines.push("- User Preferences & Constraints (Mandatory):".to_string());
            for rule in non_empty_rules {
                lines.push(format!("  * {rule}"));
            }
        }

        lines.join("\n")
    }
}
