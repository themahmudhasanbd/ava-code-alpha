//! Server-side automatic thread title generation.
//!
//! After a thread's first successful turn, the server generates a short title
//! from the opening exchange using an ephemeral helper thread, then sets the
//! thread's name. This replaces the previous mobile-client-side implementation:
//! the server is now the single source of truth for automatic titles.
//!
//! Everything is best-effort: any failure is logged and never affects chat.

use std::sync::Arc;
use std::time::Duration;

use ava_app_server_protocol::ThreadSource;
use ava_core::AvaThread;
use ava_core::ThreadManager;
use ava_protocol::ThreadId;
use ava_protocol::protocol::EventMsg;
use ava_protocol::turn_input::StartIfIdleSubmission;
use ava_protocol::turn_input::TurnInput;
use ava_protocol::turn_input::TurnInputRequest;
use ava_protocol::user_input::UserInput;
use ava_thread_store::ThreadMetadataPatch;

/// Maximum characters for a generated title (TUI parity).
const TITLE_MAX_CHARS: usize = 36;
/// Maximum bytes of conversation excerpt sent in the title prompt.
const TITLE_PROMPT_MAX_BYTES: usize = 960;
/// Timeout for the ephemeral title-generation turn.
const TITLE_GENERATION_TIMEOUT: Duration = Duration::from_secs(90);

/// Thread source tag for ephemeral title-generation threads, so they are
/// never picked up for title generation themselves.
const TITLE_THREAD_SOURCE: &str = "thread_title";

fn build_title_prompt(assistant_text: &str) -> String {
    let excerpt: String = assistant_text.chars().take(TITLE_PROMPT_MAX_BYTES).collect();
    format!(
        "Generate a very short title (max {TITLE_MAX_CHARS} characters) for the conversation below. \
         Rules: plain text only, no quotation marks, no trailing period, no emoji. \
         Reply with ONLY the title, nothing else.\n\nConversation:\n{excerpt}"
    )
}

fn clean_title(raw: &str) -> Option<String> {
    let mut t = raw.trim().to_string();
    // Strip surrounding quotes and trailing punctuation.
    loop {
        let stripped = t
            .strip_prefix(['"', '\'', '\u{201c}', '\u{2018}', '`'])
            .or_else(|| {
                t.strip_suffix([
                    '"', '\'', '\u{201d}', '\u{2019}', '`', '.', ',', ';', ':', '!', '?', '-',
                    '\u{2013}', '\u{2014}',
                ])
            });
        match stripped {
            Some(s) => t = s.to_string(),
            None => break,
        }
    }
    // Collapse whitespace.
    t = t.split_whitespace().collect::<Vec<_>>().join(" ");
    let t = t.trim().to_string();
    if t.is_empty() {
        return None;
    }
    let t: String = t.chars().take(TITLE_MAX_CHARS).collect();
    let t = t.trim().to_string();
    if t.is_empty() {
        None
    } else {
        Some(t)
    }
}

/// Spawns a best-effort background task that generates and sets a thread title.
///
/// Does nothing when `assistant_text` is blank. Threads that already have a name
/// are skipped.
pub(crate) fn maybe_generate_thread_title(
    thread_manager: Arc<ThreadManager>,
    conversation: Arc<AvaThread>,
    conversation_id: ThreadId,
    assistant_text: String,
) {
    if assistant_text.trim().is_empty() {
        return;
    }
    tokio::spawn(async move {
        if let Err(err) = generate_thread_title_inner(
            &thread_manager,
            &conversation,
            conversation_id,
            &assistant_text,
        )
        .await
        {
            tracing::debug!("server title generation skipped/failed: {err}");
        }
    });
}

async fn generate_thread_title_inner(
    thread_manager: &Arc<ThreadManager>,
    conversation: &Arc<AvaThread>,
    conversation_id: ThreadId,
    assistant_text: &str,
) -> anyhow::Result<()> {
    // Skip threads that already have a name.
    let stored = conversation
        .read_thread(/*include_archived*/ true, /*include_history*/ false)
        .await
        .map_err(|err| anyhow::anyhow!("read thread failed: {err}"))?;
    if stored
        .name
        .as_deref()
        .map(str::trim)
        .is_some_and(|name| !name.is_empty())
    {
        return Ok(());
    }

    let prompt = build_title_prompt(assistant_text);

    // Ephemeral helper thread inherits the original thread's config (model,
    // provider, cwd) so title generation uses the same model the user chose.
    let config = conversation.config().await;
    let mut start_options = ava_core::StartThreadOptions::new((*config).clone());
    start_options.thread_source = Some(ThreadSource::Feature(TITLE_THREAD_SOURCE.to_string()));

    let temp_thread_id = thread_manager
        .start_thread(start_options)
        .await
        .map_err(|err| anyhow::anyhow!("start title thread failed: {err}"))?
        .thread_id;
    let temp_thread = thread_manager
        .get_thread(temp_thread_id)
        .await
        .map_err(|err| anyhow::anyhow!("get title thread failed: {err}"))?;

    let title: anyhow::Result<String> = async {
        let request = TurnInputRequest {
            input: TurnInput::UserInput {
                content: vec![UserInput::Text {
                    text: prompt,
                    text_elements: vec![],
                }],
                client_id: None,
            },
            thread_settings: Default::default(),
            start: Default::default(),
            additional_context: Default::default(),
            responsesapi_client_metadata: None,
            trace: None,
        };
        let submission = temp_thread
            .start_turn_if_idle(request)
            .await
            .map_err(|err| anyhow::anyhow!("submit title turn failed: {err}"))?;
        let turn_id = match submission {
            StartIfIdleSubmission::Started { turn_id } => turn_id,
            StartIfIdleSubmission::NotSubmitted { reason } => {
                anyhow::bail!("title turn not submitted: {reason:?}")
            }
        };

        // Wait for the turn to complete.
        let raw = tokio::time::timeout(TITLE_GENERATION_TIMEOUT, async {
            loop {
                let event = temp_thread
                    .next_event()
                    .await
                    .map_err(|err| anyhow::anyhow!("title thread event failed: {err}"))?;
                match event.msg {
                    EventMsg::TurnComplete(complete) if complete.turn_id == turn_id => {
                        break complete.last_agent_message.unwrap_or_default();
                    }
                    EventMsg::TurnAborted(aborted)
                        if aborted.turn_id.as_deref() == Some(turn_id.as_str()) =>
                    {
                        anyhow::bail!("title turn aborted");
                    }
                    _ => {}
                }
            }
        })
        .await
        .map_err(|_| anyhow::anyhow!("title generation timed out"))??;

        clean_title(&raw).ok_or_else(|| anyhow::anyhow!("empty title"))
    }
    .await;

    // Always clean up the helper thread.
    thread_manager.remove_thread(&temp_thread_id).await;

    let title = title?;
    let Some(name) = ava_core::util::normalize_thread_name(&title) else {
        return Ok(());
    };
    thread_manager
        .update_thread_metadata(
            conversation_id,
            ThreadMetadataPatch {
                name: Some(Some(name)),
                ..Default::default()
            },
            /*include_archived*/ false,
        )
        .await
        .map_err(|err| anyhow::anyhow!("set thread name failed: {err}"))?;
    Ok(())
}
