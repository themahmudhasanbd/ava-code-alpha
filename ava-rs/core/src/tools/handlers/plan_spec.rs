use codex_tools::JsonSchema;
use codex_tools::ResponsesApiTool;
use codex_tools::ToolSpec;
use serde_json::json;
use std::collections::BTreeMap;

pub fn create_update_plan_tool() -> ToolSpec {
    let plan_item_properties = BTreeMap::from([
        (
            "step".to_string(),
            JsonSchema::string(Some("Task step text.".to_string())),
        ),
        (
            "status".to_string(),
            JsonSchema::string_enum(
                vec![json!("pending"), json!("in_progress"), json!("completed")],
                Some("Step status.".to_string()),
            ),
        ),
    ]);

    let properties = BTreeMap::from([
        (
            "explanation".to_string(),
            JsonSchema::string(Some(
                "Optional explanation for this plan update.".to_string(),
            )),
        ),
        (
            "plan".to_string(),
            JsonSchema::array(
                JsonSchema::object(
                    plan_item_properties,
                    Some(vec!["step".to_string(), "status".to_string()]),
                    Some(false.into()),
                ),
                Some("The list of steps".to_string()),
            ),
        ),
    ]);

    ToolSpec::Function(ResponsesApiTool {
        name: "update_plan".to_string(),
        description: r#"Updates the task plan.
Provide an optional explanation and a list of plan items, each with a step and status.
At most one step can be in_progress at a time.
"#
        .to_string(),
        strict: false,
        defer_loading: None,
        parameters: JsonSchema::object(
            properties,
            Some(vec!["plan".to_string()]),
            Some(false.into()),
        ),
        output_schema: None,
    })
}

pub fn create_todowrite_tool() -> ToolSpec {
    let todo_item_properties = BTreeMap::from([
        (
            "content".to_string(),
            JsonSchema::string(Some("Brief description of the task step.".to_string())),
        ),
        (
            "status".to_string(),
            JsonSchema::string_enum(
                vec![
                    json!("pending"),
                    json!("in_progress"),
                    json!("completed"),
                    json!("cancelled"),
                ],
                Some("Current status: pending, in_progress, completed, cancelled.".to_string()),
            ),
        ),
        (
            "priority".to_string(),
            JsonSchema::string_enum(
                vec![json!("high"), json!("medium"), json!("low")],
                Some("Optional priority: high, medium, low.".to_string()),
            ),
        ),
    ]);

    let properties = BTreeMap::from([(
        "todos".to_string(),
        JsonSchema::array(
            JsonSchema::object(
                todo_item_properties,
                Some(vec!["content".to_string(), "status".to_string()]),
                Some(false.into()),
            ),
            Some("The updated list of tasks/todos.".to_string()),
        ),
    )]);

    ToolSpec::Function(ResponsesApiTool {
        name: "todowrite".to_string(),
        description: r#"Create and maintain a structured task list for the current session.
Tracks progress, organizes multi-step work, and surfaces real-time status to the user.
Use proactively whenever a task involves 3 or more steps.
Keep exactly one task in_progress at a time.
"#
        .to_string(),
        strict: false,
        defer_loading: None,
        parameters: JsonSchema::object(
            properties,
            Some(vec!["todos".to_string()]),
            Some(false.into()),
        ),
        output_schema: None,
    })
}
