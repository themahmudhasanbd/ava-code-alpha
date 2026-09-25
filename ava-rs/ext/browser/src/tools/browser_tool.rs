use std::sync::Arc;

use codex_extension_api::FunctionCallError;
use codex_extension_api::JsonToolOutput;
use codex_extension_api::ResponsesApiTool;
use codex_extension_api::ToolCall;
use codex_extension_api::ToolExecutor;
use codex_extension_api::ToolName;
use codex_extension_api::ToolSpec;
use codex_extension_api::parse_tool_input_schema;
use codex_otel::MetricsClient;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::actions::{ActionDispatcher, ActionResult};
use crate::coordinator::BrowserCoordinator;
use crate::schema;

pub const BROWSER_TOOL_NAME: &str = "browser";

#[derive(Debug, Clone, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct BrowserArgs {
    /// Action to perform: 'open', 'login', 'observe', 'click', 'fill', 'fill_form', 'scroll', 'wait', 'viewport', 'screenshot', 'responsive_audit', 'scrape_data', 'scrape_source', 'scrape_content', 'scrape_links', 'scrape_images', 'evaluate_js', 'console_errors', 'state', 'clear_session', 'close'.
    pub action: String,
    /// Target URL to navigate to (for 'open' and 'login').
    pub url: Option<String>,
    /// Username or email credential (for action='login').
    pub username: Option<String>,
    /// Password credential (for action='login').
    pub password: Option<String>,
    /// Optional custom CSS selector for the login submit button.
    pub submit_selector: Option<String>,
    /// Optional selector/text to verify successful authentication post-login.
    pub post_login_check: Option<String>,
    /// Semantic element ref (e.g. 'e1', 'e2') or CSS selector to click or fill.
    pub r#ref: Option<String>,
    /// Direct CSS selector to target (alternative to 'ref').
    pub selector: Option<String>,
    /// Value to fill or type into an input element.
    pub value: Option<String>,
    /// Batch form fields array of {ref, value} for action='fill_form'.
    pub fields: Option<Vec<FormFieldArg>>,
    /// Optional submit button ref/selector to click after filling form fields.
    pub submit_ref: Option<String>,
    /// Direction to scroll ('up', 'down', 'left', 'right', 'top', 'bottom'). Default: 'down'.
    pub direction: Option<String>,
    /// Pixel distance to scroll (default: 500).
    pub amount: Option<i64>,
    /// Wait duration in seconds (default: 1.0).
    pub seconds: Option<f64>,
    /// Viewport profile ('desktop', 'laptop', 'tablet', 'mobile', or 'WIDTHxHEIGHT').
    pub viewport: Option<String>,
    /// Viewport alias ('profile').
    pub profile: Option<String>,
    /// Screenshot clip mode ('viewport', 'full_page', or 'element').
    pub clip_type: Option<String>,
    /// Screenshot mode alias ('mode').
    pub mode: Option<String>,
    /// Diff-only mode for observe (returns only changes since last observation).
    pub diff_only: Option<bool>,
    /// Visual mode for observe (also captures viewport screenshot).
    pub visual: Option<bool>,
    /// Task intent / user goal (for action='open' contextual focus).
    pub task_intent: Option<String>,
    /// Selector to wait for after opening URL.
    pub wait_for: Option<String>,
    /// Scrape container selector (for scrape actions).
    pub container: Option<String>,
    /// Map of field names to CSS selectors for structured scraping.
    pub scrape_fields: Option<std::collections::HashMap<String, String>>,
    /// JavaScript code string to execute in page context.
    pub code: Option<String>,
    /// JavaScript code alias ('script').
    pub script: Option<String>,
    /// Whether to wait for navigation completion after click (default: true).
    pub wait_for_navigation: Option<bool>,
}

#[derive(Debug, Clone, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct FormFieldArg {
    pub r#ref: Option<String>,
    pub selector: Option<String>,
    pub value: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, JsonSchema)]
#[schemars(deny_unknown_fields)]
pub struct BrowserResponse {
    pub success: bool,
    pub title: String,
    pub output: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Value>,
}

impl From<ActionResult> for BrowserResponse {
    fn from(r: ActionResult) -> Self {
        Self {
            success: r.success,
            title: r.title,
            output: r.output,
            url: r.url,
            metadata: r.metadata,
        }
    }
}

#[derive(Clone)]
pub struct BrowserTool {
    coordinator: Arc<BrowserCoordinator>,
    #[allow(dead_code)]
    metrics_client: Option<MetricsClient>,
}

