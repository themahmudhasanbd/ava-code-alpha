//! Authentication step UI and state transitions used by onboarding.
//!
//! This module owns the auth-step state machine (Google Antigravity & Custom Provider),
//! renders the corresponding UI, and handles auth-scoped keyboard input.

#![allow(clippy::unwrap_used)]

use codex_app_server_client::AppServerRequestHandle;
use codex_app_server_protocol::AccountLoginCompletedNotification;
use codex_app_server_protocol::AccountUpdatedNotification;
use codex_app_server_protocol::AuthMode as ApiAuthMode;
use codex_app_server_protocol::CancelLoginAccountParams;
use codex_app_server_protocol::ClientRequest;
use codex_login::AuthConfig;
use codex_protocol::auth::AuthMode;
use crossterm::event::KeyCode;
use crossterm::event::KeyEvent;
use crossterm::event::KeyEventKind;
use crossterm::event::KeyModifiers;
use ratatui::buffer::Buffer;
use ratatui::layout::Constraint;
use ratatui::layout::Layout;
use ratatui::layout::Rect;
use ratatui::prelude::Widget;
use ratatui::style::Color;
use ratatui::style::Modifier;
use ratatui::style::Style;
use ratatui::style::Stylize;
use ratatui::text::Line;
use ratatui::widgets::Block;
use ratatui::widgets::BorderType;
use ratatui::widgets::Borders;
use ratatui::widgets::Paragraph;
use ratatui::widgets::WidgetRef;
use ratatui::widgets::Wrap;

use std::cell::Cell;
use std::sync::Arc;
use std::sync::RwLock;
use uuid::Uuid;

use crate::LoginStatus;
use crate::key_hint::KeyBinding;
use crate::key_hint::KeyBindingListExt;
use crate::motion::MotionMode;
use crate::motion::shimmer_text;
use crate::onboarding::bedrock::BedrockState;
use crate::onboarding::keys;
use crate::onboarding::onboarding_screen::KeyboardHandler;
use crate::onboarding::onboarding_screen::StepStateProvider;
use crate::tui::FrameRequester;

use super::onboarding_screen::StepState;

pub(crate) const ANTIGRAVITY_CLIENT_ID: &str =
    "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
pub(crate) const ANTIGRAVITY_CLIENT_SECRET: &str = "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";
pub(crate) const ANTIGRAVITY_CALLBACK_PORT: u16 = 51121;
pub(crate) const ANTIGRAVITY_REDIRECT_URI: &str = "http://localhost:51121/callback";

/// Marks buffer cells that have cyan+underlined style as an OSC 8 hyperlink.
pub(crate) fn mark_url_hyperlink(buf: &mut Buffer, area: Rect, url: &str) {
    crate::terminal_hyperlinks::mark_url_hyperlink(buf, area, url);
}

/// Marks any underlined buffer cells as an OSC 8 hyperlink.
pub(crate) fn mark_underlined_hyperlink(buf: &mut Buffer, area: Rect, url: &str) {
    crate::terminal_hyperlinks::mark_underlined_hyperlink(buf, area, url);
}

#[derive(Clone)]
pub(crate) enum SignInState {
    PickMode,
    AntigravityOAuth(AntigravityOAuthState),
    AntigravityModelSelection(AntigravityModelSelectionState),
    CustomProviderEndpoint(CustomProviderEndpointState),
    CustomProviderApiKey(CustomProviderApiKeyState),
    CustomProviderModelSelection(CustomProviderModelSelectionState),
    SuccessMessage(String),
    Success,
    // Backward compatibility variants if referenced elsewhere
    ChatGptContinueInBrowser(ContinueInBrowserState),
    ChatGptDeviceCode(ContinueWithDeviceCodeState),
    ChatGptSuccessMessage,
    ChatGptSuccess,
    ApiKeyEntry(ApiKeyInputState),
    ApiKeyConfigured,
    Bedrock(BedrockState),
    BedrockConfigured,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum SignInOption {
    Antigravity,
    CustomProvider,
    #[allow(dead_code)]
    ChatGpt,
    #[allow(dead_code)]
    DeviceCode,
    #[allow(dead_code)]
    ApiKey,
    #[allow(dead_code)]
    Bedrock,
}

pub(super) fn onboarding_request_id() -> codex_app_server_protocol::RequestId {
    codex_app_server_protocol::RequestId::String(Uuid::new_v4().to_string())
}

pub(super) async fn cancel_login_attempt(
    request_handle: &AppServerRequestHandle,
    login_id: String,
) {
    let _ = request_handle
        .request_typed::<codex_app_server_protocol::CancelLoginAccountResponse>(
            ClientRequest::CancelLoginAccount {
                request_id: onboarding_request_id(),
                params: CancelLoginAccountParams { login_id },
            },
        )
        .await;
}

#[derive(Clone, Default)]
pub(crate) struct ApiKeyInputState {
    pub value: String,
    pub prepopulated_from_env: bool,
}

#[derive(Clone)]
pub(crate) struct ContinueInBrowserState {
    pub login_id: String,
    pub auth_url: String,
}

#[derive(Clone)]
pub(crate) struct ContinueWithDeviceCodeState {
    pub request_id: String,
    pub login_id: Option<String>,
    pub verification_url: Option<String>,
    pub user_code: Option<String>,
}

impl ContinueWithDeviceCodeState {
    pub(crate) fn login_id(&self) -> Option<&str> {
        self.login_id.as_deref()
    }
}

#[derive(Clone)]
pub(crate) struct AntigravityOAuthState {
    pub auth_url: String,
    pub state_token: String,
    pub manual_code_input: String,
    pub is_exchanging: bool,
}

#[derive(Clone)]
pub(crate) struct AntigravityModelSelectionState {
    pub models: Vec<String>,
    pub selected_index: usize,
    pub is_fetching: bool,
    pub error_msg: Option<String>,
}

#[derive(Clone)]
pub(crate) struct CustomProviderEndpointState {
    pub endpoint: String,
}

#[derive(Clone)]
pub(crate) struct CustomProviderApiKeyState {
    pub endpoint: String,
    pub api_key: String,
}

#[derive(Clone)]
pub(crate) struct CustomProviderModelSelectionState {
    pub endpoint: String,
    pub api_key: String,
    pub models: Vec<String>,
    pub selected_index: usize,
    pub custom_input: String,
    pub is_fetching: bool,
    pub error_msg: Option<String>,
}

#[derive(Clone)]
pub(crate) struct AuthModeWidget {
    pub request_frame: FrameRequester,
    pub highlighted_mode: SignInOption,
    pub error: Arc<RwLock<Option<String>>>,
    pub sign_in_state: Arc<RwLock<SignInState>>,
    pub login_status: LoginStatus,
    pub app_server_request_handle: AppServerRequestHandle,
    pub auth_config: AuthConfig,
    pub bedrock_setup_enabled: bool,
    pub animations_enabled: bool,
    pub animations_suppressed: Cell<bool>,
}

impl AuthModeWidget {
    pub(crate) fn set_animations_suppressed(&self, suppressed: bool) {
        self.animations_suppressed.set(suppressed);
    }

