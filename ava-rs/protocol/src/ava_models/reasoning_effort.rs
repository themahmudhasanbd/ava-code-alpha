//! Model-owned effort normalization shared by native requests and configuration update items.
//!
//! UI aliases resolve through the same model defaults and fallbacks in both paths.

use super::ModelInfo;
use super::ReasoningEffort;

impl ModelInfo {
    /// Resolves a selected effort to the value sent in an ordinary inference request.
    ///
    /// Provides resilient cascading fallback across the 4 primary tiers: `low`, `medium`, `max`, `ultra`.
    /// If a custom endpoint or model does not support high-effort reasoning, it cascades
    /// downwards to the highest supported effort level without failing.
    pub fn resolve_reasoning_effort(&self, effort: ReasoningEffort) -> ReasoningEffort {
        if matches!(effort, ReasoningEffort::Persistent) {
            return ReasoningEffort::Custom("disabled".to_string());
        }

        if self.supported_reasoning_levels.is_empty() {
            return self.default_reasoning_level.clone().unwrap_or(effort);
        }

        if self
            .supported_reasoning_levels
            .iter()
            .any(|preset| preset.effort == effort)
        {
            return effort;
        }

        match effort {
            ReasoningEffort::Ultra => self
                .multi_agent_reasoning_effort
                .as_ref()
                .filter(|e| {
                    *e != &ReasoningEffort::Ultra
                        && self
                            .supported_reasoning_levels
                            .iter()
                            .any(|preset| &preset.effort == *e)
                })
                .cloned()
                .or_else(|| {
                    self.supported_reasoning_levels
                        .iter()
                        .find(|preset| preset.effort == ReasoningEffort::Max)
                        .or_else(|| {
                            self.supported_reasoning_levels
                                .iter()
                                .find(|preset| preset.effort == ReasoningEffort::XHigh)
                        })
                        .or_else(|| {
                            self.supported_reasoning_levels
                                .iter()
                                .find(|preset| preset.effort == ReasoningEffort::High)
                        })
                        .or_else(|| {
                            self.supported_reasoning_levels
                                .iter()
                                .find(|preset| preset.effort == ReasoningEffort::Medium)
                        })
                        .or_else(|| {
                            self.supported_reasoning_levels
                                .iter()
                                .find(|preset| preset.effort == ReasoningEffort::Low)
                        })
                        .or_else(|| {
                            self.supported_reasoning_levels
                                .iter()
                                .find(|preset| preset.effort == ReasoningEffort::Minimal)
                        })
                        .or_else(|| {
                            self.supported_reasoning_levels
                                .iter()
                                .rev()
                                .find(|preset| preset.effort != ReasoningEffort::Ultra)
                        })
                        .map(|preset| preset.effort.clone())
                })
                .unwrap_or(ReasoningEffort::Medium),
            ReasoningEffort::Max => self
                .supported_reasoning_levels
                .iter()
                .find(|preset| preset.effort == ReasoningEffort::XHigh)
                .or_else(|| {
                    self.supported_reasoning_levels
                        .iter()
                        .find(|preset| preset.effort == ReasoningEffort::High)
                })
                .or_else(|| {
                    self.supported_reasoning_levels
                        .iter()
                        .find(|preset| preset.effort == ReasoningEffort::Medium)
                })
                .or_else(|| {
                    self.supported_reasoning_levels
                        .iter()
                        .find(|preset| preset.effort == ReasoningEffort::Low)
                })
                .or_else(|| {
                    self.supported_reasoning_levels
                        .iter()
                        .find(|preset| preset.effort == ReasoningEffort::Minimal)
                })
                .or_else(|| self.supported_reasoning_levels.first())
                .map(|preset| preset.effort.clone())
                .unwrap_or(ReasoningEffort::Medium),
            ReasoningEffort::High | ReasoningEffort::XHigh => self
                .supported_reasoning_levels
                .iter()
                .find(|preset| preset.effort == ReasoningEffort::Medium)
                .or_else(|| {
                    self.supported_reasoning_levels
                        .iter()
                        .find(|preset| preset.effort == ReasoningEffort::Low)
                })
                .or_else(|| {
                    self.supported_reasoning_levels
                        .iter()
                        .find(|preset| preset.effort == ReasoningEffort::Minimal)
                })
                .or_else(|| self.supported_reasoning_levels.first())
                .map(|preset| preset.effort.clone())
                .unwrap_or(ReasoningEffort::Medium),
            ReasoningEffort::Medium => self
                .supported_reasoning_levels
                .iter()
                .find(|preset| preset.effort == ReasoningEffort::Low)
                .or_else(|| {
                    self.supported_reasoning_levels
                        .iter()
                        .find(|preset| preset.effort == ReasoningEffort::Minimal)
                })
                .or_else(|| self.supported_reasoning_levels.first())
                .map(|preset| preset.effort.clone())
                .unwrap_or(ReasoningEffort::Medium),
            ReasoningEffort::Low | ReasoningEffort::Minimal => self
                .supported_reasoning_levels
                .iter()
                .find(|preset| preset.effort == ReasoningEffort::Low)
                .or_else(|| {
                    self.supported_reasoning_levels
                        .iter()
                        .find(|preset| preset.effort == ReasoningEffort::Minimal)
                })
                .or_else(|| self.supported_reasoning_levels.first())
                .map(|preset| preset.effort.clone())
                .unwrap_or(ReasoningEffort::Low),
            _ => self.default_reasoning_level.clone().unwrap_or(effort),
        }
    }
}

#[cfg(test)]
#[path = "reasoning_effort_tests.rs"]
mod tests;
