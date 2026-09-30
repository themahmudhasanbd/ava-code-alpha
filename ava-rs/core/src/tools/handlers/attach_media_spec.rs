use ava_tools::JsonSchema;
use ava_tools::ResponsesApiTool;
use ava_tools::ToolSpec;
use serde_json::json;
use std::collections::BTreeMap;

pub fn create_attach_media_tool() -> ToolSpec {
    let properties = BTreeMap::from([
        (
            "paths".to_string(),
            JsonSchema::array(
                JsonSchema::string(Some(
                    "Server-local file path to attach. Relative paths resolve against the turn working directory.".to_string(),
                )),
                Some("List of server-local file paths to attach to the final answer. Max 10 files, 25MB each.".to_string()),
            ),
        ),
        (
            "kind".to_string(),
            JsonSchema::string_enum(
                vec![json!("image"), json!("gallery"), json!("file")],
                Some(
                    "Attachment kind: \"image\" for a single image, \"gallery\" for multiple images shown together, \"file\" for anything else.".to_string(),
                ),
            ),
        ),
        (
            "caption".to_string(),
            JsonSchema::string(Some(
                "Optional caption shown with the attachment.".to_string(),
            )),
        ),
    ]);

    ToolSpec::Function(ResponsesApiTool {
        name: "attach_media".to_string(),
        description: r#"Attaches files (images, galleries, documents) to your final answer so the user can see and open them.
Each path must point to an existing file inside the project workspace. Paths outside the workspace are rejected.
Use this when the user asked for a file, or when your answer references a generated image, screenshot, document, or other artifact the user should view.
The attachments appear with your next message; keep your text answer concise and let the attachments speak.
"#
        .to_string(),
        strict: false,
        defer_loading: None,
        parameters: JsonSchema::object(
            properties,
            Some(vec!["paths".to_string(), "kind".to_string()]),
            Some(false.into()),
        ),
        output_schema: None,
    })
}