    pub(crate) fn should_suppress_animations(&self) -> bool {
        matches!(
            &*self.sign_in_state.read().unwrap(),
            SignInState::AntigravityOAuth(_) | SignInState::ChatGptContinueInBrowser(_)
        )
    }

    pub(crate) fn cancel_active_attempt(&self) {
        *self.sign_in_state.write().unwrap() = SignInState::PickMode;
        self.set_error(None);
        self.request_frame.schedule_frame();
    }

    fn set_error(&self, message: Option<String>) {
        *self.error.write().unwrap() = message;
    }

    fn error_message(&self) -> Option<String> {
        self.error.read().unwrap().clone()
    }

    pub(crate) fn is_text_entry_active(&self) -> bool {
        self.sign_in_state.read().is_ok_and(|guard| match &*guard {
            SignInState::AntigravityOAuth(_)
            | SignInState::CustomProviderEndpoint(_)
            | SignInState::CustomProviderApiKey(_)
            | SignInState::CustomProviderModelSelection(_)
            | SignInState::ApiKeyEntry(_) => true,
            _ => false,
        })
    }

    pub(crate) fn should_suppress_printable_quit(&self) -> bool {
        self.is_text_entry_active()
    }

    fn confirm_binding(&self) -> KeyBinding {
        keys::CONFIRM[0]
    }

    fn cancel_binding(&self) -> KeyBinding {
        keys::CANCEL[0]
    }

    fn displayed_sign_in_options(&self) -> Vec<SignInOption> {
        vec![SignInOption::Antigravity, SignInOption::CustomProvider]
    }

    fn selectable_sign_in_options(&self) -> Vec<SignInOption> {
        vec![SignInOption::Antigravity, SignInOption::CustomProvider]
    }

    fn move_highlight(&mut self, delta: isize) {
        let options = self.selectable_sign_in_options();
        if options.is_empty() {
            return;
        }

        let current_index = options
            .iter()
            .position(|option| *option == self.highlighted_mode)
            .unwrap_or(0);
        let next_index =
            (current_index as isize + delta).rem_euclid(options.len() as isize) as usize;
        self.highlighted_mode = options[next_index];
    }

    fn select_option_by_index(&mut self, index: usize) {
        let options = self.displayed_sign_in_options();
        if let Some(option) = options.get(index).copied() {
            self.handle_sign_in_option(option);
        }
    }

    fn handle_sign_in_option(&mut self, option: SignInOption) {
        match option {
            SignInOption::Antigravity | SignInOption::ChatGpt => {
                self.start_antigravity_login();
            }
            SignInOption::CustomProvider
            | SignInOption::ApiKey
            | SignInOption::DeviceCode
            | SignInOption::Bedrock => {
                self.start_custom_provider_setup();
            }
        }
    }

