use super::PreviousSectionState;
use super::WorldStateSection;
use crate::context::ContextualUserFragment;
use crate::context::ProjectContextIndex;
use crate::project_context::LoadedProjectContext;
use serde::Deserialize;
use serde::Serialize;

/// The project `.ava-code/` context index currently visible to the model.
#[derive(Clone, Debug, Default)]
pub(crate) struct ProjectContextState {
    context: Option<LoadedProjectContext>,
}

/// Persisted model-visible project context index, without filesystem provenance.
#[derive(Clone, Debug, Default, Deserialize, PartialEq, Eq, Serialize)]
pub(crate) struct ProjectContextSnapshot {
    sections: Vec<ProjectContextSnapshotSection>,
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Eq, Serialize)]
struct ProjectContextSnapshotSection {
    name: String,
    index_text: String,
}

impl ProjectContextState {
    pub(crate) fn new(loaded: Option<&LoadedProjectContext>) -> Self {
        Self {
            context: loaded.cloned(),
        }
    }
}

impl WorldStateSection for ProjectContextState {
    const ID: &'static str = "project_context";
    type Snapshot = ProjectContextSnapshot;

    fn snapshot(&self) -> Self::Snapshot {
        match &self.context {
            Some(context) => ProjectContextSnapshot {
                sections: context
                    .sections
                    .iter()
                    .map(|section| ProjectContextSnapshotSection {
                        name: section.name.clone(),
                        index_text: section.index_text.clone(),
                    })
                    .collect(),
            },
            None => ProjectContextSnapshot::default(),
        }
    }

    fn matches_legacy_fragment(role: &str, text: &str) -> bool {
        role == "user" && ProjectContextIndex::matches_text(text)
    }

    fn render_diff(
        &self,
        previous: PreviousSectionState<'_, Self::Snapshot>,
    ) -> Option<Box<dyn ContextualUserFragment>> {
        let current = self.snapshot();
        if matches!(previous, PreviousSectionState::Known(previous) if previous == &current) {
            return None;
        }
        let context = self.context.clone()?;
        if context.is_empty() {
            return None;
        }
        Some(Box::new(ProjectContextIndex { context }))
    }
}
