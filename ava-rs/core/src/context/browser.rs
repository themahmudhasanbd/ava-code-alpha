//! Typed, bounded browser context.

use super::ContextualUserFragment;
use codex_protocol::models::ContentItemKind;
use codex_utils_output_truncation::TruncationPolicy;
use codex_utils_output_truncation::truncate_text;

/// Browser-owned model context, capped below 10k tokens.
pub enum BrowserContextFragment {
    Instructions(String),
}

impl ContextualUserFragment for BrowserContextFragment {
    fn role(&self) -> &'static str {
        "developer"
    }
    fn content_kind(&self) -> ContentItemKind {
        ContentItemKind("browser.instructions".to_string())
    }
    fn requires_separate_message(&self) -> bool {
        true
    }
    fn markers(&self) -> (&'static str, &'static str) {
        Self::type_markers()
    }
    fn type_markers() -> (&'static str, &'static str) {
        ("", "")
    }
    fn body(&self) -> String {
        let Self::Instructions(text) = self;
        truncate_text(text, TruncationPolicy::Bytes(8_900))
    }
}
