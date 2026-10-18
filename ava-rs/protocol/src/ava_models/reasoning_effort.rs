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
    /// Resolves a selected effort to the value sent in an ordinary inference request.
    ///
    /// Only the 4 primary tiers exist: `low`, `medium`, `max`, `ultra`. If a model
    /// does not support the requested tier it falls back to the nearest primary
    /// tier instead of an unrelated legacy alias.
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

        // Wire compatibility: legacy alias `minimal` maps onto `low`.
        let effort = match effort {
            ReasoningEffort::Minimal => ReasoningEffort::Low,
            other => other,
        };
        let ladder: &[ReasoningEffort] = &[
            ReasoningEffort::Ultra,
            ReasoningEffort::Max,
            ReasoningEffort::Medium,
            ReasoningEffort::Low,
        ];
        let requested_pos = |target: &ReasoningEffort| -> Option<usize> {
            ladder.iter().position(|candidate| candidate == target)
        };
        let supported_pos: Vec<usize> = self
            .supported_reasoning_levels
            .iter()
            .filter_map(|preset| requested_pos(&preset.effort))
            .collect();
        let nearest = requested_pos(&effort).and_then(|from| {
            supported_pos
                .iter()
                .copied()
                .min_by_key(|pos| pos.abs_diff(from))
        });
        match nearest.map(|pos| ladder[pos].clone()) {
            Some(resolved) => resolved,
            None => self
                .default_reasoning_level
                .clone()
                .or_else(|| self.supported_reasoning_levels.first().map(|preset| preset.effort.clone()))
                .unwrap_or(effort),
        }
    }
}

#[cfg(test)]
#[path = "reasoning_effort_tests.rs"]
mod tests;
