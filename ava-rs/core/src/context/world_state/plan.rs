use super::PreviousSectionState;
use super::WorldStateContextFragment;
use super::WorldStateSection;
use crate::context::ContextualUserFragment;
use codex_extension_api::RenderedWorldStateFragment;
use codex_protocol::models::ContentItemKind;
use codex_protocol::plan_tool::StepStatus;
use codex_protocol::plan_tool::UpdatePlanArgs;

const PLAN_OPEN_TAG: &str = "<active_plan>";
const PLAN_CLOSE_TAG: &str = "</active_plan>";

/// The active plan/todo state visible to the model across execution steps.
#[derive(Clone, Debug, Default)]
pub(crate) struct PlanState {
    plan: Option<UpdatePlanArgs>,
}

impl PlanState {
    pub(crate) fn new(plan: Option<&UpdatePlanArgs>) -> Self {
        Self {
            plan: plan.cloned(),
        }
    }
}

impl WorldStateSection for PlanState {
    const ID: &'static str = "active_plan";
    type Snapshot = Option<UpdatePlanArgs>;

    fn snapshot(&self) -> Self::Snapshot {
        self.plan.clone()
    }

    fn should_persist(&self) -> bool {
        self.plan.as_ref().is_some_and(|p| {
            !p.plan.is_empty()
                && p.plan
                    .iter()
                    .any(|item| matches!(item.status, StepStatus::InProgress | StepStatus::Pending))
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

        let plan = self.plan.as_ref()?;
        if plan.plan.is_empty() {
            return None;
        }

        let total = plan.plan.len();
        let completed = plan
            .plan
            .iter()
            .filter(|item| matches!(item.status, StepStatus::Completed))
            .count();
        let in_progress = plan
            .plan
            .iter()
            .find(|item| matches!(item.status, StepStatus::InProgress));
        let pending: Vec<_> = plan
            .plan
            .iter()
            .filter(|item| matches!(item.status, StepStatus::Pending))
            .collect();

        // If all steps are completed or no step is active/pending, do NOT inject into context
        if completed == total || (in_progress.is_none() && pending.is_empty()) {
            return None;
        }

        let mut lines = Vec::new();
        lines.push(format!(
            "[ACTIVE EXECUTION PLAN / TODO STATE: {completed}/{total} Completed]"
        ));
        for (i, item) in plan.plan.iter().enumerate() {
            let num = i + 1;
            match item.status {
                StepStatus::Completed => lines.push(format!("✓ [{num}. COMPLETED] {}", item.step)),
                StepStatus::InProgress => {
                    lines.push(format!("→ [{num}. IN_PROGRESS] {}", item.step))
                }
                StepStatus::Pending => lines.push(format!("○ [{num}. PENDING] {}", item.step)),
            }
        }
        if let Some(active) = in_progress {
            lines.push(format!("→ Current Active Step: {}", active.step));
        } else if let Some(next) = pending.first() {
            lines.push(format!("○ Next Upcoming Step: {}", next.step));
        }

        let body = lines.join("\n");
        Some(Box::new(WorldStateContextFragment {
            fragment: RenderedWorldStateFragment::new(
                "developer",
                (PLAN_OPEN_TAG, PLAN_CLOSE_TAG),
                body,
            ),
            content_kind: ContentItemKind("plan.active_execution_state".to_string()),
        }))
    }
}