    fn start_antigravity_login(&mut self) {
        self.set_error(None);
        let state_token = Uuid::new_v4().to_string();
        let auth_url = format!(
            "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent&state={}",
            ANTIGRAVITY_CLIENT_ID,
            urlencoding::encode(ANTIGRAVITY_REDIRECT_URI),
            urlencoding::encode(
                "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/cclog https://www.googleapis.com/auth/experimentsandconfigs"
            ),
            state_token
        );

        let _ = webbrowser::open(&auth_url);

        let sign_in_state = self.sign_in_state.clone();
        let error = self.error.clone();
        let request_frame = self.request_frame.clone();

        *sign_in_state.write().unwrap() = SignInState::AntigravityOAuth(AntigravityOAuthState {
            auth_url: auth_url.clone(),
            state_token: state_token.clone(),
            manual_code_input: String::new(),
            is_exchanging: false,
        });
        request_frame.schedule_frame();

        // Spawn local HTTP server on port 51121 for callback
        tokio::spawn(async move {
            match tiny_http::Server::http(format!("127.0.0.1:{ANTIGRAVITY_CALLBACK_PORT}")) {
                Ok(server) => {
                    let (tx, mut rx) = tokio::sync::mpsc::channel::<Option<String>>(1);
                    std::thread::spawn(move || {
                        if let Ok(request) = server.recv() {
                            let url_str = format!("http://localhost{}", request.url());
                            let code = if let Ok(parsed) = url::Url::parse(&url_str) {
                                parsed
                                    .query_pairs()
                                    .find(|(k, _)| k == "code")
                                    .map(|(_, v)| v.to_string())
                            } else {
                                None
                            };

                            let html_response = r#"<!DOCTYPE html>
<html>
<head><title>AvA Code - Antigravity Auth</title></head>
<body style="background:#09090b;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;padding:40px;background:#18181b;border-radius:12px;border:1px solid #27272a;box-shadow:0 10px 30px rgba(0,0,0,0.5);max-width:480px;">
    <h2 style="color:#38bdf8;margin:0 0 12px 0;">✓ Google Antigravity Connected</h2>
    <p style="color:#a1a1aa;margin:0 0 16px 0;font-size:15px;">Successfully authenticated with Google Antigravity.</p>
    <p style="color:#71717a;font-size:13px;margin:0;">You can safely close this browser window and return to AvA Code.</p>
  </div>
</body>
</html>"#;
                            let response = tiny_http::Response::from_string(html_response)
                                .with_header(
                                    tiny_http::Header::from_bytes(
                                        &b"Content-Type"[..],
                                        &b"text/html; charset=utf-8"[..],
                                    )
                                    .unwrap(),
                                );
                            let _ = request.respond(response);
                            let _ = tx.blocking_send(code);
                        }
                    });

                    tokio::select! {
                        Some(Some(code)) = rx.recv() => {
                            Self::complete_antigravity_exchange(code, sign_in_state, error, request_frame).await;
                        }
                        _ = tokio::time::sleep(std::time::Duration::from_secs(300)) => {
                            tracing::warn!("Antigravity OAuth server timed out");
                        }
                    }
                }
                Err(err) => {
                    tracing::warn!(
                        "Could not bind Antigravity callback server on port {ANTIGRAVITY_CALLBACK_PORT}: {err}"
                    );
                }
            }
        });
    }

