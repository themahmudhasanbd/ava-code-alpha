use super::ContextualUserFragment;
use crate::project_context::LoadedProjectContext;
use ava_protocol::models::ContentItemKind;

/// The project `.ava-code/` context index catalog.
///
/// Injected with each prompt so the agent knows which project rules,
/// workflows, design tokens, and plans exist. The agent matches this catalog
/// against the user's prompt and loads the relevant detail files on-demand
/// via its file tools.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct ProjectContextIndex {
    pub(crate) context: LoadedProjectContext,
}

impl ContextualUserFragment for ProjectContextIndex {
    fn content_kind(&self) -> ContentItemKind {
        ContentItemKind("project_context.index".to_string())
    }

    fn role(&self) -> &'static str {
        "user"
    }

    fn markers(&self) -> (&'static str, &'static str) {
        Self::type_markers()
    }

    fn type_markers() -> (&'static str, &'static str) {
        ("# Project context index", "</PROJECT_CONTEXT_INDEX>")
    }

    fn body(&self) -> String {
        let mut out = String::from(
            "\n\n<PROJECT_CONTEXT_INDEX>\n\
             The project keeps persistent context under `.ava-code/`. \
             Below is the index catalog. Match it against the user's request: \
             when a section looks relevant, read the matching detail file(s) \
             with your file tools before acting, and follow the rules, \
             workflows, design tokens, and plans you find there.\n",
        );
        for section in &self.context.sections {
            out.push_str(&format!(
                "\n## .ava-code/{}/\n{}\n",
                section.name, section.index_text
            ));
        }
        out.push_str("</PROJECT_CONTEXT_INDEX>\n");
        out
    }
}
