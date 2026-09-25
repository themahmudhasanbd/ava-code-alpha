use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use codex_config::types::BrowserConfig;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tokio::sync::{Mutex, RwLock};
use tokio::time::sleep;

use crate::cdp::{CdpClient, ChromeProcess};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ViewportProfile {
    Desktop,
    Laptop,
    Tablet,
    Mobile,
}

impl ViewportProfile {
    pub fn dimensions(&self) -> (u32, u32) {
        match self {
            Self::Desktop => (1920, 1080),
            Self::Laptop => (1440, 900),
            Self::Tablet => (768, 1024),
            Self::Mobile => (375, 812),
        }
    }

    pub fn is_mobile(&self) -> bool {
        matches!(self, Self::Mobile)
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "desktop" => Some(Self::Desktop),
            "laptop" => Some(Self::Laptop),
            "tablet" => Some(Self::Tablet),
            "mobile" => Some(Self::Mobile),
            _ => None,
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            Self::Desktop => "desktop",
            Self::Laptop => "laptop",
            Self::Tablet => "tablet",
            Self::Mobile => "mobile",
        }
    }
}

pub fn parse_viewport_string(s: &str) -> (u32, u32, bool) {
    if let Some(profile) = ViewportProfile::parse(s) {
        let (w, h) = profile.dimensions();
        return (w, h, profile.is_mobile());
    }

    if let Some((w_str, h_str)) = s.split_once('x') {
        if let (Ok(w), Ok(h)) = (w_str.trim().parse::<u32>(), h_str.trim().parse::<u32>()) {
            let is_mobile = w <= 480;
            return (w, h, is_mobile);
        }
    }

    let (w, h) = ViewportProfile::Desktop.dimensions();
    (w, h, false)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticRef {
    pub r#ref: String,
    pub tag: String,
    pub role: Option<String>,
    pub text: String,
    pub selector: String,
    pub is_input: bool,
    pub input_type: Option<String>,
    pub placeholder: Option<String>,
    pub href: Option<String>,
    pub aria_label: Option<String>,
    pub name: Option<String>,
    pub id: Option<String>,
    pub value: Option<String>,
    pub bounds: Option<Vec<f64>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageState {
    pub url: String,
    pub title: String,
    pub history: Vec<String>,
    pub is_logged_in: bool,
    pub last_observed_at: u64,
    pub console_errors: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PageIndicators {
    pub has_error_banner: bool,
    pub has_success_message: bool,
    pub has_validation_errors: bool,
    pub is_loading: bool,
    pub error_texts: Vec<String>,
    pub success_texts: Vec<String>,
    pub validation_texts: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialFillResult {
    pub username_found: bool,
    pub password_found: bool,
}

pub struct BrowserEngine {
    config: BrowserConfig,
    chrome_process: Mutex<Option<ChromeProcess>>,
    cdp_client: Mutex<Option<Arc<CdpClient>>>,
    refs: RwLock<HashMap<String, SemanticRef>>,
    history: RwLock<Vec<String>>,
    current_viewport: RwLock<(u32, u32, bool)>,
    state_file_path: PathBuf,
}

impl BrowserEngine {
    pub fn new(config: BrowserConfig) -> Self {
        let state_file_path = config
            .storage_state_path
            .as_ref()
            .map(PathBuf::from)
            .unwrap_or_else(|| std::env::temp_dir().join("ava-browser-storage-state.json"));

        let initial_vp = parse_viewport_string(&config.default_viewport);

        Self {
            config,
            chrome_process: Mutex::new(None),
            cdp_client: Mutex::new(None),
            refs: RwLock::new(HashMap::new()),
            history: RwLock::new(Vec::new()),
            current_viewport: RwLock::new(initial_vp),
            state_file_path,
        }
    }

    pub async fn ensure_client(&self) -> Result<Arc<CdpClient>, String> {
        let mut client_guard = self.cdp_client.lock().await;
        if let Some(client) = &*client_guard {
            return Ok(Arc::clone(client));
        }

        let mut process_guard = self.chrome_process.lock().await;
        let process =
            ChromeProcess::launch(self.config.executable_path.as_deref(), self.config.headless)
                .await?;

        let client = CdpClient::connect(&process.ws_url).await?;

        let (w, h, is_mobile) = *self.current_viewport.read().await;
        Self::apply_viewport(&client, w, h, is_mobile).await?;

        self.restore_storage_state(&client).await;

        *process_guard = Some(process);
        *client_guard = Some(Arc::clone(&client));

        Ok(client)
    }

    async fn apply_viewport(
        client: &CdpClient,
        width: u32,
        height: u32,
        is_mobile: bool,
    ) -> Result<(), String> {
        client
            .call(
                "Emulation.setDeviceMetricsOverride",
                Some(json!({
                    "width": width,
                    "height": height,
                    "deviceScaleFactor": if is_mobile { 2.0 } else { 1.0 },
                    "mobile": is_mobile,
                    "screenWidth": width,
                    "screenHeight": height,
                })),
            )
            .await?;

        if is_mobile {
            client
                .call(
                    "Emulation.setUserAgentOverride",
                    Some(json!({
                        "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
                    })),
                )
                .await?;
        }

        Ok(())
    }

    pub async fn set_viewport(&self, viewport_str: &str) -> Result<String, String> {
        let (w, h, is_mobile) = parse_viewport_string(viewport_str);
        let client = self.ensure_client().await?;
        Self::apply_viewport(&client, w, h, is_mobile).await?;

        {
            let mut vp = self.current_viewport.write().await;
            *vp = (w, h, is_mobile);
        }

        Ok(format!("Viewport set to {w}x{h} (mobile={is_mobile})"))
    }

    pub async fn current_viewport_info(&self) -> (u32, u32, bool) {
        *self.current_viewport.read().await
    }

    pub async fn goto(&self, url: &str, timeout_ms: Option<u64>) -> Result<String, String> {
        let client = self.ensure_client().await?;
        let target_url = if url.starts_with("http://")
            || url.starts_with("https://")
            || url.starts_with("data:")
            || url.starts_with("file:")
        {
            url.to_string()
        } else {
            format!("http://{url}")
        };

        client
            .call("Page.navigate", Some(json!({ "url": target_url })))
            .await?;

        let timeout =
            Duration::from_millis(timeout_ms.unwrap_or(self.config.navigation_timeout_ms));
        let start = std::time::Instant::now();

        while start.elapsed() < timeout {
            let ready_state = self
                .evaluate_expression("document.readyState")
                .await
                .unwrap_or_else(|_| "loading".to_string());

            if ready_state == "complete" || ready_state == "interactive" {
                break;
            }
            sleep(Duration::from_millis(150)).await;
        }

        sleep(Duration::from_millis(300)).await;

        let current_url = self
            .get_current_url()
            .await
            .unwrap_or_else(|_| target_url.clone());
        {
            let mut hist = self.history.write().await;
            if hist.last().map(|u| u.as_str()) != Some(&current_url) {
                hist.push(current_url.clone());
            }
        }

        let _ = self.persist_storage_state().await;
        Ok(current_url)
    }

    pub async fn evaluate_raw(&self, expression: &str) -> Result<Value, String> {
        let client = self.ensure_client().await?;
        let res = client
            .call(
                "Runtime.evaluate",
                Some(json!({
                    "expression": expression,
                    "returnByValue": true,
                    "awaitPromise": true,
                    "userGesture": true,
                })),
            )
            .await?;

        if let Some(exception) = res.get("exceptionDetails") {
            let msg = exception
                .get("text")
                .and_then(Value::as_str)
                .unwrap_or("JS evaluation exception");
            return Err(format!("JavaScript evaluation error: {msg}"));
        }

        let val = res
            .get("result")
            .and_then(|r| r.get("value"))
            .cloned()
            .unwrap_or(Value::Null);

        Ok(val)
    }

    pub async fn evaluate_expression(&self, expression: &str) -> Result<String, String> {
        let val = self.evaluate_raw(expression).await?;
        match val {
            Value::String(s) => Ok(s),
            Value::Null => Ok(String::new()),
            other => Ok(other.to_string()),
        }
    }

    pub async fn get_current_url(&self) -> Result<String, String> {
        self.evaluate_expression("window.location.href").await
    }

    pub async fn get_title(&self) -> Result<String, String> {
        self.evaluate_expression("document.title").await
    }

    pub async fn update_refs(&self, new_refs: Vec<SemanticRef>) {
        let mut map = self.refs.write().await;
        map.clear();
        for r in new_refs {
            map.insert(r.r#ref.clone(), r);
        }
    }

    pub async fn get_ref(&self, ref_or_selector: &str) -> Option<SemanticRef> {
        let map = self.refs.read().await;
        map.get(ref_or_selector).cloned()
    }

    pub async fn resolve_selector(&self, ref_or_selector: &str) -> String {
        if let Some(r) = self.get_ref(ref_or_selector).await {
            r.selector
        } else {
            ref_or_selector.to_string()
        }
    }

    pub async fn scan_dom(&self) -> Result<(Vec<SemanticRef>, String), String> {
        let scan_script = r#"
        (() => {
            const isVisible = (el) => {
                if (!el || el.offsetParent === null && el.tagName !== 'BODY') return false;
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            };

            const getBestSelector = (el) => {
                if (el.id) return `#${el.id}`;
                if (el.name) return `${el.tagName.toLowerCase()}[name="${el.name}"]`;
                if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
                if (el.getAttribute('aria-label')) return `[aria-label="${el.getAttribute('aria-label')}"]`;
                
                let path = el.tagName.toLowerCase();
                if (el.className && typeof el.className === 'string') {
                    const firstClass = el.className.trim().split(/\s+/)[0];
                    if (firstClass && !firstClass.includes(':')) path += `.${firstClass}`;
                }
                return path;
            };

            const candidates = document.querySelectorAll(
                'button, a[href], input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="menuitem"], [onclick], [tabindex="0"]'
            );

            const results = [];
            let counter = 1;

            for (const el of candidates) {
                if (!isVisible(el)) continue;
                const ref = `e${counter++}`;
                const tag = el.tagName.toLowerCase();
                const role = el.getAttribute('role') || (tag === 'button' ? 'button' : tag === 'a' ? 'link' : null);
                const text = (el.innerText || el.textContent || el.value || el.placeholder || el.getAttribute('aria-label') || '').trim().slice(0, 100);
                const is_input = tag === 'input' || tag === 'select' || tag === 'textarea';
                const input_type = el.getAttribute('type') || (tag === 'textarea' ? 'textarea' : tag === 'select' ? 'select' : null);
                const placeholder = el.getAttribute('placeholder') || null;
                const href = el.getAttribute('href') || null;
                const aria_label = el.getAttribute('aria-label') || null;
                const name = el.getAttribute('name') || null;
                const id = el.id || null;
                const value = is_input ? (el.value || null) : null;
                const rect = el.getBoundingClientRect();
                const bounds = [rect.left, rect.top, rect.width, rect.height];
                const selector = getBestSelector(el);

                results.push({
                    ref,
                    tag,
                    role,
                    text,
                    selector,
                    is_input,
                    input_type,
                    placeholder,
                    href,
                    aria_label,
                    name,
                    id,
                    value,
                    bounds
                });

                if (results.length >= 150) break;
            }

            return results;
        })()
        "#;

        let res = self.evaluate_raw(scan_script).await?;
        let elements: Vec<SemanticRef> = serde_json::from_value(res).map_err(|e| e.to_string())?;

        self.update_refs(elements.clone()).await;

        let mut summary_lines = Vec::new();
        for el in &elements {
            let mut desc = format!("[{}] <{}", el.r#ref, el.tag);
            if let Some(r) = &el.role {
                desc.push_str(&format!(" role=\"{r}\""));
            }
            if let Some(t) = &el.input_type {
                desc.push_str(&format!(" type=\"{t}\""));
            }
            if let Some(p) = &el.placeholder {
                desc.push_str(&format!(" placeholder=\"{p}\""));
            }
            if let Some(h) = &el.href {
                desc.push_str(&format!(" href=\"{h}\""));
            }
            desc.push('>');
            if !el.text.is_empty() {
                desc.push_str(&format!(" \"{}\"", el.text));
            }
            summary_lines.push(desc);
        }

        let summary = summary_lines.join("\n");
        Ok((elements, summary))
    }

    pub async fn inspect_page_indicators(&self) -> PageIndicators {
        let script = r#"
        (() => {
            const textOf = (selector) => {
                const nodes = document.querySelectorAll(selector);
                const out = [];
                for (const n of nodes) {
                    const t = (n.innerText || n.textContent || '').trim();
                    if (t.length > 0 && t.length < 300) out.push(t);
                }
                return out;
            };

            const errorSelectors = [
                '.alert-danger', '.error-message', '.error-banner', '[role="alert"]',
                '.text-red-500', '.text-danger', '.has-error', '.invalid-feedback',
                '.toast-error', '.notification-error', '.error'
            ];

            const successSelectors = [
                '.alert-success', '.success-message', '.toast-success', '.notification-success',
                '.text-green-500', '.text-success', '.success'
            ];

            const validationSelectors = [
                ':invalid', '.is-invalid', '[aria-invalid="true"]'
            ];

            let errorTexts = [];
            for (const s of errorSelectors) {
                const found = textOf(s);
                if (found.length > 0) errorTexts.push(...found);
            }

            let successTexts = [];
            for (const s of successSelectors) {
                const found = textOf(s);
                if (found.length > 0) successTexts.push(...found);
            }

            let validationTexts = [];
            for (const s of validationSelectors) {
                const found = textOf(s);
                if (found.length > 0) validationTexts.push(...found);
            }

            const loadingSpinners = document.querySelectorAll('.spinner, .loading, [aria-busy="true"]');

            return {
                has_error_banner: errorTexts.length > 0,
                has_success_message: successTexts.length > 0,
                has_validation_errors: validationTexts.length > 0,
                is_loading: loadingSpinners.length > 0,
                error_texts: errorTexts.slice(0, 5),
                success_texts: successTexts.slice(0, 5),
                validation_texts: validationTexts.slice(0, 5)
            };
        })()
        "#;

        let res = self.evaluate_raw(script).await.unwrap_or(Value::Null);
        serde_json::from_value(res).unwrap_or_default()
    }

    pub async fn fill_credentials(
        &self,
        username: &str,
        password: &str,
    ) -> Result<CredentialFillResult, String> {
        let script = format!(
            r#"(() => {{
                let uFound = false;
                let pFound = false;

                const userSelectors = ['input[type="email"]', 'input[name*="user"]', 'input[name*="email"]', 'input[name*="login"]', 'input[type="text"]'];
                for (const sel of userSelectors) {{
                    const el = document.querySelector(sel);
                    if (el && el.offsetParent !== null) {{
                        el.focus();
                        el.value = {u:?};
                        el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                        el.dispatchEvent(new Event('change', {{ bubbles: true }}));
                        uFound = true;
                        break;
                    }}
                }}

                const passSelectors = ['input[type="password"]', 'input[name*="pass"]'];
                for (const sel of passSelectors) {{
                    const el = document.querySelector(sel);
                    if (el && el.offsetParent !== null) {{
                        el.focus();
                        el.value = {p:?};
                        el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                        el.dispatchEvent(new Event('change', {{ bubbles: true }}));
                        pFound = true;
                        break;
                    }}
                }}

                return {{ username_found: uFound, password_found: pFound }};
            }})()"#,
            u = username,
            p = password
        );

        let res = self.evaluate_raw(&script).await?;
        serde_json::from_value(res).map_err(|e| e.to_string())
    }

    pub async fn submit_form(&self) -> Result<bool, String> {
        let script = r#"
        (() => {
            const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], button.btn-primary, button:has(svg), form button');
            if (submitBtn) {
                submitBtn.click();
                return true;
            }
            const form = document.querySelector('form');
            if (form) {
                form.requestSubmit ? form.requestSubmit() : form.submit();
                return true;
            }
            return false;
        })()
        "#;

        let res = self.evaluate_raw(script).await?;
        Ok(res.as_bool().unwrap_or(false))
    }

    pub async fn wait_for_selector(
        &self,
        selector: &str,
        timeout_secs: u64,
    ) -> Result<bool, String> {
        let start = std::time::Instant::now();
        let timeout = Duration::from_secs(timeout_secs);

        while start.elapsed() < timeout {
            let check_script = format!(
                r#"(() => {{
                    const el = document.querySelector({sel:?});
                    return !!el && (el.offsetParent !== null || el.tagName === 'BODY');
                }})()"#,
                sel = selector
            );

            if let Ok(res) = self.evaluate_raw(&check_script).await {
                if res.as_bool() == Some(true) {
                    return Ok(true);
                }
            }

            sleep(Duration::from_millis(200)).await;
        }

        Err(format!(
            "Timed out waiting for selector '{selector}' after {timeout_secs}s"
        ))
    }

    pub async fn click(&self, ref_or_selector: &str) -> Result<(bool, String, bool), String> {
        let selector = self.resolve_selector(ref_or_selector).await;
        let url_before = self.get_current_url().await.unwrap_or_default();

        let bounds_script = format!(
            r#"(() => {{
                const el = document.querySelector({sel:?});
                if (!el) return null;
                el.scrollIntoView({{ block: 'center', inline: 'center', behavior: 'instant' }});
                const rect = el.getBoundingClientRect();
                return {{
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                    width: rect.width,
                    height: rect.height
                }};
            }})()"#,
            sel = selector
        );

        let bounds_res = self.evaluate_raw(&bounds_script).await;
        let mut clicked_via_mouse = false;

        if let Ok(Value::Object(map)) = bounds_res {
            if let (Some(x), Some(y)) = (
                map.get("x").and_then(Value::as_f64),
                map.get("y").and_then(Value::as_f64),
            ) {
                let client = self.ensure_client().await?;
                let _ = client
                    .call(
                        "Input.dispatchMouseEvent",
                        Some(json!({
                            "type": "mouseMoved",
                            "x": x,
                            "y": y
                        })),
                    )
                    .await;
                let _ = client
                    .call(
                        "Input.dispatchMouseEvent",
                        Some(json!({
                            "type": "mousePressed",
                            "button": "left",
                            "x": x,
                            "y": y,
                            "clickCount": 1
                        })),
                    )
                    .await;
                let _ = client
                    .call(
                        "Input.dispatchMouseEvent",
                        Some(json!({
                            "type": "mouseReleased",
                            "button": "left",
                            "x": x,
                            "y": y,
                            "clickCount": 1
                        })),
                    )
                    .await;

                clicked_via_mouse = true;
            }
        }

        if !clicked_via_mouse {
            let fallback_script = format!(
                r#"(() => {{
                    const el = document.querySelector({sel:?});
                    if (!el) return false;
                    el.click();
                    const form = el.closest('form');
                    if (form && el.tagName.toLowerCase() === 'button' && el.type === 'submit') {{
                        form.requestSubmit ? form.requestSubmit() : form.submit();
                    }}
                    return true;
                }})()"#,
                sel = selector
            );

            let res = self.evaluate_raw(&fallback_script).await?;
            if res.as_bool() != Some(true) {
                return Err(format!(
                    "Target element [{ref_or_selector}] (selector: {selector}) not found on page"
                ));
            }
        }

        sleep(Duration::from_millis(500)).await;
        let url_after = self.get_current_url().await.unwrap_or_default();
        let navigated = url_after != url_before;

        if navigated {
            let mut hist = self.history.write().await;
            if hist.last().map(|u| u.as_str()) != Some(&url_after) {
                hist.push(url_after.clone());
            }
        }

        let _ = self.persist_storage_state().await;
        Ok((true, url_after, navigated))
    }

    pub async fn fill(&self, ref_or_selector: &str, value: &str) -> Result<bool, String> {
        let selector = self.resolve_selector(ref_or_selector).await;

        let fill_script = format!(
            r#"(() => {{
                const el = document.querySelector({sel:?});
                if (!el) return {{ success: false, error: "Element not found" }};
                el.focus();
                if (el.tagName.toLowerCase() === 'select') {{
                    let found = false;
                    for (const opt of el.options) {{
                        if (opt.value === {val:?} || opt.textContent.trim() === {val:?}) {{
                            opt.selected = true;
                            found = true;
                            break;
                        }}
                    }}
                    if (!found && el.options.length > 0) {{
                        el.value = {val:?};
                    }}
                }} else {{
                    el.value = {val:?};
                }}
                el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                el.dispatchEvent(new Event('change', {{ bubbles: true }}));
                return {{ success: true }};
            }})()"#,
            sel = selector,
            val = value
        );

        let res = self.evaluate_raw(&fill_script).await?;
        if let Some(err) = res.get("error").and_then(Value::as_str) {
            return Err(format!("Failed to fill [{ref_or_selector}]: {err}"));
        }

        let _ = self.persist_storage_state().await;
        Ok(true)
    }

    pub async fn scroll(&self, direction: &str, amount: i32) -> Result<String, String> {
        let (delta_x, delta_y) = match direction.to_lowercase().as_str() {
            "up" => (0, -amount),
            "down" => (0, amount),
            "left" => (-amount, 0),
            "right" => (amount, 0),
            "top" => (0, -100_000),
            "bottom" => (0, 100_000),
            _ => (0, amount),
        };

        let script = format!(
            r#"(() => {{
                window.scrollBy({dx}, {dy});
                return {{ scrollX: window.scrollX, scrollY: window.scrollY }};
            }})()"#,
            dx = delta_x,
            dy = delta_y
        );

        let res = self.evaluate_raw(&script).await?;
        Ok(format!(
            "Scrolled {direction} by {amount}px (current position: {})",
            res
        ))
    }

    pub async fn screenshot(
        &self,
        screenshot_type: &str,
        ref_or_selector: Option<&str>,
        custom_path: Option<&str>,
    ) -> Result<String, String> {
        let client = self.ensure_client().await?;
        let output_path = if let Some(p) = custom_path {
            PathBuf::from(p)
        } else {
            let dir = self
                .config
                .screenshot_dir
                .as_ref()
                .map(PathBuf::from)
                .unwrap_or_else(std::env::temp_dir);
            let _ = tokio::fs::create_dir_all(&dir).await;
            dir.join(format!(
                "browser_screenshot_{}.png",
                chrono::Utc::now().timestamp_millis()
            ))
        };

        let clip_param = if screenshot_type == "element" {
            if let Some(target) = ref_or_selector {
                let selector = self.resolve_selector(target).await;
                let bounds_script = format!(
                    r#"(() => {{
                        const el = document.querySelector({sel:?});
                        if (!el) return null;
                        const rect = el.getBoundingClientRect();
                        return {{
                            x: rect.left + window.scrollX,
                            y: rect.top + window.scrollY,
                            width: Math.max(rect.width, 1),
                            height: Math.max(rect.height, 1),
                            scale: 1.0
                        }};
                    }})()"#,
                    sel = selector
                );
                let bounds = self.evaluate_raw(&bounds_script).await?;
                if bounds.is_null() {
                    return Err(format!("Element [{target}] not found for screenshot"));
                }
                Some(bounds)
            } else {
                None
            }
        } else {
            None
        };

        let mut params = json!({
            "format": "png",
            "captureBeyondViewport": screenshot_type == "full_page",
        });

        if let Some(clip) = clip_param {
            params["clip"] = clip;
        }

        let res = client.call("Page.captureScreenshot", Some(params)).await?;
        let base64_data = res
            .get("data")
            .and_then(Value::as_str)
            .ok_or_else(|| "No base64 data in captureScreenshot response".to_string())?;

        use base64::Engine;
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(base64_data)
            .map_err(|e| format!("Base64 decode error: {e}"))?;

        tokio::fs::write(&output_path, &bytes)
            .await
            .map_err(|e| format!("Failed to write screenshot file ({output_path:?}): {e}"))?;

        Ok(output_path.display().to_string())
    }

    pub async fn get_outer_html(&self, selector: Option<&str>) -> Result<String, String> {
        let script = if let Some(sel) = selector {
            let actual = self.resolve_selector(sel).await;
            format!(
                r#"(() => {{
                    const el = document.querySelector({s:?});
                    return el ? el.outerHTML : null;
                }})()"#,
                s = actual
            )
        } else {
            "document.documentElement.outerHTML".to_string()
        };

        let val = self.evaluate_expression(&script).await?;
        if val.is_empty() {
            return Err(format!("No element found for selector '{selector:?}'"));
        }
        Ok(val)
    }

    pub async fn get_text_content(&self, selector: Option<&str>) -> Result<String, String> {
        let script = if let Some(sel) = selector {
            let actual = self.resolve_selector(sel).await;
            format!(
                r#"(() => {{
                    const el = document.querySelector({s:?});
                    return el ? (el.innerText || el.textContent) : null;
                }})()"#,
                s = actual
            )
        } else {
            "document.body ? (document.body.innerText || document.body.textContent) : ''"
                .to_string()
        };

        let val = self.evaluate_expression(&script).await?;
        Ok(val)
    }

    pub async fn persist_storage_state(&self) -> Result<(), String> {
        let client = match self.ensure_client().await {
            Ok(c) => c,
            Err(_) => return Ok(()),
        };

        let cookies_res = client
            .call("Network.getCookies", None)
            .await
            .unwrap_or_else(|_| json!({}));
        let cookies = cookies_res
            .get("cookies")
            .cloned()
            .unwrap_or_else(|| json!([]));

        let local_storage = self
            .evaluate_raw(
                r#"(() => {
                    const data = {};
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        data[k] = localStorage.getItem(k);
                    }
                    return data;
                })()"#,
            )
            .await
            .unwrap_or_else(|_| json!({}));

        let state = json!({
            "cookies": cookies,
            "localStorage": local_storage,
            "saved_at": chrono::Utc::now().to_rfc3339(),
        });

        if let Some(parent) = self.state_file_path.parent() {
            let _ = tokio::fs::create_dir_all(parent).await;
        }

        let _ = tokio::fs::write(
            &self.state_file_path,
            serde_json::to_string_pretty(&state).unwrap_or_default(),
        )
        .await;
        Ok(())
    }

    pub async fn restore_storage_state(&self, client: &CdpClient) {
        if !self.state_file_path.exists() {
            return;
        }

        if let Ok(content) = tokio::fs::read_to_string(&self.state_file_path).await {
            if let Ok(state) = serde_json::from_str::<Value>(&content) {
                if let Some(cookies) = state.get("cookies").and_then(Value::as_array) {
                    let _ = client
                        .call(
                            "Network.setCookies",
                            Some(json!({
                                "cookies": cookies
                            })),
                        )
                        .await;
                }
            }
        }
    }

    pub async fn clear_session(&self) -> Result<(), String> {
        if let Ok(client) = self.ensure_client().await {
            let _ = client.call("Network.clearBrowserCookies", None).await;
            let _ = self
                .evaluate_raw("localStorage.clear(); sessionStorage.clear();")
                .await;
        }

        let _ = tokio::fs::remove_file(&self.state_file_path).await;
        self.refs.write().await.clear();
        self.history.write().await.clear();
        Ok(())
    }

    pub async fn get_console_errors(&self) -> Vec<String> {
        if let Some(client) = &*self.cdp_client.lock().await {
            let logs = client.get_console_logs().await;
            logs.into_iter()
                .filter(|l| l.message_type == "error")
                .map(|l| {
                    if let (Some(u), Some(line)) = (l.url, l.line) {
                        format!("[Console Error] {} ({}:{})", l.text, u, line)
                    } else {
                        format!("[Console Error] {}", l.text)
                    }
                })
                .collect()
        } else {
            Vec::new()
        }
    }

    pub async fn get_page_state(&self) -> Result<PageState, String> {
        let url = self.get_current_url().await.unwrap_or_default();
        let title = self.get_title().await.unwrap_or_default();
        let history = self.history.read().await.clone();
        let console_errors = self.get_console_errors().await;

        let is_logged_in_script = r#"(() => {
            const cookies = document.cookie;
            return /auth|token|session|login|jwt|remember/i.test(cookies);
        })()"#;
        let is_logged_in = self
            .evaluate_raw(is_logged_in_script)
            .await
            .map(|v| v.as_bool().unwrap_or(false))
            .unwrap_or(false);

        Ok(PageState {
            url,
            title,
            history,
            is_logged_in,
            last_observed_at: chrono::Utc::now().timestamp_millis() as u64,
            console_errors,
        })
    }

    pub async fn close(&self) -> Result<(), String> {
        let _ = self.persist_storage_state().await;

        {
            let mut client = self.cdp_client.lock().await;
            *client = None;
        }

        {
            let mut process = self.chrome_process.lock().await;
            *process = None;
        }

        self.refs.write().await.clear();
        Ok(())
    }
}
