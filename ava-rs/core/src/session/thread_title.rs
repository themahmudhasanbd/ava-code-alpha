//! Server-side automatic thread title generation.
//!
//! Runs after the first completed user turn: builds a bounded prompt from the
//! conversation, streams one low-effort model request, and persists the result
//! through the thread store. Manual names always take precedence — generation
//! is skipped when the thread already has a user-facing name.

use super::session::Session;
use crate::client::ModelClientSession;
use crate::client_common::Prompt;
use crate::client_common::ResponseEvent;
use crate::state::session::SessionState;
use ava_history::AvaHistory;
use ava_protocol::openai_models::ReasoningEffort;
use ava_utils_output_truncation::truncate_text;
use ava_utils_output_truncation::TruncationPolicy;
use std::sync::Arc;

pub(crate) const THREAD_TITLE_MAX_CHARS: usize = 36;
const THREAD_TITLE_PROMPT_MAX_BYTES: usize = 960;
const TITLE_RESPONSE_MAX_CHARS: usize = 200;

/// Public trigger called from app-server after a turn completes.
pub(crate) fn spawn_thread_title_generation(
    session: Arc<Session>,
    first_user_message: String,
) {
    tokio::spawn(async move {
        let thread_id = session.thread_id;
        let result = generate_and_apply_title(&session, first_user_message).await;
        if let Err(error) = result {
            tracing::debug!(%error, %thread_id, "thread title generation skipped");
        }
    });
}

async fn generate_and_apply_title(
    session: &Session,
    first_user_message: String,
) -> anyhow::Result<()> {
    if first_user_message.trim().is_empty() {
        anyhow::bail!("empty first user message");
    }

    // Skip when the thread already carries a name (frontends surface it directly).
    if let Some(live) = session.services.live_thread.as_ref()
        && live.metadata().await.name.is_some()
    {
        anyhow::bail!("thread already named");
    }
    if let Some(existing) = session
        .services
        .thread_store
        .read_thread(ava_thread_store::ReadThreadParams {
            thread_id: session.thread_id,
            include_archived: false,
            include_history: false,
        })
        .await
        .ok()
        .and_then(|thread| thread.name)
        && !existing.trim().is_empty()
    {
        anyhow::bail!("thread already named");
    }

    let title = request_title_from_model(session, first_user_message).await?;

    let patch = ava_thread_store::ThreadMetadataPatch {
        title: None,
        preview: None,
        name: ava_thread_store::ClearableField::Set(title),
        rollout_path: None,
        model_provider: None,
        model: None,
        ..Default::default()
    };
    session
        .services
        .thread_store
        .update_thread_metadata(ava_thread_store::UpdateThreadMetadataParams {
            thread_id: session.thread_id,
            patch,
            include_archived: false,
        })
        .await
        .map_err(|error| anyhow::anyhow!("title persist failed: {error}"))?;
    Ok(())
}

/// One bounded structured-ish request: instructions + first prompt, plain text reply.
async fn request_title_from_model(
    session: &Session,
    first_user_message: String,
) -> anyhow::Result<String> {
    let prompt = thread_title_prompt(&first_user_message);
    let settings = session.current_step_settings_snapshot().await;
    let effort = Some(ReasoningEffort::Low);
    let mut client = session.services.model_client.new_session();
    let history = AvaHistory::default();
    let _ = &history;
    let metadata = session
        .title_generation_responses_metadata(&settings)
        .await;
    let request_prompt = Prompt {
        input: Vec::new(),
        base_instructions: session.get_prompt_base_instructions().await,
        output_schema: None,
        output_schema_strict: false,
        ..Prompt::default()
    };
    let mut request_prompt = request_prompt;
    request_prompt.input = Vec::new();
    let _ = &mut request_prompt;
    // Single user message input built from ResponseItem::Message.
    request_prompt.input = Vec::new();
    let user_item = ava_protocol::models::ResponseItem::Message {
        id: None,
        role: "user".to_string(),
        content: vec![ava_protocol::models::ContentItem::InputText {
            text: prompt,
        }],
    };
    request_prompt.input.push(user_item);
    request_prompt.output_schema = None;
    let mut stream = client
        .stream(
            request_prompt,
            &settings.model_info,
            &session.session_telemetry(),
            effort,
            None,
            None,
            &metadata,
            &ava_rollout_trace::InferenceTraceContext::disabled(),
        )
        .await
        .map_err(|error| anyhow::anyhow!("title stream failed: {error}"))?;

    let mut text = String::new();
    while let Some(event) = stream.next().await {
        match event {
            Ok(ResponseEvent::OutputItemDone(item)) => {
                if let ava_protocol::models::ResponseItem::AgentMessage { content, .. } = item {
                    for part in content {
                        if let ava_protocol::models::ContentItem::OutputText { text: part_text, .. } = part {
                            text.push_str(&part_text);
                        }
                    }
                }
            }
            Ok(_) => {}
            Err(error) => return Err(anyhow::anyhow!("title stream error: {error}")),
        }
    }
    let cleaned = normalize_title(&text)?;
    anyhow::ensure!(!cleaned.is_empty(), "model returned empty title");
    Ok(cleaned)
}

fn thread_title_prompt(user_message: &str) -> String {
    let instructions = thread_title_instructions();
    let prefix = format!("{instructions}\n\nUser prompt:\n");
    let remaining_bytes = THREAD_TITLE_PROMPT_MAX_BYTES.saturating_sub(prefix.len());
    let clipped = truncate_text(user_message.trim(), TruncationPolicy::Characters(remaining_bytes));
    format!("{prefix}{clipped}")
}

fn thread_title_instructions() -> String {
    format!(
        "Generate a concise, single-line task title of at most \
  {THREAD_TITLE_MAX_CHARS} characters and under five words where possible. \
  Start with an imperative verb. Capitalize only the first word unless the \
  user's language, proper nouns, acronyms, or code terms require otherwise. \
  Preserve ticket references exactly. Write in the user's language. \
  Do not use quotes, markdown, or trailing punctuation. \
  Do not answer the request."
    )
}

fn normalize_title(raw: &str) -> anyhow::Result<String> {
    let mut value: String = raw
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join(" ");
    value = value
        .trim_matches(|c| c == '"' || c == '\'' || c == '`')
        .trim_end_matches(['.', '!', '?', '…'])
        .trim()
        .chars()
        .take(THREAD_TITLE_MAX_CHARS)
        .collect();
    let _ = TITLE_RESPONSE_MAX_CHARS;
    anyhow::ensure!(!value.is_empty(), "title empty after normalization");
    Ok(value)
}

impl Session {
    async fn session_telemetry(&self) -> crate::client::SessionTelemetry {
        self.session_telemetry().await
    }

    async fn current_step_settings_snapshot(
        &self,
    ) -> super::step_settings::ResolvedStepSettings {
        let state: tokio::sync::MutexGuard<'_, SessionState> = self.state.lock().await;
        state
            .session_configuration
            .clone()
            .into_resolved_step_settings()
    }

    async fn title_generation_responses_metadata(
        &self,
        settings: &super::step_settings::ResolvedStepSettings,
    ) -> ava_responses_metadata::AvaResponsesMetadata {
        self.services
            .model_client
            .title_generation_metadata(&settings.model_info, &self.thread_id)
    }
}
