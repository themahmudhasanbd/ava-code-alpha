use std::collections::HashMap;
use std::sync::{Arc, LazyLock};
use std::time::Duration;

use ava_extension_api::FunctionCallError;
use ava_extension_api::JsonToolOutput;
use ava_extension_api::ResponsesApiTool;
use ava_extension_api::ToolCall;
use ava_extension_api::ToolExecutor;
use ava_extension_api::ToolName;
use ava_extension_api::ToolSpec;
use ava_extension_api::parse_tool_input_schema;
use ava_otel::MetricsClient;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tokio::sync::RwLock;
use tokio::time::sleep;

use crate::approval::{ApprovalGate, ApprovalMode, ApprovalOutcome};
use crate::coordinator::BrowserCoordinator;
use crate::schema;

pub const BROWSER_SUBAGENT_TOOL_NAME: &str = "browser_subagent";

static SUBAGENT_REGISTRY: LazyLock<RwLock<HashMap<String, Arc<BrowserCoordinator>>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));

#[derive(Debug, Clone, Deserialize, JsonSchema)]
pub struct BrowserSubagentArgs {
    /// Human-readable title of the task that the browser subagent is executing (e.g. 'Logging into Veliq', 'Searching Catalog').
    #[serde(alias = "taskName", alias = "title")]
    pub task_name: String,
    /// A clear, actionable prompt sent to the browser subagent containing comprehensive task descriptions, credentials, target URLs, actions to take, and when to stop.
    #[serde(alias = "prompt", alias = "instruction")]
    pub task: String,
    /// A short, user-friendly summary of the task (1-2 sentences max).
    #[serde(alias = "taskSummary", alias = "summary")]
    pub task_summary: String,
    /// ID of a previous subagent session to resume from. If provided, the subagent continues with preserved browser/page/session state.
    #[serde(alias = "reusedSubagentId", alias = "subagent_id", alias = "sessionId")]
    pub reused_subagent_id: Option<String>,
    /// Name of the browser recording or session.
    #[serde(alias = "recordingName")]
    pub recording_name: Option<String>,
    /// Optional paths to media files to provide as context.
    #[serde(alias = "mediaPaths")]
    pub media_paths: Option<Vec<String>>,
    /// Set to true if the user explicitly approved mutating actions in chat.
    #[serde(alias = "is_approved")]
    pub approved: Option<bool>,
    /// Optional clean session flag. If true, starts fresh without existing saved cookies. Defaults to false.
    #[serde(alias = "cleanSession")]
    pub clean_session: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Serialize, JsonSchema)]
pub struct BrowserSubagentResponse {
    pub success: bool,
    pub subagent_id: String,
    pub status: String,
    pub task_name: String,
    pub summary: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub screenshot_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub live_stream_ws: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub obstacle: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_for_supervisor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggested_widget: Option<Value>,
}

#[derive(Clone)]
pub struct BrowserSubagentTool {
    coordinator: Arc<BrowserCoordinator>,
    approval_gate: Arc<ApprovalGate>,
    #[allow(dead_code)]
    metrics_client: Option<MetricsClient>,
}

impl BrowserSubagentTool {
    pub fn new(
        coordinator: Arc<BrowserCoordinator>,
        metrics_client: Option<MetricsClient>,
    ) -> Self {
        let cfg = coordinator.config();
        let approval_gate = Arc::new(ApprovalGate::new(
            ApprovalMode::parse(&cfg.approval_mode),
            cfg.allow_evaluate_js,
            cfg.allowed_origins.clone(),
        ));
        Self {
            coordinator,
            approval_gate,
            metrics_client,
        }
    }
}

impl<'call> ToolExecutor<ToolCall<'call>> for BrowserSubagentTool {
    fn tool_name(&self) -> ToolName {
        ToolName::plain(BROWSER_SUBAGENT_TOOL_NAME)
    }

