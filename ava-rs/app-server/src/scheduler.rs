//! Server-owned scheduler for user-defined scheduled tasks.
//!
//! Mobile clients manage schedules through the `schedule/*` RPC methods. The
//! [`SchedulerService`] persists schedules under the server home directory and
//! runs a background tick loop. When a schedule becomes due, the service
//! starts a headless agent run directly through the app-server thread/turn
//! machinery: a new thread is created with thread source `scheduled-task` and
//! a turn is submitted with the schedule's prompt. No CLI invocation, cron
//! daemon, or shell command is involved.

pub(crate) mod cron;

use std::collections::HashMap;
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::AtomicU64;
use std::sync::atomic::Ordering;
use std::time::Duration;

use ava_app_server_protocol::AskForApproval;
use ava_app_server_protocol::RequestId;
use ava_app_server_protocol::SandboxMode;
use ava_app_server_protocol::ScheduleCreateParams;
use ava_app_server_protocol::ScheduleRunStatus;
use ava_app_server_protocol::ScheduleUpdateParams;
use ava_app_server_protocol::ScheduledTask;
use ava_app_server_protocol::TurnStartParams;
use ava_app_server_protocol::UserInput as V2UserInput;
use ava_app_server_transport::ConnectionId;
use ava_core::StartThreadOptions;
use ava_core::ThreadManager;
use ava_core::config::ConfigOverrides;
use ava_protocol::protocol::SessionSource;
use ava_protocol::protocol::ThreadSource;
use chrono::Utc;
use serde::Deserialize;
use serde::Serialize;
use tokio::sync::RwLock;
use tokio_util::sync::CancellationToken;

use crate::config_manager::ConfigManager;
use ava_app_server_protocol::JSONRPCErrorError;
use crate::error_code::internal_error;
use crate::error_code::invalid_request;
use crate::outgoing_message::ConnectionRequestId;
use crate::request_processors::turn_processor::TurnRequestProcessor;

use self::cron::next_run_after;
use self::cron::parse_cron;

/// Thread source tag for threads started by the scheduler.
///
/// The mobile session list renders a clock pill for this tag.
pub(crate) const SCHEDULED_THREAD_SOURCE: &str = "scheduled-task";

/// Synthetic connection id used for scheduler-triggered turns.
const SCHEDULER_CONNECTION_ID: u64 = u64::MAX;

/// How often the scheduler checks for due schedules.
const TICK_INTERVAL: Duration = Duration::from_secs(30);

/// On-disk format for the schedule store.
#[derive(Serialize, Deserialize, Debug, Default)]
struct ScheduleStoreFile {
    version: u32,
    schedules: Vec<ScheduledTask>,
}

struct SchedulerInner {
    store_path: PathBuf,
    schedules: RwLock<HashMap<String, ScheduledTask>>,
    /// Schedule ids with a trigger currently in flight (duplicate-run guard).
    running: RwLock<HashSet<String>>,
    thread_manager: Arc<ThreadManager>,
    config_manager: ConfigManager,
    turn_processor: Arc<TurnRequestProcessor>,
    id_counter: AtomicU64,
    shutdown: CancellationToken,
}

/// Server-owned scheduler service.
///
/// Cheap to clone; all state lives behind the inner `Arc`.
#[derive(Clone)]
pub(crate) struct SchedulerService {
    inner: Arc<SchedulerInner>,
}

