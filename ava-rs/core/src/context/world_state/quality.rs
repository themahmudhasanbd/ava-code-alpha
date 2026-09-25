use super::PreviousSectionState;
use super::WorldStateContextFragment;
use super::WorldStateSection;
use crate::context::ContextualUserFragment;
use crate::quality_gate::types::{QualityGateResult, QualityGateStatus};
use codex_extension_api::RenderedWorldStateFragment;
use codex_protocol::models::ContentItemKind;

const QUALITY_OPEN_TAG: &str = "<quality_gate_status>";
const QUALITY_CLOSE_TAG: &str = "</quality_gate_status>";

/// The active automated quality gate evaluation visible to the model across execution steps.
#[derive(Clone, Debug, Default)]
pub(crate) struct QualityState {
    result: Option<QualityGateResult>,
}

impl QualityState {
    pub(crate) fn new(result: Option<&QualityGateResult>) -> Self {
        Self {
            result: result.cloned(),
        }
    }
}

impl WorldStateSection for QualityState {
    const ID: &'static str = "quality_gate_status";
    type Snapshot = Option<QualityGateStatus>;

    fn snapshot(&self) -> Self::Snapshot {
        self.result.as_ref().map(|r| r.status)
    }

    fn should_persist(&self) -> bool {
        self.result.as_ref().is_some_and(|r| {
            matches!(
                r.status,
                QualityGateStatus::Blocked
                    | QualityGateStatus::PartiallyVerified
                    | QualityGateStatus::Unverified
            ) || !r.blockers.is_empty()
                || !r.warnings.is_empty()
        })
    }

    fn render_diff(
        &self,
        previous: PreviousSectionState<'_, Self::Snapshot>,
    ) -> Option<Box<dyn ContextualUserFragment>> {
        let current = self.snapshot();
        if matches!(previous, PreviousSectionState::Known(prev) if prev == &current) {
            return None;
        }

        let res = self.result.as_ref()?;
        // If gate is fully verified and clean, do not pollute LLM context
        if res.status == QualityGateStatus::Verified
            && res.blockers.is_empty()
            && res.warnings.is_empty()
        {
            return None;
        }

        let mut lines = Vec::new();
        lines.push(format!("[AUTOMATED QUALITY GATE: {}]", res.status));
        lines.push(format!("Summary: {}", res.summary));
        lines.push(format!(
            "Risk Assessment: {:?} (Score: {}/100)",
            res.risk_score.risk_level, res.risk_score.composite_score
        ));

        if !res.blockers.is_empty() {
            lines.push("CRITICAL BLOCKERS (Must address before completing task):".to_string());
            for b in &res.blockers {
                lines.push(format!("  * [BLOCKER] {b}"));
            }
        }

        if !res.warnings.is_empty() {
            lines.push("WARNINGS:".to_string());
            for w in &res.warnings {
                lines.push(format!("  * [WARNING] {w}"));
            }
        }

        if !res.auto_remediations.is_empty() {
            lines.push("SUGGESTED AUTO-REMEDIATIONS:".to_string());
            for rem in &res.auto_remediations {
                lines.push(format!("  * [{}] {}", rem.rule_id, rem.description));
                if let Some(cmd) = &rem.action_command {
                    lines.push(format!("    Action Command: {cmd}"));
                }
            }
        }

        let body = lines.join("\n");
        Some(Box::new(WorldStateContextFragment {
            fragment: RenderedWorldStateFragment::new(
                "developer",
                (QUALITY_OPEN_TAG, QUALITY_CLOSE_TAG),
                body,
            ),
            content_kind: ContentItemKind("quality.evaluation_status".to_string()),
        }))
    }
}
