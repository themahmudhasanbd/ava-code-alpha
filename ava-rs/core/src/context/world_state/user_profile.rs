use super::PreviousSectionState;
use super::WorldStateHash;
use super::WorldStateSection;
use crate::context::ContextualUserFragment;
use crate::context::user_profile::UserProfileContextFragment;
use codex_protocol::user_profile::UserProfileConfig;
use serde::Deserialize;
use serde::Serialize;

#[derive(Clone, Debug)]
pub(crate) struct UserProfileState {
    fragment: Option<UserProfileContextFragment>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub(crate) struct UserProfileSnapshot {
    profile_hash: Option<WorldStateHash>,
}

impl UserProfileState {
    pub(crate) fn new(config: &UserProfileConfig) -> Self {
        let fragment = if config.enabled {
            let rendered = config.render_context_text();
            if rendered.is_empty() {
                None
            } else {
                Some(UserProfileContextFragment::new(config))
            }
        } else {
            None
        };
        Self { fragment }
    }
}

impl WorldStateSection for UserProfileState {
    const ID: &'static str = "user_profile";
    type Snapshot = UserProfileSnapshot;

    fn snapshot(&self) -> Self::Snapshot {
        UserProfileSnapshot {
            profile_hash: self.fragment.as_ref().map(WorldStateHash::from_fragment),
        }
    }

    fn matches_legacy_fragment(role: &str, text: &str) -> bool {
        role == "developer" && UserProfileContextFragment::matches_text(text)
    }

    fn has_retained_fragment_matcher() -> bool {
        true
    }

    fn matches_retained_fragment(role: &str, text: &str) -> bool {
        Self::matches_legacy_fragment(role, text)
    }

    fn render_diff(
        &self,
        previous: PreviousSectionState<'_, Self::Snapshot>,
    ) -> Option<Box<dyn ContextualUserFragment>> {
        if matches!(previous, PreviousSectionState::Known(previous) if previous == &self.snapshot())
        {
            return None;
        }

        let fragment = match (&self.fragment, previous) {
            (Some(fragment), _) => fragment.clone(),
            (None, PreviousSectionState::Known(prev)) if prev.profile_hash.is_some() => {
                // When profile is disabled or cleared, return empty or none
                return None;
            }
            (None, _) => return None,
        };

        Some(Box::new(fragment))
    }
}