impl SchedulerService {
    pub(crate) fn new(
        store_path: PathBuf,
        thread_manager: Arc<ThreadManager>,
        config_manager: ConfigManager,
        turn_processor: Arc<TurnRequestProcessor>,
    ) -> Self {
        let mut schedules: HashMap<String, ScheduledTask> = HashMap::new();
        match load_store(&store_path) {
            Ok(stored) => {
                let now = Utc::now().timestamp();
                for mut schedule in stored {
                    // Never fire immediately for time missed while the server was down;
                    // recompute the next run from now.
                    schedule.next_run_at = next_run_at_for(&schedule, now);
                    schedules.insert(schedule.id.clone(), schedule);
                }
            }
            Err(err) => {
                tracing::warn!(
                    "failed to load schedule store at {}: {err}; starting empty",
                    store_path.display()
                );
            }
        }
        Self {
            inner: Arc::new(SchedulerInner {
                store_path,
                schedules: RwLock::new(schedules),
                running: RwLock::new(HashSet::new()),
                thread_manager,
                config_manager,
                turn_processor,
                id_counter: AtomicU64::new(0),
                shutdown: CancellationToken::new(),
            }),
        }
    }

    /// Starts the background tick loop. Safe to call once.
    pub(crate) fn start(&self) {
        let this = self.clone();
        tokio::spawn(async move { this.tick_loop().await });
    }

    /// Stops the background tick loop.
    pub(crate) fn shutdown(&self) {
        self.inner.shutdown.cancel();
    }

    pub(crate) async fn create_schedule(
        &self,
        params: ScheduleCreateParams,
    ) -> Result<ScheduledTask, JSONRPCErrorError> {
        let name = params.name.trim();
        if name.is_empty() {
            return Err(invalid_request("schedule `name` must not be empty"));
        }
        parse_cron(&params.cron)
            .map_err(|err| invalid_request(format!("invalid `cron` expression: {err}")))?;
        let prompt = params.prompt.trim();
        if prompt.is_empty() {
            return Err(invalid_request("schedule `prompt` must not be empty"));
        }
        let now = Utc::now().timestamp();
        let counter = self.inner.id_counter.fetch_add(1, Ordering::Relaxed);
        let mut schedule = ScheduledTask {
            id: format!("sched-{now}-{counter:06}"),
            name: name.to_string(),
            cron: params.cron,
            prompt: prompt.to_string(),
            cwd: params.cwd,
            model: params.model,
            sandbox: params.sandbox,
            enabled: params.enabled.unwrap_or(true),
            created_at: now,
            updated_at: now,
            last_run_at: None,
            last_status: None,
            next_run_at: None,
        };
        schedule.next_run_at = next_run_at_for(&schedule, now);
        self.inner
            .schedules
            .write()
            .await
            .insert(schedule.id.clone(), schedule.clone());
        self.persist().await?;
        Ok(schedule)
    }

    pub(crate) async fn list_schedules(
        &self,
        cursor: Option<String>,
        limit: Option<u32>,
    ) -> Result<(Vec<ScheduledTask>, Option<String>), JSONRPCErrorError> {
        let offset: usize = cursor
            .as_deref()
            .unwrap_or("0")
            .parse()
            .map_err(|_| invalid_request("invalid `cursor`"))?;
        let limit = limit.unwrap_or(100).min(500) as usize;
        let schedules = self.inner.schedules.read().await;
        let mut all: Vec<ScheduledTask> = schedules.values().cloned().collect();
        all.sort_by(|a, b| b.created_at.cmp(&a.created_at).then(a.id.cmp(&b.id)));
        let page: Vec<ScheduledTask> = all.into_iter().skip(offset).take(limit).collect();
        let next_cursor = if page.len() == limit {
            Some((offset + limit).to_string())
        } else {
            None
        };
        Ok((page, next_cursor))
    }