impl BrowserTool {
    pub fn new(
        coordinator: Arc<BrowserCoordinator>,
        metrics_client: Option<MetricsClient>,
    ) -> Self {
        Self {
            coordinator,
            metrics_client,
        }
    }
}

impl<'call> ToolExecutor<ToolCall<'call>> for BrowserTool {
    fn tool_name(&self) -> ToolName {
        ToolName::plain(BROWSER_TOOL_NAME)
    }

    fn spec(&self) -> ToolSpec {
        let tool = ResponsesApiTool {
            name: BROWSER_TOOL_NAME.to_string(),
            description: r#"Advanced native browser automation with observe→reason→act→verify loop enforcement.

Supported Actions:
- 'open': Navigate to URL with optional viewport and task intent. Automatically inspects DOM and verifies page indicators.
- 'login': Atomic credential login helper. Auto-detects input fields, fills username/password, submits, and verifies outcomes.
- 'observe': Scan DOM and assign semantic refs ('e1', 'e2'...) to interactive elements. Supports 'diff_only' and visual screenshots.
- 'click': Click element by semantic ref ('e1', 'e2') or CSS selector. Automatically verifies navigation and checks error banners.
- 'fill': Type value into input/select/textarea by semantic ref or selector. Triggers standard DOM events.
- 'fill_form': Batch form filling with JSON array of {ref, value} and optional 'submit_ref' button.
- 'scroll': Scroll in direction ('up', 'down', 'top', 'bottom', 'left', 'right') by pixel amount.
- 'wait': Pause execution for specified duration in seconds to let asynchronous DOM updates settle.
- 'viewport': Switch viewport profile ('desktop': 1920x1080, 'laptop': 1440x900, 'tablet': 768x1024, 'mobile': 375x812, or 'WxH').
- 'screenshot': Capture high-resolution PNG screenshot ('viewport', 'full_page', or 'element').
- 'responsive_audit': Run automated multi-viewport layout audit across desktop, tablet, and mobile. Detects horizontal overflow layout shift bugs, lists culprit DOM elements with pixel widths, and captures screenshots.
- 'scrape_data': Extract structured tabular data matching container selector and field selectors map.
- 'scrape_source': Get raw outer HTML of page or specific container element.
- 'scrape_content': Extract clean visible text content / markdown with scripts and hidden elements stripped.
- 'scrape_links': Extract all anchor links ('text', 'href', 'title') with optional container filter.
- 'scrape_images': Extract all images ('src', 'alt', 'width', 'height') with optional container filter.
- 'evaluate_js': Run arbitrary JavaScript in page context and return result as formatted JSON.
- 'console_errors': Retrieve all real-time captured JavaScript console errors and uncaught exceptions.
- 'state': Get complete page state including current URL, title, login cookie status, navigation history, and console errors.
- 'clear_session': Clear persistent cookies, localStorage, sessionStorage, and browser state.
- 'close': Cleanly close page and terminate browser process.
"#
            .to_string(),
            strict: false,
            defer_loading: None,
            parameters: parse_tool_input_schema(&schema::input_schema_for::<BrowserArgs>())
                .unwrap_or_else(|err| {
                    panic!("generated input schema for {BROWSER_TOOL_NAME} should parse: {err}")
                }),
            output_schema: Some(schema::output_schema_for::<BrowserResponse>().into()),
        };

        ToolSpec::Function(tool)
    }

    fn handle<'a>(&'a self, call: ToolCall<'call>) -> codex_extension_api::ToolExecutorFuture<'a>
    where
        'call: 'a,
    {
        Box::pin(self.handle_call(call))
    }
}

impl BrowserTool {
    async fn handle_call(
        &self,
        call: ToolCall<'_>,
    ) -> Result<Box<dyn codex_extension_api::ToolOutput>, FunctionCallError> {
        let args_str = call.function_arguments()?;
        let args_val: Value = serde_json::from_str(args_str).map_err(|e| {
            FunctionCallError::RespondToModel(format!("Invalid arguments JSON: {e}"))
        })?;

        let action = args_val
            .get("action")
            .and_then(Value::as_str)
            .ok_or_else(|| {
                FunctionCallError::RespondToModel("Missing required parameter 'action'".to_string())
            })?;

        let result = ActionDispatcher::dispatch(&self.coordinator, action, &args_val)
            .await
            .map_err(FunctionCallError::RespondToModel)?;

        let response = BrowserResponse::from(result);
        Ok(Box::new(JsonToolOutput::new(json!(response))))
    }
}