    async fn complete_antigravity_exchange(
        code: String,
        sign_in_state: Arc<RwLock<SignInState>>,
        error: Arc<RwLock<Option<String>>>,
        request_frame: FrameRequester,
    ) {
        {
            let mut guard = sign_in_state.write().unwrap();
            if let SignInState::AntigravityOAuth(ref mut state) = *guard {
                state.is_exchanging = true;
            }
        }
        request_frame.schedule_frame();

        let client = reqwest::Client::new();
        let params = [
            ("grant_type", "authorization_code"),
            ("code", code.trim()),
            ("client_id", ANTIGRAVITY_CLIENT_ID),
            ("client_secret", ANTIGRAVITY_CLIENT_SECRET),
            ("redirect_uri", ANTIGRAVITY_REDIRECT_URI),
        ];

        match client
            .post("https://oauth2.googleapis.com/token")
            .form(&params)
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    let access_token = json
                        .get("access_token")
                        .and_then(|v| v.as_str())
                        .unwrap_or_default()
                        .to_string();
                    let refresh_token = json
                        .get("refresh_token")
                        .and_then(|v| v.as_str())
                        .unwrap_or_default()
                        .to_string();

                    // Resolve Cloud Code PA project
                    let _ = client
                        .post("https://daily-cloudcode-pa.googleapis.com/v1internal:loadCodeAssist")
                        .header("Authorization", format!("Bearer {access_token}"))
                        .header("Content-Type", "application/json")
                        .header("User-Agent", "antigravity/ide/2.5.5 darwin/arm64")
                        .header("X-Goog-Api-Client", "gl-node/22.21.1")
                        .json(&serde_json::json!({
                            "metadata": { "ideType": "ANTIGRAVITY", "pluginType": "GEMINI" }
                        }))
                        .send()
                        .await;

                    // Fetch dynamically available models from Cloud Code PA
                    let mut models = vec![
                        "gemini-3.8-flash".to_string(),
                        "gemini-3.7-flash".to_string(),
                        "gemini-3.1-pro".to_string(),
                        "claude-3-7-sonnet".to_string(),
                        "claude-3-5-sonnet".to_string(),
                        "claude-opus-4".to_string(),
                        "gpt-oss-1".to_string(),
                    ];

                    if let Ok(models_resp) = client
                        .post("https://daily-cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels")
                        .header("Authorization", format!("Bearer {access_token}"))
                        .header("Content-Type", "application/json")
                        .header("User-Agent", "antigravity/ide/2.5.5 darwin/arm64")
                        .header("X-Goog-Api-Client", "gl-node/22.21.1")
                        .json(&serde_json::json!({ "project": "aicode-consumers" }))
                        .send()
                        .await
                    {
                        if let Ok(models_json) = models_resp.json::<serde_json::Value>().await {
                            if let Some(obj) = models_json.get("models").and_then(|m| m.as_object()) {
                                let dynamic: Vec<String> = obj.keys().cloned().collect();
                                if !dynamic.is_empty() {
                                    models = dynamic;
                                }
                            }
                        }
                    }

                    // Persist Antigravity auth
                    Self::persist_antigravity_credentials(&access_token, &refresh_token);

                    *sign_in_state.write().unwrap() =
                        SignInState::AntigravityModelSelection(AntigravityModelSelectionState {
                            models,
                            selected_index: 0,
                            is_fetching: false,
                            error_msg: None,
                        });
                    *error.write().unwrap() = None;
                } else {
                    *error.write().unwrap() =
                        Some("Failed to parse Google OAuth token response".to_string());
                }
            }
            Ok(resp) => {
                let text = resp.text().await.unwrap_or_default();
                *error.write().unwrap() = Some(format!("Google token exchange failed: {text}"));
            }
            Err(err) => {
                *error.write().unwrap() =
                    Some(format!("Network error exchanging Google code: {err}"));
            }
        }
        request_frame.schedule_frame();
    }

    fn persist_antigravity_credentials(access_token: &str, refresh_token: &str) {
        let auth_payload = serde_json::json!({
            "provider": "antigravity",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "ANTIGRAVITY_API_KEY": access_token,
            "OPENAI_API_KEY": access_token,
            "updated_at": chrono::Utc::now().to_rfc3339()
        });

        let toml_config = r#"model_provider = "antigravity"
model = "gemini-3.8-flash"
"#;

        if let Some(home) = dirs::home_dir() {
            for dir in [
                home.join(".ava-code"),
                home.join(".config").join("ava"),
                home.join(".codex"),
            ] {
                let _ = std::fs::create_dir_all(&dir);
                let _ = std::fs::write(
                    dir.join("auth.json"),
                    serde_json::to_string_pretty(&auth_payload).unwrap_or_default(),
                );
                let _ = std::fs::write(dir.join("config.toml"), toml_config);
            }
        }
    }

    fn persist_custom_provider_config(endpoint: &str, api_key: &str, model: &str) {
        let auth_payload = serde_json::json!({
            "provider": "custom",
            "base_url": endpoint,
            "api_key": api_key,
            "CUSTOM_API_KEY": api_key,
            "OPENAI_API_KEY": api_key,
            "model": model,
            "updated_at": chrono::Utc::now().to_rfc3339()
        });

        let toml_config = format!(
            r#"model_provider = "custom"
model = "{model}"

[model_providers.custom]
name = "Custom Provider"
base_url = "{endpoint}"
wire_api = "responses"
"#
        );

        if let Some(home) = dirs::home_dir() {
            for dir in [
                home.join(".ava-code"),
                home.join(".config").join("ava"),
                home.join(".codex"),
            ] {
                let _ = std::fs::create_dir_all(&dir);
                let _ = std::fs::write(
                    dir.join("auth.json"),
                    serde_json::to_string_pretty(&auth_payload).unwrap_or_default(),
                );
                let _ = std::fs::write(dir.join("config.toml"), &toml_config);
            }
        }
    }

    fn start_custom_provider_setup(&mut self) {
        self.set_error(None);
        *self.sign_in_state.write().unwrap() =
            SignInState::CustomProviderEndpoint(CustomProviderEndpointState {
                endpoint: "http://localhost:11434/v1".to_string(),
            });
        self.request_frame.schedule_frame();
    }

    fn fetch_custom_provider_models(
        endpoint: String,
        api_key: String,
        sign_in_state: Arc<RwLock<SignInState>>,
        error: Arc<RwLock<Option<String>>>,
        request_frame: FrameRequester,
    ) {
        let ep = endpoint.trim().trim_end_matches('/').to_string();
        let key = api_key.trim().to_string();

        *sign_in_state.write().unwrap() =
            SignInState::CustomProviderModelSelection(CustomProviderModelSelectionState {
                endpoint: ep.clone(),
                api_key: key.clone(),
                models: Vec::new(),
                selected_index: 0,
                custom_input: String::new(),
                is_fetching: true,
                error_msg: None,
            });
        request_frame.schedule_frame();

        tokio::spawn(async move {
            let client = reqwest::Client::new();
            let url = format!("{ep}/models");
            let mut req = client.get(&url);
            if !key.is_empty() {
                req = req.bearer_auth(&key);
            }

            let mut fetched_models = Vec::new();
            let mut fetch_err: Option<String> = None;

            match req.send().await {
                Ok(resp) if resp.status().is_success() => {
                    if let Ok(json) = resp.json::<serde_json::Value>().await {
                        if let Some(data) = json.get("data").and_then(|d| d.as_array()) {
                            for item in data {
                                if let Some(id) = item.get("id").and_then(|i| i.as_str()) {
                                    fetched_models.push(id.to_string());
                                }
                            }
                        } else if let Some(models) = json.get("models").and_then(|m| m.as_array()) {
                            for item in models {
                                if let Some(name) = item.get("name").and_then(|n| n.as_str()) {
                                    fetched_models.push(name.to_string());
                                }
                            }
                        }
                    }
                }
                Ok(resp) => {
                    fetch_err = Some(format!("HTTP {}: could not fetch /models", resp.status()));
                }
                Err(err) => {
                    fetch_err = Some(format!("Connection error: {err}"));
                }
            }

            if fetched_models.is_empty() {
                // Default fallback options if dynamic discovery returned none
                fetched_models = vec![
                    "gpt-4o".to_string(),
                    "gpt-4o-mini".to_string(),
                    "claude-3-5-sonnet-latest".to_string(),
                    "deepseek-coder".to_string(),
                    "llama3.2".to_string(),
                ];
            }

            let mut guard = sign_in_state.write().unwrap();
            *guard = SignInState::CustomProviderModelSelection(CustomProviderModelSelectionState {
                endpoint: ep,
                api_key: key,
                models: fetched_models,
                selected_index: 0,
                custom_input: String::new(),
                is_fetching: false,
                error_msg: fetch_err,
            });
            *error.write().unwrap() = None;
            drop(guard);
            request_frame.schedule_frame();
        });
    }

    fn render_pick_mode(&self, area: Rect, buf: &mut Buffer) {
        let mut lines: Vec<Line> = vec![
            Line::from(vec![
                "  ".into(),
                "Choose your AI model provider for AvA Code:".bold(),
            ]),
            Line::from(vec![
                "  ".into(),
                "Connect with Google Antigravity or configure a custom endpoint & API key".dim(),
            ]),
            "".into(),
        ];

        let create_mode_item = |idx: usize,
                                selected_mode: SignInOption,
                                text: &str,
                                description: &str|
         -> Vec<Line<'static>> {
            let is_selected = self.highlighted_mode == selected_mode;
            let caret = if is_selected { ">" } else { " " };

            let line1 = if is_selected {
                Line::from(vec![
                    format!("{caret} {index}. ", index = idx + 1).cyan().bold(),
                    text.to_string().cyan().bold(),
                ])
            } else {
                format!("  {index}. {text}", index = idx + 1).into()
            };

            let line2 = if is_selected {
                Line::from(format!("     {description}"))
                    .fg(Color::Cyan)
                    .add_modifier(Modifier::DIM)
            } else {
                Line::from(format!("     {description}"))
                    .style(Style::default().add_modifier(Modifier::DIM))
            };

            vec![line1, line2]
        };

        for (idx, option) in self.displayed_sign_in_options().into_iter().enumerate() {
            match option {
                SignInOption::Antigravity | SignInOption::ChatGpt => {
                    lines.extend(create_mode_item(
                        idx,
                        option,
                        "Google Antigravity (Gemini & Claude)",
                        "Sign in with Google OAuth (Gemini 3.8/3.7 Flash, Pro, Claude Sonnet/Opus, GPT-OSS)",
                    ));
                }
                SignInOption::CustomProvider
                | SignInOption::ApiKey
                | SignInOption::DeviceCode
                | SignInOption::Bedrock => {
                    lines.extend(create_mode_item(
                        idx,
                        option,
                        "Custom Provider (Endpoint & API Key)",
                        "Connect to Ollama, LM Studio, OpenRouter, DeepSeek, or any OpenAI-compatible endpoint",
                    ));
                }
            }
            lines.push("".into());
        }

        lines.push(Line::from(vec![
            "  Use ".dim(),
            "↑/↓".cyan(),
            " or ".dim(),
            "1/2".cyan(),
            " to select, press ".dim(),
            self.confirm_binding().into(),
            " to continue".dim(),
        ]));

        if let Some(err) = self.error_message() {
            lines.push("".into());
            lines.push(err.red().into());
        }

        Paragraph::new(lines)
            .wrap(Wrap { trim: false })
            .render(area, buf);
    }

    fn render_antigravity_oauth(
        &self,
        area: Rect,
        buf: &mut Buffer,
        state: &AntigravityOAuthState,
    ) {
        let mut spans = vec!["  ".into()];
        if state.is_exchanging {
            spans.extend(shimmer_text(
                "Authenticating with Google Antigravity and discovering models...",
                MotionMode::Animated,
            ));
        } else if self.animations_enabled && !self.animations_suppressed.get() {
            self.request_frame
                .schedule_frame_in(std::time::Duration::from_millis(100));
            spans.extend(shimmer_text(
                "Finish signing in via your browser",
                MotionMode::Animated,
            ));
        } else {
            spans.push("Finish signing in via your browser".into());
        }

        let mut lines = vec![
            spans.into(),
            "".into(),
            "  A browser window should open automatically to Google sign-in.".into(),
            "  If it didn't open, copy and open this URL in your browser:".into(),
            "".into(),
            Line::from(vec![
                "  ".into(),
                state.auth_url.as_str().cyan().underlined(),
            ]),
            "".into(),
            "  On a headless or remote server? Paste the authorization code below:"
                .dim()
                .into(),
            "".into(),
        ];

        let input_display = if state.manual_code_input.is_empty() {
            Line::from("Paste authorization code or full callback URL here".dim())
        } else {
            Line::from(state.manual_code_input.clone())
        };

        let [top_area, input_area, bottom_area] = Layout::vertical([
            Constraint::Length(lines.len() as u16),
            Constraint::Length(3),
            Constraint::Min(2),
        ])
        .areas(area);

        Paragraph::new(lines)
            .wrap(Wrap { trim: false })
            .render(top_area, buf);

        Paragraph::new(input_display)
            .wrap(Wrap { trim: false })
            .block(
                Block::default()
                    .title("Authorization Code")
                    .borders(Borders::ALL)
                    .border_type(BorderType::Rounded)
                    .border_style(Style::default().fg(Color::Cyan)),
            )
            .render(input_area, buf);

        let mut footer = vec![Line::from(vec![
            "  Press ".dim(),
            self.confirm_binding().into(),
            " to submit code, ".dim(),
            self.cancel_binding().into(),
            " to go back".dim(),
        ])];
        if let Some(err) = self.error_message() {
            footer.push("".into());
            footer.push(err.red().into());
        }
        Paragraph::new(footer)
            .wrap(Wrap { trim: false })
            .render(bottom_area, buf);

        mark_url_hyperlink(buf, top_area, &state.auth_url);
    }

    fn render_antigravity_model_selection(
        &self,
        area: Rect,
        buf: &mut Buffer,
        state: &AntigravityModelSelectionState,
    ) {
        let mut lines: Vec<Line> = vec![
            Line::from(vec![
                "✓ ".green().bold(),
                "Google Antigravity Connected!".bold(),
            ]),
            "".into(),
            "  Select your default model for this workspace:".into(),
            "".into(),
        ];

        for (idx, model) in state.models.iter().enumerate() {
            let is_selected = idx == state.selected_index;
            let caret = if is_selected { ">" } else { " " };
            if is_selected {
                lines.push(Line::from(vec![
                    format!("{caret} {model}").cyan().bold(),
                    " (Default)".dim(),
                ]));
            } else {
                lines.push(Line::from(format!("  {model}")).dim());
            }
        }

        lines.push("".into());
        lines.push(Line::from(vec![
            "  Use ".dim(),
            "↑/↓".cyan(),
            " to select, press ".dim(),
            self.confirm_binding().into(),
            " to confirm".dim(),
        ]));

        Paragraph::new(lines)
            .wrap(Wrap { trim: false })
            .render(area, buf);
    }

    fn render_custom_endpoint(
        &self,
        area: Rect,
        buf: &mut Buffer,
        state: &CustomProviderEndpointState,
    ) {
        let [intro_area, input_area, footer_area] = Layout::vertical([
            Constraint::Length(5),
            Constraint::Length(3),
            Constraint::Min(2),
        ])
        .areas(area);

        let intro_lines = vec![
            Line::from(vec!["> ".into(), "Custom Provider: Base URL / Endpoint".bold()]),
            "".into(),
            "  Enter your OpenAI-compatible endpoint URL:".into(),
            "  (e.g., http://localhost:11434/v1, https://openrouter.ai/api/v1, https://api.openai.com/v1)".dim().into(),
        ];
        Paragraph::new(intro_lines).render(intro_area, buf);

        let content = if state.endpoint.is_empty() {
            Line::from("http://localhost:11434/v1".dim())
        } else {
            Line::from(state.endpoint.clone())
        };

        Paragraph::new(content)
            .block(
                Block::default()
                    .title("Endpoint URL")
                    .borders(Borders::ALL)
                    .border_type(BorderType::Rounded)
                    .border_style(Style::default().fg(Color::Cyan)),
            )
            .render(input_area, buf);

        let footer = vec![Line::from(vec![
            "  Press ".dim(),
            self.confirm_binding().into(),
            " to continue, ".dim(),
            self.cancel_binding().into(),
            " to go back".dim(),
        ])];
        Paragraph::new(footer).render(footer_area, buf);
    }

    fn render_custom_api_key(
        &self,
        area: Rect,
        buf: &mut Buffer,
        state: &CustomProviderApiKeyState,
    ) {
        let [intro_area, input_area, footer_area] = Layout::vertical([
            Constraint::Length(5),
            Constraint::Length(3),
            Constraint::Min(2),
        ])
        .areas(area);

        let intro_lines = vec![
            Line::from(vec!["> ".into(), "Custom Provider: API Key".bold()]),
            "".into(),
            "  Enter your API Key (leave empty if your local endpoint does not require authentication):".into(),
            format!("  Target Endpoint: {}", state.endpoint).dim().into(),
        ];
        Paragraph::new(intro_lines).render(intro_area, buf);

        let content = if state.api_key.is_empty() {
            Line::from("Paste or type API key (optional)".dim())
        } else {
            Line::from(state.api_key.clone())
        };

        Paragraph::new(content)
            .block(
                Block::default()
                    .title("API Key")
                    .borders(Borders::ALL)
                    .border_type(BorderType::Rounded)
                    .border_style(Style::default().fg(Color::Cyan)),
            )
            .render(input_area, buf);

        let footer = vec![Line::from(vec![
            "  Press ".dim(),
            self.confirm_binding().into(),
            " to load models, ".dim(),
            self.cancel_binding().into(),
            " to go back".dim(),
        ])];
        Paragraph::new(footer).render(footer_area, buf);
    }

    fn render_custom_model_selection(
        &self,
        area: Rect,
        buf: &mut Buffer,
        state: &CustomProviderModelSelectionState,
    ) {
        let mut lines: Vec<Line> = vec![
            Line::from(vec!["> ".into(), "Select Model from Provider".bold()]),
            format!("  Endpoint: {}", state.endpoint).dim().into(),
            "".into(),
        ];

        if state.is_fetching {
            lines.push(Line::from(
                "  Fetching available models from endpoint...".cyan(),
            ));
        } else {
            lines.push("  Dynamically loaded models:".into());
            lines.push("".into());

            for (idx, model) in state.models.iter().enumerate() {
                let is_selected = idx == state.selected_index;
                let caret = if is_selected { ">" } else { " " };
                if is_selected {
                    lines.push(Line::from(format!("{caret} {model}").cyan().bold()));
                } else {
                    lines.push(Line::from(format!("  {model}")).dim());
                }
            }

            if let Some(ref err) = state.error_msg {
                lines.push("".into());
                lines.push(Line::from(format!("  Notice: {err}")).yellow());
            }

            lines.push("".into());
            lines.push(Line::from(vec![
                "  Use ".dim(),
                "↑/↓".cyan(),
                " to select, press ".dim(),
                self.confirm_binding().into(),
                " to finish".dim(),
            ]));
        }

        Paragraph::new(lines)
            .wrap(Wrap { trim: false })
            .render(area, buf);
    }

    fn render_success_message(&self, area: Rect, buf: &mut Buffer, msg: &str) {
        let lines = vec![
            Line::from(vec!["✓ ".green().bold(), msg.green().bold()]),
            "".into(),
            Line::from("  AvA Code is fully configured and ready to build.").into(),
            "".into(),
            Line::from(vec![
                "  Press ".cyan(),
                self.confirm_binding().into(),
                " to enter workspace".cyan(),
            ]),
        ];

        Paragraph::new(lines)
            .wrap(Wrap { trim: false })
            .render(area, buf);
    }

    pub(crate) fn on_account_login_completed(
        &mut self,
        _notification: AccountLoginCompletedNotification,
    ) {
    }

    pub(crate) fn on_account_updated(&mut self, notification: AccountUpdatedNotification) {
        self.login_status = notification
            .auth_mode
            .map(|auth_mode| {
                LoginStatus::AuthMode(match auth_mode {
                    ApiAuthMode::ApiKey => AuthMode::ApiKey,
                    ApiAuthMode::Chatgpt => AuthMode::Chatgpt,
                    ApiAuthMode::ChatgptAuthTokens => AuthMode::ChatgptAuthTokens,
                    ApiAuthMode::Headers => AuthMode::Headers,
                    ApiAuthMode::AgentIdentity => AuthMode::AgentIdentity,
                    ApiAuthMode::PersonalAccessToken => AuthMode::PersonalAccessToken,
                    ApiAuthMode::BedrockApiKey => AuthMode::BedrockApiKey,
                    ApiAuthMode::BedrockAccessKeys => AuthMode::BedrockAccessKeys,
                })
            })
            .unwrap_or(LoginStatus::NotAuthenticated);
    }
}