    pub(crate) async fn update_schedule(
        &self,
        params: ScheduleUpdateParams,
    ) -> Result<ScheduledTask, JSONRPCErrorError> {
        let mut schedules = self.inner.schedules.write().await;
        let schedule = schedules
            .get_mut(&params.id)
            .ok_or_else(|| invalid_request(format!("schedule `{}` not found", params.id)))?;
        if let Some(name) = params.name {
            let name = name.trim();
            if name.is_empty() {
                return Err(invalid_request("schedule `name` must not be empty"));
            }
            schedule.name = name.to_string();
        }
        if let Some(cron) = params.cron {
            parse_cron(&cron)
                .map_err(|err| invalid_request(format!("invalid `cron` expression: {err}")))?;
            schedule.cron = cron;
        }
        if let Some(prompt) = params.prompt {
            let prompt = prompt.trim();
            if prompt.is_empty() {
                return Err(invalid_request("schedule `prompt` must not be empty"));
            }
            schedule.prompt = prompt.to_string();
        }
        if params.cwd.is_some() {
            schedule.cwd = params.cwd;
        }
        if params.model.is_some() {
            schedule.model = params.model;
        }
        if params.sandbox.is_some() {
            schedule.sandbox = params.sandbox;
        }
        if let Some(enabled) = params.enabled {
            schedule.enabled = enabled;
        }
        let now = Utc::now().timestamp();
        schedule.updated_at = now;
        schedule.next_run_at = next_run_at_for(schedule, now);
        let updated = schedule.clone();
        drop(schedules);
        self.persist().await?;
        Ok(updated)
    }

    pub(crate) async fn delete_schedule(&self, id: &str) -> Result<(), JSONRPCErrorError> {
        let removed = self.inner.schedules.write().await.remove(id).is_some();
        if !removed {
            return Err(invalid_request(format!("schedule `{id}` not found")));
        }
        self.persist().await?;
        Ok(())
    }

    /// Triggers a run immediately, outside the cron cadence.
    pub(crate) async fn run_schedule_now(&self, id: &str) -> Result<String, JSONRPCErrorError> {
        self.trigger_run(id)
            .await
            .map_err(|err| invalid_request(err))
    }

    async fn tick_loop(&self) {
        let mut interval = tokio::time::interval(TICK_INTERVAL);
        loop {
            tokio::select! {
                () = self.inner.shutdown.cancelled() => break,
                _ = interval.tick() => self.tick().await,
            }
        }
    }

    async fn tick(&self) {
        let now = Utc::now().timestamp();
        let due: Vec<String> = {
            let schedules = self.inner.schedules.read().await;
            schedules
                .values()
                .filter(|schedule| {
                    schedule.enabled && schedule.next_run_at.is_some_and(|next| next <= now)
                })
                .map(|schedule| schedule.id.clone())
                .collect()
        };
        for id in due {
            let this = self.clone();
            tokio::spawn(async move {
                if let Err(err) = this.trigger_run(&id).await {
                    tracing::warn!("scheduled task {id} trigger failed: {err}");
                }
            });
        }
    }

    /// Triggers a single run with duplicate-run protection.
    ///
    /// Returns the new thread id on success. Records run metadata (last run
    /// time, outcome, next run) regardless of the outcome.
    async fn trigger_run(&self, id: &str) -> Result<String, String> {
        {
            let mut running = self.inner.running.write().await;
            if !running.insert(id.to_string()) {
                return Err(format!("scheduled task {id} already has a run in flight"));
            }
        }
        let outcome = self.execute_once(id).await;
        self.inner.running.write().await.remove(id);

        let now = Utc::now().timestamp();
        {
            let mut schedules = self.inner.schedules.write().await;
            if let Some(schedule) = schedules.get_mut(id) {
                schedule.last_run_at = Some(now);
                schedule.last_status = Some(if outcome.is_ok() {
                    ScheduleRunStatus::Succeeded
                } else {
                    ScheduleRunStatus::Failed
                });
                schedule.next_run_at = next_run_at_for(schedule, now);
            }
        }
        if let Err(err) = self.persist().await {
            tracing::warn!("failed to persist schedule store: {}", err.message);
        }
        outcome
    }

