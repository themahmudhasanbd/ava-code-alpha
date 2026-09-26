use crate::function_tool::FunctionCallError;
use crate::tools::context::ToolInvocation;
use crate::tools::context::ToolOutput;
use crate::tools::context::ToolPayload;
use crate::tools::context::boxed_tool_output;
use crate::tools::handlers::plan_spec::create_todowrite_tool;
use crate::tools::handlers::plan_spec::create_update_plan_tool;
use crate::tools::registry::CoreToolRuntime;
use crate::tools::registry::ToolExecutor;
use codex_protocol::config_types::ModeKind;
use codex_protocol::models::FunctionCallOutputPayload;
use codex_protocol::models::ResponseInputItem;
use codex_protocol::plan_tool::PlanItemArg;
use codex_protocol::plan_tool::StepStatus;
use codex_protocol::plan_tool::UpdatePlanArgs;
use codex_protocol::protocol::EventMsg;
use codex_tools::ToolName;
use codex_tools::ToolSpec;
use serde::Deserialize;
use serde::Serialize;
use serde_json::Value as JsonValue;

pub struct PlanHandler;

pub struct TodoWriteHandler;

pub struct PlanToolOutput {
    pub message: String,
}

impl ToolOutput for PlanToolOutput {
    fn log_output(&self) -> String {
        self.message.clone()
    }

    fn success_for_logging(&self) -> bool {
        true
    }

    fn to_response_item(&self, call_id: &str, _payload: &ToolPayload) -> ResponseInputItem {
        let mut output = FunctionCallOutputPayload::from_text(self.message.clone());
        output.success = Some(true);

        ResponseInputItem::FunctionCallOutput {
            call_id: call_id.to_string(),
            output,
        }
    }

    fn code_mode_result(&self, _payload: &ToolPayload) -> JsonValue {
        serde_json::json!({
            "status": "success",
            "message": self.message
        })
    }
}

impl ToolExecutor<ToolInvocation> for PlanHandler {
    fn tool_name(&self) -> ToolName {
        ToolName::plain("update_plan")
    }

    fn spec(&self) -> ToolSpec {
        create_update_plan_tool()
    }

    fn handle<'a>(&'a self, invocation: ToolInvocation) -> codex_tools::ToolExecutorFuture<'a>
    where
        ToolInvocation: 'a,
    {
        Box::pin(Self::execute(invocation))
    }
}

impl CoreToolRuntime for PlanHandler {
    fn is_builtin_control_tool(&self) -> bool {
        true
    }
}

impl ToolExecutor<ToolInvocation> for TodoWriteHandler {
    fn tool_name(&self) -> ToolName {
        ToolName::plain("todowrite")
    }

    fn spec(&self) -> ToolSpec {
        create_todowrite_tool()
    }

    fn handle<'a>(&'a self, invocation: ToolInvocation) -> codex_tools::ToolExecutorFuture<'a>
    where
        ToolInvocation: 'a,
    {
        Box::pin(PlanHandler::execute(invocation))
    }
}

impl CoreToolRuntime for TodoWriteHandler {
    fn is_builtin_control_tool(&self) -> bool {
        true
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RawItem {
    content: Option<String>,
    step: Option<String>,
    status: Option<String>,
    priority: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RawPlanPayload {
    plan: Option<Vec<RawItem>>,
    todos: Option<Vec<RawItem>>,
    explanation: Option<String>,
}

impl PlanHandler {
    pub(crate) async fn execute(
        invocation: ToolInvocation,
    ) -> Result<Box<dyn ToolOutput>, FunctionCallError> {
        let ToolInvocation {
            session,
            turn,
            call_id: _,
            payload,
            ..
        } = invocation;

        let arguments = match payload {
            ToolPayload::Function { arguments } => arguments,
            _ => {
                return Err(FunctionCallError::RespondToModel(
                    "plan/todo handler received unsupported payload".to_string(),
                ));
            }
        };

        if turn.mode() == ModeKind::Plan {
            return Err(FunctionCallError::RespondToModel(
                "plan/todo tool is not allowed in Plan mode".to_string(),
            ));
        }

        let args = parse_plan_arguments(&arguments)?;
        let total = args.plan.len();
        let resolved = args
            .plan
            .iter()
            .filter(|p| matches!(p.status, StepStatus::Completed | StepStatus::Cancelled))
            .count();
        let in_progress = args
            .plan
            .iter()
            .find(|p| matches!(p.status, StepStatus::InProgress))
            .map(|p| p.step.clone())
            .unwrap_or_else(|| "(none)".to_string());

        // Retain plan on session state for context injection across turns
        session.set_active_plan(args.clone()).await;

        // Emit plan event to client UI
        session
            .send_event(turn.as_ref(), EventMsg::PlanUpdate(args))
            .await;

        let message = format!(
            "Successfully updated plan ({resolved}/{total} resolved). Current active step: {in_progress}"
        );

        Ok(boxed_tool_output(PlanToolOutput { message }))
    }
}

fn parse_plan_arguments(arguments: &str) -> Result<UpdatePlanArgs, FunctionCallError> {
    if let Ok(args) = serde_json::from_str::<UpdatePlanArgs>(arguments) {
        if !args.plan.is_empty() {
            return Ok(args);
        }
    }

    let raw = serde_json::from_str::<RawPlanPayload>(arguments).map_err(|e| {
        FunctionCallError::RespondToModel(format!("failed to parse function arguments: {e}"))
    })?;

    let items = raw.todos.or(raw.plan).unwrap_or_default();
    let mut plan = Vec::new();
    for item in items {
        let text = item
            .content
            .or(item.step)
            .unwrap_or_default()
            .trim()
            .to_string();
        if text.is_empty() {
            continue;
        }

        let status_str = item.status.as_deref().unwrap_or("pending").to_lowercase();
        let status = match status_str.as_str() {
            "completed" | "done" => StepStatus::Completed,
            "in_progress" | "in-progress" | "active" => StepStatus::InProgress,
            "cancelled" | "canceled" | "abandoned" => StepStatus::Cancelled,
            _ => StepStatus::Pending,
        };
        plan.push(PlanItemArg { step: text, status });
    }

    Ok(UpdatePlanArgs {
        explanation: raw.explanation,
        plan,
    })
}