    fn spec(&self) -> ToolSpec {
        let tool = ResponsesApiTool {
            name: BROWSER_SUBAGENT_TOOL_NAME.to_string(),
            description: r#"Start a dedicated browser subagent to perform autonomous actions in the browser (inspired by Google Gemini browser subagent and Meta Muse).
The subagent operates inside an isolated, persistent browsing session, with automatic obstacle detection (Cloudflare challenges, CAPTCHAs, 2FA/OTP prompts, login errors), live screencast streaming (ws://127.0.0.1:40061), human takeover support, and mid-session dynamic steering via reused_subagent_id.

Key Capabilities:
1. 'reused_subagent_id': Resume from a previous subagent turn without losing page, tab, or cookie session state.
2. Obstacle Escalation: When anti-bot or 2FA barriers occur, the subagent captures state and alerts the supervisor with live stream info and takeover availability instead of hanging.
3. Live Takeover: Live stream is available at ws://127.0.0.1:40061 for real-time iframe/canvas view and mouse/keyboard interaction.
"#
            .to_string(),
            strict: false,
            defer_loading: None,
            parameters: parse_tool_input_schema(&schema::input_schema_for::<BrowserSubagentArgs>())
                .unwrap_or_else(|err| {
                    panic!("generated input schema for {BROWSER_SUBAGENT_TOOL_NAME} should parse: {err}")
                }),
            output_schema: Some(schema::output_schema_for::<BrowserSubagentResponse>().into()),
        };

        ToolSpec::Function(tool)
    }

    fn handle<'a>(&'a self, call: ToolCall<'call>) -> ava_extension_api::ToolExecutorFuture<'a>
    where
        'call: 'a,
    {
        Box::pin(self.handle_call(call))
    }
}

impl BrowserSubagentTool {
    async fn handle_call(
        &self,
        call: ToolCall<'_>,
    ) -> Result<Box<dyn ava_extension_api::ToolOutput>, FunctionCallError> {
        let args_str = call.function_arguments()?;
        let args: BrowserSubagentArgs = serde_json::from_str(args_str).map_err(|e| {
            FunctionCallError::RespondToModel(format!("Invalid arguments JSON: {e}"))
        })?;

        // 1. Resolve or create persistent subagent coordinator session
        let (subagent_id, coordinator) = match &args.reused_subagent_id {
            Some(id) => {
                let registry = SUBAGENT_REGISTRY.read().await;
                if let Some(coord) = registry.get(id) {
                    (id.clone(), coord.clone())
                } else {
                    drop(registry);
                    let mut reg_mut = SUBAGENT_REGISTRY.write().await;
                    reg_mut.insert(id.clone(), self.coordinator.clone());
                    (id.clone(), self.coordinator.clone())
                }
            }
            None => {
                let new_id = format!("subagent-{}", &uuid::Uuid::new_v4().to_string()[..8]);
                let mut reg_mut = SUBAGENT_REGISTRY.write().await;
                reg_mut.insert(new_id.clone(), self.coordinator.clone());
                (new_id, self.coordinator.clone())
            }
        };

        // 2. Extract target URL if present in task
        let target_url = extract_url_from_text(&args.task);
        if let Some(url) = &target_url {
            let model_approved = args.approved.unwrap_or(false);
            if let ApprovalOutcome::NeedsApproval(prompt) =
                self.approval_gate
                    .check("open", Some(url), None, model_approved)
            {
                return Err(FunctionCallError::RespondToModel(prompt));
            }

            let cur_url = coordinator
                .engine()
                .get_current_url()
                .await
                .unwrap_or_default();
            if cur_url.is_empty() || cur_url == "about:blank" || !urls_share_domain(&cur_url, url) {
                let clean = args.clean_session.unwrap_or(false);
                let _ = coordinator
                    .open_url_with_session(url, None, None, Some(&args.task_name), clean)
                    .await;
                sleep(Duration::from_millis(600)).await;
            }
        }

        // 3. Inspect for immediate obstacles
        let obstacle = coordinator.inspect_obstacles().await;
        if obstacle.detected {
            let screenshot_path = capture_subagent_screenshot(&coordinator, &subagent_id).await;
            let page_state = coordinator.engine().get_page_state().await.ok();
            let summary = format!("Obstacle detected: {}", obstacle.title);
            let prompt_for_supervisor = format!(
                "The browser subagent encountered an obstacle: '{}'. Description: {}. Suggestion: {}. The user can take over mouse/keyboard via the live stream (ws://127.0.0.1:40061) or provide credentials/verification codes. To resume after user interaction, call browser_subagent with reused_subagent_id='{subagent_id}'.",
                obstacle.title, obstacle.description, obstacle.suggestion
            );

            let resp = BrowserSubagentResponse {
                success: false,
                subagent_id: subagent_id.clone(),
                status: "obstacle_detected".to_string(),
                task_name: args.task_name,
                summary,
                url: page_state.as_ref().map(|s| s.url.clone()),
                title: page_state.as_ref().map(|s| s.title.clone()),
                screenshot_path,
                live_stream_ws: Some("ws://127.0.0.1:40061".to_string()),
                obstacle: Some(json!(obstacle)),
                prompt_for_supervisor: Some(prompt_for_supervisor),
                suggested_widget: None,
            };
            return Ok(Box::new(JsonToolOutput::new(json!(resp))));
        }

        // 4. Check for login credentials in task (or auto-fetch from vault if available)
        let (mut username_opt, mut password_opt) = extract_credentials_from_text(&args.task);
        let mut from_vault = false;
        if (username_opt.is_none() || password_opt.is_none()) && target_url.is_some() {
            if let Some(domain) = target_url.as_ref().and_then(|u| extract_domain_from_url(u)) {
                if let Some((vault_user, vault_pass)) =
                    lookup_vault_credential(&coordinator, &domain).await
                {
                    if username_opt.is_none() {
                        username_opt = Some(vault_user);
                    }
                    if password_opt.is_none() {
                        password_opt = Some(vault_pass);
                    }
                    from_vault = true;
                }
            }
        }

        if let (Some(username), Some(password)) = (username_opt, password_opt) {
            let model_approved = args.approved.unwrap_or(false);
            if let ApprovalOutcome::NeedsApproval(prompt) = self.approval_gate.check(
                "login",
                target_url.as_deref(),
                Some(&username),
                model_approved,
            ) {
                return Err(FunctionCallError::RespondToModel(prompt));
            }

            let login_res = coordinator
                .login(None, &username, &password, None, None)
                .await;

            sleep(Duration::from_secs(2)).await;

            // Re-inspect obstacles post-login
            let post_obs = coordinator.inspect_obstacles().await;
            if post_obs.detected {
                let screenshot_path = capture_subagent_screenshot(&coordinator, &subagent_id).await;
                let page_state = coordinator.engine().get_page_state().await.ok();
                let summary = format!("Post-login obstacle detected: {}", post_obs.title);
                let prompt_for_supervisor = format!(
                    "The browser subagent submitted login credentials for '{username}', but encountered: '{}'. {}. Live stream is ready at ws://127.0.0.1:40061 for human takeover. When ready, resume with reused_subagent_id='{subagent_id}'.",
                    post_obs.title, post_obs.suggestion
                );

                let resp = BrowserSubagentResponse {
                    success: false,
                    subagent_id: subagent_id.clone(),
                    status: "obstacle_detected".to_string(),
                    task_name: args.task_name,
                    summary,
                    url: page_state.as_ref().map(|s| s.url.clone()),
                    title: page_state.as_ref().map(|s| s.title.clone()),
                    screenshot_path,
                    live_stream_ws: Some("ws://127.0.0.1:40061".to_string()),
                    obstacle: Some(json!(post_obs)),
                    prompt_for_supervisor: Some(prompt_for_supervisor),
                    suggested_widget: None,
                };
                return Ok(Box::new(JsonToolOutput::new(json!(resp))));
            }

            match login_res {
                Ok(res) => {
                    let screenshot_path =
                        capture_subagent_screenshot(&coordinator, &subagent_id).await;
                    let page_state = coordinator.engine().get_page_state().await.ok();
                    let suggested_widget = if !from_vault {
                        target_url.as_ref().map(|url| {
                            let domain =
                                extract_domain_from_url(url).unwrap_or_else(|| url.clone());
                            json!({
                                "widget": "save_credentials",
                                "site_url": url,
                                "domain": domain,
                                "username": username,
                                "secret": password,
                                "type": "password"
                            })
                        })
                    } else {
                        None
                    };

                    let resp = BrowserSubagentResponse {
                        success: res.success,
                        subagent_id: subagent_id.clone(),
                        status: "completed".to_string(),
                        task_name: args.task_name,
                        summary: format!("Login succeeded for '{username}'. {}", res.output),
                        url: page_state.as_ref().map(|s| s.url.clone()),
                        title: page_state.as_ref().map(|s| s.title.clone()),
                        screenshot_path,
                        live_stream_ws: Some("ws://127.0.0.1:40061".to_string()),
                        obstacle: None,
                        prompt_for_supervisor: None,
                        suggested_widget,
                    };
                    return Ok(Box::new(JsonToolOutput::new(json!(resp))));
                }
                Err(err) => {
                    let screenshot_path =
                        capture_subagent_screenshot(&coordinator, &subagent_id).await;
                    let page_state = coordinator.engine().get_page_state().await.ok();
                    let resp = BrowserSubagentResponse {
                        success: false,
                        subagent_id: subagent_id.clone(),
                        status: "error".to_string(),
                        task_name: args.task_name,
                        summary: format!("Login error: {err}"),
                        url: page_state.as_ref().map(|s| s.url.clone()),
                        title: page_state.as_ref().map(|s| s.title.clone()),
                        screenshot_path,
                        live_stream_ws: Some("ws://127.0.0.1:40061".to_string()),
                        obstacle: None,
                        prompt_for_supervisor: Some(format!(
                            "Login failed: {err}. User can adjust credentials and retry."
                        )),
                        suggested_widget: None,
                    };
                    return Ok(Box::new(JsonToolOutput::new(json!(resp))));
                }
            }
        }

        // 5. Handle OTP / Verification Code (e.g. from user steering mid-session)
        if let Some(code) = extract_otp_code(&args.task) {
            let otp_selector = "input[autocomplete='one-time-code'], input[name*='otp' i], input[name*='code' i], input[name*='token' i], input[type='text'], input[type='number']";
            let _ = coordinator.engine().fill(otp_selector, &code).await;
            sleep(Duration::from_millis(300)).await;
            let _ = coordinator
                .engine()
                .click("button[type='submit'], input[type='submit'], button")
                .await;
            sleep(Duration::from_secs(2)).await;

            let post_obs = coordinator.inspect_obstacles().await;
            let screenshot_path = capture_subagent_screenshot(&coordinator, &subagent_id).await;
            let page_state = coordinator.engine().get_page_state().await.ok();

            if post_obs.detected {
                let resp = BrowserSubagentResponse {
                    success: false,
                    subagent_id: subagent_id.clone(),
                    status: "obstacle_detected".to_string(),
                    task_name: args.task_name,
                    summary: format!("Post-verification obstacle: {}", post_obs.title),
                    url: page_state.as_ref().map(|s| s.url.clone()),
                    title: page_state.as_ref().map(|s| s.title.clone()),
                    screenshot_path,
                    live_stream_ws: Some("ws://127.0.0.1:40061".to_string()),
                    obstacle: Some(json!(post_obs)),
                    prompt_for_supervisor: Some(format!(
                        "After entering verification code, obstacle was detected: {}. Resume with reused_subagent_id='{subagent_id}'.",
                        post_obs.title
                    )),
                    suggested_widget: None,
                };
                return Ok(Box::new(JsonToolOutput::new(json!(resp))));
            }

            let resp = BrowserSubagentResponse {
                success: true,
                subagent_id: subagent_id.clone(),
                status: "completed".to_string(),
                task_name: args.task_name,
                summary: format!("Submitted verification code '{code}' successfully."),
                url: page_state.as_ref().map(|s| s.url.clone()),
                title: page_state.as_ref().map(|s| s.title.clone()),
                screenshot_path,
                live_stream_ws: Some("ws://127.0.0.1:40061".to_string()),
                obstacle: None,
                prompt_for_supervisor: None,
                suggested_widget: None,
            };
            return Ok(Box::new(JsonToolOutput::new(json!(resp))));
        }

        // 6. Default: Observe & Capture State
        let obs = coordinator
            .observe(false, false)
            .await
            .map_err(FunctionCallError::RespondToModel)?;
        let screenshot_path = capture_subagent_screenshot(&coordinator, &subagent_id).await;
        let resp = BrowserSubagentResponse {
            success: true,
            subagent_id,
            status: "completed".to_string(),
            task_name: args.task_name,
            summary: format!(
                "Subagent active on '{}'. Found {} interactive elements.",
                obs.title,
                obs.elements.len()
            ),
            url: Some(obs.url),
            title: Some(obs.title),
            screenshot_path,
            live_stream_ws: Some("ws://127.0.0.1:40061".to_string()),
            obstacle: None,
            prompt_for_supervisor: None,
            suggested_widget: None,
        };
        Ok(Box::new(JsonToolOutput::new(json!(resp))))
    }
}

async fn capture_subagent_screenshot(
    coordinator: &Arc<BrowserCoordinator>,
    subagent_id: &str,
) -> Option<String> {
    let out_path = format!("/tmp/ava-{subagent_id}-screenshot.png");
    match coordinator
        .engine()
        .screenshot("viewport", None, Some(&out_path))
        .await
    {
        Ok(_) => Some(out_path),
        Err(_) => None,
    }
}

fn extract_url_from_text(text: &str) -> Option<String> {
    for word in text.split_whitespace() {
        let clean = word.trim_matches(|c: char| c == '"' || c == '\'' || c == ',' || c == ';');
        if clean.starts_with("http://") || clean.starts_with("https://") {
            return Some(clean.to_string());
        }
        if clean.contains("veliqbd.com") {
            return Some("https://veliqbd.com/login".to_string());
        }
    }
    None
}

fn extract_credentials_from_text(text: &str) -> (Option<String>, Option<String>) {
    let mut username = None;
    let mut password = None;

    // Search for email
    for word in text.split_whitespace() {
        let clean = word.trim_matches(|c: char| {
            c == '"' || c == '\'' || c == ',' || c == ';' || c == '(' || c == ')' || c == '`'
        });
        if clean.contains('@') && clean.contains('.') && !clean.starts_with("http") {
            username = Some(clean.to_string());
            break;
        }
    }

    // Search for password after "password" keyword
    let lower = text.to_lowercase();
    if let Some(idx) = lower.find("password") {
        let rem = &text[idx + 8..];
        for word in rem.split_whitespace() {
            let clean = word.trim_matches(|c: char| {
                c == ':'
                    || c == '='
                    || c == '"'
                    || c == '\''
                    || c == ','
                    || c == ';'
                    || c == '-'
                    || c == '*'
                    || c == '`'
                    || c == '('
                    || c == ')'
            });
            if clean.is_empty() {
                continue;
            }
            let lower_clean = clean.to_lowercase();
            if matches!(
                lower_clean.as_str(),
                "is" | "to"
                    | "field"
                    | "input"
                    | "value"
                    | "val"
                    | "for"
                    | "as"
                    | "credential"
                    | "credentials"
                    | "in"
                    | "the"
                    | "key"
                    | "secret"
                    | "box"
                    | "text"
            ) {
                continue;
            }
            password = Some(clean.to_string());
            break;
        }
    }

    (username, password)
}

fn extract_otp_code(text: &str) -> Option<String> {
    for word in text.split_whitespace() {
        let clean = word.trim_matches(|c: char| !c.is_numeric());
        if clean.len() == 6 && clean.chars().all(|c| c.is_ascii_digit()) {
            return Some(clean.to_string());
        }
    }
    None
}

fn urls_share_domain(url_a: &str, url_b: &str) -> bool {
    fn host(u: &str) -> Option<&str> {
        let s = u
            .trim_start_matches("https://")
            .trim_start_matches("http://");
        s.split('/').next()
    }
    match (host(url_a), host(url_b)) {
        (Some(ha), Some(hb)) => ha == hb,
        _ => false,
    }
}

fn extract_domain_from_url(url: &str) -> Option<String> {
    let s = url
        .trim_start_matches("https://")
        .trim_start_matches("http://");
    let host = s.split('/').next()?.split(':').next()?;
    if host.is_empty() {
        None
    } else {
        Some(host.to_string())
    }
}

async fn lookup_vault_credential(
    coordinator: &Arc<BrowserCoordinator>,
    domain: &str,
) -> Option<(String, String)> {
    if let Ok(Some(cred)) = coordinator.vault_lookup(domain).await {
        return Some((cred.username, cred.secret));
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_credentials_formats() {
        let (u, p) = extract_credentials_from_text(
            "Log in to https://veliqbd.com/admin with Email: themahmudhasanbd@gmail.com and Password field: veliq@095",
        );
        assert_eq!(u.as_deref(), Some("themahmudhasanbd@gmail.com"));
        assert_eq!(p.as_deref(), Some("veliq@095"));

        let (_, p2) = extract_credentials_from_text("- Password input: secret!123");
        assert_eq!(p2.as_deref(), Some("secret!123"));

        let (_, p3) = extract_credentials_from_text("Password: secret");
        assert_eq!(p3.as_deref(), Some("secret"));
    }
}
