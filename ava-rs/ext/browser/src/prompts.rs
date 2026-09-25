pub const BROWSER_DEVELOPER_INSTRUCTIONS: &str =
    include_str!("../templates/browser/instructions.md");

pub fn build_browser_developer_instructions() -> String {
    BROWSER_DEVELOPER_INSTRUCTIONS.trim().to_string()
}