impl KeyboardHandler for AuthModeWidget {
    fn handle_key_event(&mut self, key_event: KeyEvent) {
        let sign_in_state = { (*self.sign_in_state.read().unwrap()).clone() };

        match sign_in_state {
            SignInState::PickMode => {
                if keys::MOVE_UP.is_pressed(key_event) {
                    self.move_highlight(-1);
                    self.request_frame.schedule_frame();
                    return;
                }
                if keys::MOVE_DOWN.is_pressed(key_event) {
                    self.move_highlight(1);
                    self.request_frame.schedule_frame();
                    return;
                }
                if keys::SELECT_FIRST.is_pressed(key_event) {
                    self.select_option_by_index(0);
                    return;
                }
                if keys::SELECT_SECOND.is_pressed(key_event) {
                    self.select_option_by_index(1);
                    return;
                }
                if keys::CONFIRM.is_pressed(key_event) {
                    self.handle_sign_in_option(self.highlighted_mode);
                    return;
                }
            }
            SignInState::AntigravityOAuth(mut state) => {
                if keys::CANCEL.is_pressed(key_event) {
                    *self.sign_in_state.write().unwrap() = SignInState::PickMode;
                    self.set_error(None);
                    self.request_frame.schedule_frame();
                    return;
                }
                if keys::CONFIRM.is_pressed(key_event) {
                    let code = state.manual_code_input.trim().to_string();
                    if !code.is_empty() {
                        let sign_in_state = self.sign_in_state.clone();
                        let error = self.error.clone();
                        let request_frame = self.request_frame.clone();
                        tokio::spawn(async move {
                            Self::complete_antigravity_exchange(
                                code,
                                sign_in_state,
                                error,
                                request_frame,
                            )
                            .await;
                        });
                    }
                    return;
                }
                match key_event.code {
                    KeyCode::Backspace => {
                        state.manual_code_input.pop();
                        *self.sign_in_state.write().unwrap() = SignInState::AntigravityOAuth(state);
                        self.request_frame.schedule_frame();
                    }
                    KeyCode::Char(c)
                        if key_event.kind == KeyEventKind::Press
                            && !key_event.modifiers.contains(KeyModifiers::SUPER)
                            && !key_event.modifiers.contains(KeyModifiers::CONTROL)
                            && !key_event.modifiers.contains(KeyModifiers::ALT) =>
                    {
                        state.manual_code_input.push(c);
                        *self.sign_in_state.write().unwrap() = SignInState::AntigravityOAuth(state);
                        self.request_frame.schedule_frame();
                    }
                    _ => {}
                }
            }
            SignInState::AntigravityModelSelection(mut state) => {
                if keys::MOVE_UP.is_pressed(key_event) {
                    if state.selected_index > 0 {
                        state.selected_index -= 1;
                        *self.sign_in_state.write().unwrap() =
                            SignInState::AntigravityModelSelection(state);
                        self.request_frame.schedule_frame();
                    }
                    return;
                }
                if keys::MOVE_DOWN.is_pressed(key_event) {
                    if state.selected_index + 1 < state.models.len() {
                        state.selected_index += 1;
                        *self.sign_in_state.write().unwrap() =
                            SignInState::AntigravityModelSelection(state);
                        self.request_frame.schedule_frame();
                    }
                    return;
                }
                if keys::CONFIRM.is_pressed(key_event) {
                    let selected_model = state
                        .models
                        .get(state.selected_index)
                        .cloned()
                        .unwrap_or_else(|| "gemini-3.8-flash".to_string());
                    *self.sign_in_state.write().unwrap() = SignInState::SuccessMessage(format!(
                        "Authenticated with Google Antigravity (Default model: {selected_model})"
                    ));
                    self.request_frame.schedule_frame();
                    return;
                }
            }
            SignInState::CustomProviderEndpoint(mut state) => {
                if keys::CANCEL.is_pressed(key_event) {
                    *self.sign_in_state.write().unwrap() = SignInState::PickMode;
                    self.request_frame.schedule_frame();
                    return;
                }
                if keys::CONFIRM.is_pressed(key_event) {
                    let endpoint = if state.endpoint.trim().is_empty() {
                        "http://localhost:11434/v1".to_string()
                    } else {
                        state.endpoint.trim().to_string()
                    };
                    *self.sign_in_state.write().unwrap() =
                        SignInState::CustomProviderApiKey(CustomProviderApiKeyState {
                            endpoint,
                            api_key: String::new(),
                        });
                    self.request_frame.schedule_frame();
                    return;
                }
                match key_event.code {
                    KeyCode::Backspace => {
                        state.endpoint.pop();
                        *self.sign_in_state.write().unwrap() =
                            SignInState::CustomProviderEndpoint(state);
                        self.request_frame.schedule_frame();
                    }
                    KeyCode::Char(c)
                        if key_event.kind == KeyEventKind::Press
                            && !key_event.modifiers.contains(KeyModifiers::SUPER)
                            && !key_event.modifiers.contains(KeyModifiers::CONTROL)
                            && !key_event.modifiers.contains(KeyModifiers::ALT) =>
                    {
                        state.endpoint.push(c);
                        *self.sign_in_state.write().unwrap() =
                            SignInState::CustomProviderEndpoint(state);
                        self.request_frame.schedule_frame();
                    }
                    _ => {}
                }
            }
            SignInState::CustomProviderApiKey(mut state) => {
                if keys::CANCEL.is_pressed(key_event) {
                    *self.sign_in_state.write().unwrap() =
                        SignInState::CustomProviderEndpoint(CustomProviderEndpointState {
                            endpoint: state.endpoint,
                        });
                    self.request_frame.schedule_frame();
                    return;
                }
                if keys::CONFIRM.is_pressed(key_event) {
                    Self::fetch_custom_provider_models(
                        state.endpoint,
                        state.api_key,
                        self.sign_in_state.clone(),
                        self.error.clone(),
                        self.request_frame.clone(),
                    );
                    return;
                }
                match key_event.code {
                    KeyCode::Backspace => {
                        state.api_key.pop();
                        *self.sign_in_state.write().unwrap() =
                            SignInState::CustomProviderApiKey(state);
                        self.request_frame.schedule_frame();
                    }
                    KeyCode::Char(c)
                        if key_event.kind == KeyEventKind::Press
                            && !key_event.modifiers.contains(KeyModifiers::SUPER)
                            && !key_event.modifiers.contains(KeyModifiers::CONTROL)
                            && !key_event.modifiers.contains(KeyModifiers::ALT) =>
                    {
                        state.api_key.push(c);
                        *self.sign_in_state.write().unwrap() =
                            SignInState::CustomProviderApiKey(state);
                        self.request_frame.schedule_frame();
                    }
                    _ => {}
                }
            }
            SignInState::CustomProviderModelSelection(mut state) => {
                if keys::CANCEL.is_pressed(key_event) {
                    *self.sign_in_state.write().unwrap() =
                        SignInState::CustomProviderApiKey(CustomProviderApiKeyState {
                            endpoint: state.endpoint,
                            api_key: state.api_key,
                        });
                    self.request_frame.schedule_frame();
                    return;
                }
                if keys::MOVE_UP.is_pressed(key_event) {
                    if state.selected_index > 0 {
                        state.selected_index -= 1;
                        *self.sign_in_state.write().unwrap() =
                            SignInState::CustomProviderModelSelection(state);
                        self.request_frame.schedule_frame();
                    }
                    return;
                }
                if keys::MOVE_DOWN.is_pressed(key_event) {
                    if state.selected_index + 1 < state.models.len() {
                        state.selected_index += 1;
                        *self.sign_in_state.write().unwrap() =
                            SignInState::CustomProviderModelSelection(state);
                        self.request_frame.schedule_frame();
                    }
                    return;
                }
                if keys::CONFIRM.is_pressed(key_event) {
                    let selected_model = state
                        .models
                        .get(state.selected_index)
                        .cloned()
                        .unwrap_or_else(|| "default".to_string());
                    Self::persist_custom_provider_config(
                        &state.endpoint,
                        &state.api_key,
                        &selected_model,
                    );
                    *self.sign_in_state.write().unwrap() = SignInState::SuccessMessage(format!(
                        "Custom Provider Connected (Model: {selected_model})"
                    ));
                    self.request_frame.schedule_frame();
                    return;
                }
            }
            SignInState::SuccessMessage(_) => {
                if keys::CONFIRM.is_pressed(key_event) {
                    *self.sign_in_state.write().unwrap() = SignInState::Success;
                    self.request_frame.schedule_frame();
                }
            }
            _ => {}
        }
    }

