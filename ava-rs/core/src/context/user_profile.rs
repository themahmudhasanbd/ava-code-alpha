//! Dynamic User Profile & Persona Context Fragment.

use super::ContextualUserFragment;
use codex_protocol::models::ContentItemKind;
use codex_protocol::user_profile::UserProfileConfig;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct UserProfileContextFragment {
    rendered: String,
}

impl UserProfileContextFragment {
    pub(crate) fn new(config: &UserProfileConfig) -> Self {
        Self {
            rendered: config.render_context_text(),
        }
    }
}

impl ContextualUserFragment for UserProfileContextFragment {
    fn content_kind(&self) -> ContentItemKind {
        ContentItemKind("user_profile.context".to_string())
    }

    fn role(&self) -> &'static str {
        "developer"
    }

    fn markers(&self) -> (&'static str, &'static str) {
        Self::type_markers()
    }

    fn type_markers() -> (&'static str, &'static str) {
        ("<user_profile>", "</user_profile>")
    }

    fn body(&self) -> String {
        self.rendered.clone()
    }
}
