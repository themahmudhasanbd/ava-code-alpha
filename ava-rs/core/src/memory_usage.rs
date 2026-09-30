use crate::tools::context::ToolInvocation;
use crate::tools::context::ToolPayload;
use crate::tools::flat_tool_name;
use crate::tools::handlers::unified_exec::ExecCommandArgs;
use ava_memories_read::usage::MEMORIES_USAGE_METRIC;
use ava_memories_read::usage::memories_usage_from_command;
use ava_protocol::MemoryVersion;

pub(crate) fn emit_metric_for_tool_read(invocation: &ToolInvocation, success: bool) {
    let Some(command) = shell_script_for_invocation(invocation) else {
        return;
    };

    let success = if success { "true" } else { "false" };
    let tool_name = flat_tool_name(&invocation.tool_name);
    for (kind, version) in memories_usage_from_command(&command) {
        invocation.turn.session_telemetry.counter(
            MEMORIES_USAGE_METRIC,
            /*inc*/ 1,
            &[
                ("kind", kind.as_tag()),
                (
                    "memory_version",
                    match version {
                        MemoryVersion::V1 => "v1",
                        MemoryVersion::V2 => "v2",
                    },
                ),
                ("tool", tool_name.as_ref()),
                ("success", success),
            ],
        );
    }
}

pub(crate) fn shell_script_for_invocation(invocation: &ToolInvocation) -> Option<String> {
    let ToolPayload::Function { arguments } = &invocation.payload else {
        return None;
    };

    if !invocation.tool_name.is_default_namespace() {
        return None;
    }

    match invocation.tool_name.name.as_str() {
        "exec_command" => serde_json::from_str::<ExecCommandArgs>(arguments)
            .ok()
            .map(|params| params.cmd),
        _ => None,
    }
}

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

/// Sink for per-turn memory/skill effectiveness feedback (GAP6).
///
/// Implemented by the memories extension (which owns the SQLite stores) and
/// registered into session extension data at thread start. Core must not
/// depend on the memories crate directly -- that would be a circular
/// dependency -- so the sink is a plain callback.
#[derive(Clone)]
pub struct TurnFeedbackSink {
    sink: Arc<
        dyn Fn(String, String, Option<i64>) -> Pin<Box<dyn Future<Output = ()> + Send>>
            + Send
            + Sync,
    >,
}

impl TurnFeedbackSink {
    pub fn new<F, Fut>(f: F) -> Self
    where
        F: Fn(String, String, Option<i64>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = ()> + Send + 'static,
    {
        Self {
            sink: Arc::new(move |turn_id, outcome, risk_score| {
                Box::pin(f(turn_id, outcome, risk_score))
                    as Pin<Box<dyn Future<Output = ()> + Send>>
            }),
        }
    }

    /// Record (turn_id, outcome, risk_score) for this turn. Best-effort.
    pub async fn record(&self, turn_id: String, outcome: String, risk_score: Option<i64>) {
        (self.sink)(turn_id, outcome, risk_score).await;
    }
}
