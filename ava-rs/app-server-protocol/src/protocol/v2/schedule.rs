use super::SandboxMode;
use crate::JsonSchema;
use crate::TS;
use serde::Deserialize;
use serde::Serialize;

/// Outcome of the most recent trigger of a scheduled task.
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub enum ScheduleRunStatus {
    Succeeded,
    Failed,
}

/// A user-defined scheduled task owned by the app server.
///
/// The server evaluates `cron` on a periodic tick and starts a headless agent
/// run (thread source `scheduled-task`) for every due, enabled schedule.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct ScheduledTask {
    pub id: String,
    pub name: String,
    /// Standard 5-field cron expression: `minute hour day-of-month month day-of-week`.
    pub cron: String,
    /// Agent instructions executed on every trigger.
    pub prompt: String,
    /// Working directory for the run. Omitted/null falls back to the server default.
    #[ts(optional = nullable)]
    pub cwd: Option<String>,
    /// Model override (e.g. `"gpt-5"`). Omitted/null uses the server default model.
    #[ts(optional = nullable)]
    pub model: Option<String>,
    /// Sandbox policy for the run. Omitted/null uses the server default.
    #[ts(optional = nullable)]
    pub sandbox: Option<SandboxMode>,
    pub enabled: bool,
    /// Unix timestamp (seconds) when the schedule was created.
    #[ts(type = "number")]
    pub created_at: i64,
    /// Unix timestamp (seconds) of the last modification.
    #[ts(type = "number")]
    pub updated_at: i64,
    /// Unix timestamp (seconds) of the last trigger, if any.
    #[ts(type = "number | null")]
    pub last_run_at: Option<i64>,
    /// Outcome of the last trigger, if any.
    pub last_status: Option<ScheduleRunStatus>,
    /// Unix timestamp (seconds) of the next planned trigger, if enabled and parseable.
    #[ts(type = "number | null")]
    pub next_run_at: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct ScheduleCreateParams {
    pub name: String,
    /// Standard 5-field cron expression.
    pub cron: String,
    /// Agent instructions executed on every trigger.
    pub prompt: String,
    #[ts(optional = nullable)]
    pub cwd: Option<String>,
    #[ts(optional = nullable)]
    pub model: Option<String>,
    #[ts(optional = nullable)]
    pub sandbox: Option<SandboxMode>,
    /// Defaults to true when omitted/null.
    #[ts(optional = nullable)]
    pub enabled: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct ScheduleCreateResponse {
    pub schedule: ScheduledTask,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct ScheduleListParams {
    /// Opaque pagination cursor returned as `next_cursor` by a previous call.
    #[ts(optional = nullable)]
    pub cursor: Option<String>,
    #[ts(optional = nullable)]
    pub limit: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct ScheduleListResponse {
    pub data: Vec<ScheduledTask>,
    /// Opaque cursor for the next page. If None, there are no more items.
    pub next_cursor: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct ScheduleUpdateParams {
    pub id: String,
    /// Omitted/null leaves the field unchanged.
    #[ts(optional = nullable)]
    pub name: Option<String>,
    #[ts(optional = nullable)]
    pub cron: Option<String>,
    #[ts(optional = nullable)]
    pub prompt: Option<String>,
    #[ts(optional = nullable)]
    pub cwd: Option<String>,
    #[ts(optional = nullable)]
    pub model: Option<String>,
    #[ts(optional = nullable)]
    pub sandbox: Option<SandboxMode>,
    #[ts(optional = nullable)]
    pub enabled: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct ScheduleUpdateResponse {
    pub schedule: ScheduledTask,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct ScheduleDeleteParams {
    pub id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct ScheduleDeleteResponse {}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct ScheduleRunParams {
    pub id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export_to = "v2/")]
pub struct ScheduleRunResponse {
    pub thread_id: String,
}