    /// Creates a thread and submits the schedule's prompt as a headless turn.
    ///
    /// Returns once the turn is submitted (not when it completes), mirroring
    /// `turn/start` semantics. Errors here mean the run never started.
    async fn execute_once(&self, id: &str) -> Result<String, String> {
        let schedule = self
            .inner
            .schedules
            .read()
            .await
            .get(id)
            .cloned()
            .ok_or_else(|| format!("scheduled task {id} not found"))?;

        let overrides = ConfigOverrides {
            model: schedule.model.clone(),
            cwd: schedule.cwd.clone().map(PathBuf::from),
            // Headless runs have no client to answer approvals; never ask.
            approval_policy: Some(AskForApproval::Never.to_core()),
            sandbox_mode: schedule.sandbox.map(SandboxMode::to_core),
            ..Default::default()
        };
        let config = self
            .inner
            .config_manager
            .load_for_cwd(None, overrides, schedule.cwd.clone().map(PathBuf::from))
            .await
            .map_err(|err| format!("failed to load config for scheduled task {id}: {err}"))?;

        let mut start_options = StartThreadOptions::new(config);
        start_options.session_source = Some(SessionSource::Custom("scheduler".to_string()));
        start_options.thread_source = Some(ThreadSource::Feature(SCHEDULED_THREAD_SOURCE.into()));
        let thread_id = self
            .inner
            .thread_manager
            .start_thread(start_options)
            .await
            .map_err(|err| format!("failed to start thread for scheduled task {id}: {err}"))?
            .thread_id;

        let request_id = ConnectionRequestId {
            connection_id: ConnectionId(SCHEDULER_CONNECTION_ID),
            request_id: RequestId::String(format!("scheduler-{id}-{}", Utc::now().timestamp())),
        };
        let params = TurnStartParams {
            thread_id: thread_id.to_string(),
            input: vec![V2UserInput::Text {
                text: schedule.prompt.clone(),
                text_elements: vec![],
            }],
            approval_policy: Some(AskForApproval::Never),
            turn_trigger: Some(SCHEDULED_THREAD_SOURCE.to_string()),
            ..Default::default()
        };
        self.inner
            .turn_processor
            .turn_start_inner(
                request_id,
                params,
                /*app_server_client_name*/ Some("ava-scheduler".to_string()),
                /*app_server_client_version*/ None,
            )
            .await
            .map(|_| thread_id.to_string())
            .map_err(|err| format!("failed to submit turn for scheduled task {id}: {}", err.message))
    }

    async fn persist(&self) -> Result<(), JSONRPCErrorError> {
        let schedules = self.inner.schedules.read().await;
        let mut stored: Vec<ScheduledTask> = schedules.values().cloned().collect();
        stored.sort_by(|a, b| a.id.cmp(&b.id));
        let file = ScheduleStoreFile {
            version: 1,
            schedules: stored,
        };
        let json = serde_json::to_string_pretty(&file)
            .map_err(|err| internal_error(format!("failed to serialize schedule store: {err}")))?;
        drop(schedules);
        let tmp_path = self.inner.store_path.with_extension("json.tmp");
        let write_error = |err: std::io::Error| {
            internal_error(format!(
                "failed to persist schedule store at {}: {err}",
                self.inner.store_path.display()
            ))
        };
        tokio::fs::write(&tmp_path, json)
            .await
            .map_err(write_error)?;
        tokio::fs::rename(&tmp_path, &self.inner.store_path)
            .await
            .map_err(write_error)
    }
}

fn next_run_at_for(schedule: &ScheduledTask, now: i64) -> Option<i64> {
    if !schedule.enabled {
        return None;
    }
    parse_cron(&schedule.cron)
        .ok()
        .and_then(|cron| next_run_after(&cron, now))
}

/// Loads the persisted schedules. Missing file means no schedules yet; a
/// corrupt file is reported as an error so the caller can start empty.
fn load_store(path: &std::path::Path) -> Result<Vec<ScheduledTask>, String> {
    let bytes = match std::fs::read(path) {
        Ok(bytes) => bytes,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(err) => return Err(format!("read failed: {err}")),
    };
    let file: ScheduleStoreFile =
        serde_json::from_slice(&bytes).map_err(|err| format!("parse failed: {err}"))?;
    Ok(file.schedules)
}