    fn handle_paste(&mut self, pasted: String) {
        let trimmed = pasted.trim().to_string();
        let mut guard = self.sign_in_state.write().unwrap();
        match &mut *guard {
            SignInState::AntigravityOAuth(state) => {
                state.manual_code_input = trimmed;
            }
            SignInState::CustomProviderEndpoint(state) => {
                state.endpoint = trimmed;
            }
            SignInState::CustomProviderApiKey(state) => {
                state.api_key = trimmed;
            }
            _ => {}
        }
        drop(guard);
        self.request_frame.schedule_frame();
    }
}

impl StepStateProvider for AuthModeWidget {
    fn get_step_state(&self) -> StepState {
        let sign_in_state = self.sign_in_state.read().unwrap();
        match &*sign_in_state {
            SignInState::PickMode
            | SignInState::AntigravityOAuth(_)
            | SignInState::AntigravityModelSelection(_)
            | SignInState::CustomProviderEndpoint(_)
            | SignInState::CustomProviderApiKey(_)
            | SignInState::CustomProviderModelSelection(_)
            | SignInState::SuccessMessage(_)
            | SignInState::ChatGptContinueInBrowser(_)
            | SignInState::ChatGptDeviceCode(_)
            | SignInState::ChatGptSuccessMessage
            | SignInState::ApiKeyEntry(_)
            | SignInState::Bedrock(_) => StepState::InProgress,

            SignInState::Success
            | SignInState::ChatGptSuccess
            | SignInState::ApiKeyConfigured
            | SignInState::BedrockConfigured => StepState::Complete,
        }
    }
}

impl WidgetRef for AuthModeWidget {
    fn render_ref(&self, area: Rect, buf: &mut Buffer) {
        let sign_in_state = self.sign_in_state.read().unwrap();
        match &*sign_in_state {
            SignInState::PickMode => {
                self.render_pick_mode(area, buf);
            }
            SignInState::AntigravityOAuth(state) => {
                self.render_antigravity_oauth(area, buf, state);
            }
            SignInState::AntigravityModelSelection(state) => {
                self.render_antigravity_model_selection(area, buf, state);
            }
            SignInState::CustomProviderEndpoint(state) => {
                self.render_custom_endpoint(area, buf, state);
            }
            SignInState::CustomProviderApiKey(state) => {
                self.render_custom_api_key(area, buf, state);
            }
            SignInState::CustomProviderModelSelection(state) => {
                self.render_custom_model_selection(area, buf, state);
            }
            SignInState::SuccessMessage(msg) => {
                self.render_success_message(area, buf, msg);
            }
            _ => {
                self.render_pick_mode(area, buf);
            }
        }
    }
}
