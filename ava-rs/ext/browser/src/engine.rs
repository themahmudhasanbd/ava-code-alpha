use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use ava_config::types::BrowserConfig;
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

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PageObstacle {
    pub detected: bool,
    pub obstacle_type: Option<String>,
    pub title: String,
    pub description: String,
    pub selector: Option<String>,
    pub suggestion: String,
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
            // The attached target may have been destroyed since (renderer
            // crash, tab closed). Re-attach if needed instead of using a
            // stale session; relaunch Chrome if recovery fails.
            if client.ensure_live_session().await.is_ok() {
                return Ok(Arc::clone(client));
            }
            *client_guard = None;
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
        self.goto_with_options(url, timeout_ms, false).await
    }

    pub async fn goto_with_options(
        &self,
        url: &str,
        timeout_ms: Option<u64>,
        clean_session: bool,
    ) -> Result<String, String> {
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

        let domain = url::Url::parse(&target_url)
            .ok()
            .and_then(|u| {
                u.host_str()
                    .map(|h| h.trim_start_matches("www.").to_string())
            })
            .unwrap_or_default();

        if clean_session {
            let _ = self.clear_session().await;
        } else if !domain.is_empty() {
            let _ = self.restore_domain_session(&domain).await;
        }

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

        if !domain.is_empty() {
            let _ = self.persist_domain_session(&domain).await;
        } else {
            let _ = self.persist_storage_state().await;
        }
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

    pub async fn inspect_obstacles(&self) -> PageObstacle {
        let script = r#"
        (() => {
            const title = document.title || '';
            const bodyText = (document.body ? document.body.innerText : '') || '';

            // 1. Cloudflare Turnstile / Bot Verification Challenge
            const isCfTitle = title.includes('Just a moment...') || title.includes('Attention Required!') || title.includes('Checking your browser');
            const cfEl = document.querySelector('#challenge-running, #cf-challenge-running, .cf-turnstile, iframe[src*="challenges.cloudflare.com"], iframe[src*="turnstile"], #turnstile-wrapper');
            const isCfText = bodyText.includes('Verify you are human') || bodyText.includes('Checking if the site connection is secure') || (bodyText.includes('Cloudflare') && bodyText.includes('Ray ID'));

            if (isCfTitle || cfEl || isCfText) {
                return {
                    detected: true,
                    obstacle_type: 'cloudflare_challenge',
                    title: 'Cloudflare Challenge / Turnstile Detected',
                    description: 'Cloudflare bot verification challenge is blocking access on this page.',
                    selector: cfEl ? (cfEl.id ? '#' + cfEl.id : cfEl.className) : null,
                    suggestion: 'Human takeover or interactive verification required to pass Cloudflare.'
                };
            }

            // 2. Google reCAPTCHA / hCaptcha
            const recaptcha = document.querySelector('iframe[src*="recaptcha"], .g-recaptcha, iframe[title*="reCAPTCHA"]');
            const hcaptcha = document.querySelector('iframe[src*="hcaptcha"], .h-captcha');
            if (recaptcha || hcaptcha) {
                return {
                    detected: true,
                    obstacle_type: 'captcha',
                    title: recaptcha ? 'Google reCAPTCHA Detected' : 'hCaptcha Detected',
                    description: 'A visual CAPTCHA challenge is active on the page.',
                    selector: recaptcha ? 'iframe[src*="recaptcha"]' : 'iframe[src*="hcaptcha"]',
                    suggestion: 'Human takeover required to solve the CAPTCHA.'
                };
            }

            // 3. Two-Factor Authentication / OTP
            const otpInput = document.querySelector('input[autocomplete="one-time-code"], input[name*="otp" i], input[name*="totp" i], input[name*="2fa" i], input[name*="code" i][maxlength="6"], input[name="verification_code" i]');
            const is2faText = bodyText.includes('Two-Factor') || bodyText.includes('2-Step Verification') || bodyText.includes('verification code') || bodyText.includes('authenticator app');
            if (otpInput || (is2faText && document.querySelector('input[type="text"], input[type="number"]'))) {
                return {
                    detected: true,
                    obstacle_type: 'two_factor_auth',
                    title: 'Two-Factor Authentication (2FA/OTP) Required',
                    description: 'The site requires a two-factor verification or OTP code to complete authentication.',
                    selector: otpInput ? (otpInput.name || otpInput.id || 'input') : null,
                    suggestion: 'Provide the 2FA / OTP code to the subagent to continue login.'
                };
            }

            // 4. Authentication error banner
            const errorBanner = document.querySelector('.alert-danger, .error-message, .error-banner, [role="alert"], .text-danger, .invalid-feedback');
            if (errorBanner) {
                const errText = (errorBanner.innerText || '').trim();
                const authKeywords = ['password', 'credential', 'email', 'user not found', 'invalid', 'incorrect', 'unauthorized', 'access denied'];
                if (errText && authKeywords.some(k => errText.toLowerCase().includes(k))) {
                    return {
                        detected: true,
                        obstacle_type: 'auth_failure',
                        title: 'Authentication Failed',
                        description: errText,
                        selector: errorBanner.className || null,
                        suggestion: 'Verify the login email and password, or reset credentials.'
                    };
                }
            }

            return {
                detected: false,
                obstacle_type: null,
                title: '',
                description: '',
                selector: null,
                suggestion: ''
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

                const setValue = (el, val) => {{
                    const valueSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;
                    const prototype = Object.getPrototypeOf(el);
                    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
                    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {{
                        prototypeValueSetter.call(el, val);
                    }} else if (valueSetter) {{
                        valueSetter.call(el, val);
                    }} else {{
                        el.value = val;
                    }}
                    el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    el.dispatchEvent(new Event('change', {{ bubbles: true }}));
                }};

                const userSelectors = ['input[type="email"]', 'input[name*="user"]', 'input[name*="email"]', 'input[name*="login"]', 'input[type="text"]'];
                for (const sel of userSelectors) {{
                    const el = document.querySelector(sel);
                    if (el && (el.offsetParent !== null || el.tagName === 'BODY' || true)) {{
                        el.focus();
                        setValue(el, {u:?});
                        uFound = true;
                        break;
                    }}
                }}

                const passSelectors = ['input[type="password"]', 'input[name*="pass"]'];
                for (const sel of passSelectors) {{
                    const el = document.querySelector(sel);
                    if (el && (el.offsetParent !== null || el.tagName === 'BODY' || true)) {{
                        el.focus();
                        setValue(el, {p:?});
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
                    const valueSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;
                    const prototype = Object.getPrototypeOf(el);
                    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
                    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {{
                        prototypeValueSetter.call(el, {val:?});
                    }} else if (valueSetter) {{
                        valueSetter.call(el, {val:?});
                    }} else {{
                        el.value = {val:?};
                    }}
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

        // Ensure the page is frontmost so the compositor produces frames;
        // a backgrounded page captures as blank white.
        let _ = client.call("Page.bringToFront", None).await;

        let base_params = {
            let mut params = json!({
                "format": "png",
                "captureBeyondViewport": screenshot_type == "full_page",
            });
            if let Some(clip) = clip_param {
                params["clip"] = clip;
            }
            params
        };

        // Capture with blank detection + retry: an all-white PNG means the
        // compositor had no frame ready; wait briefly and retry.
        let mut last_problem = String::from("unknown error");
        let mut fallback_bytes = None;
        for attempt in 0..3u32 {
            if attempt > 0 {
                sleep(Duration::from_millis(500)).await;
                let _ = client.call("Page.bringToFront", None).await;
            }
            let res = client
                .call("Page.captureScreenshot", Some(base_params.clone()))
                .await?;
            let base64_data = res
                .get("data")
                .and_then(Value::as_str)
                .ok_or_else(|| "No base64 data in captureScreenshot response".to_string())?;

            use base64::Engine;
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(base64_data)
                .map_err(|e| format!("Base64 decode error: {e}"))?;

            if Self::is_blank_png(&bytes) {
                last_problem = format!(
                    "capture #{} returned a blank page (compositor had no frame)",
                    attempt + 1
                );
                fallback_bytes = Some(bytes);
                continue;
            }

            tokio::fs::write(&output_path, &bytes)
                .await
                .map_err(|e| format!("Failed to write screenshot file ({output_path:?}): {e}"))?;

            return Ok(output_path.display().to_string());
        }

        // If all retries were flagged as blank/light, still write out the fallback capture
        // so the model/user gets the real page rendering rather than an unrecoverable crash loop.
        if let Some(bytes) = fallback_bytes {
            tokio::fs::write(&output_path, &bytes).await.map_err(|e| {
                format!("Failed to write fallback screenshot file ({output_path:?}): {e}")
            })?;
            return Ok(output_path.display().to_string());
        }

        Err(format!(
            "Screenshot failed after 3 attempts (blank captures): {last_problem}"
        ))
    }

    /// Returns true if the PNG decodes to an (almost) entirely white image.
    /// Used to detect blank captures when the compositor had no frame ready.
    fn is_blank_png(bytes: &[u8]) -> bool {
        let img = match image::load_from_memory(bytes) {
            Ok(img) => img.to_rgb8(),
            Err(_) => return false,
        };
        let (w, h) = (img.width(), img.height());
        if w == 0 || h == 0 {
            return true;
        }
        // Sample a grid; any real page has non-white pixels.
        let step_x = (w / 24).max(1);
        let step_y = (h / 24).max(1);
        let mut non_white = 0u32;
        for y in (0..h).step_by(step_y as usize) {
            for x in (0..w).step_by(step_x as usize) {
                let p = img.get_pixel(x, y);
                if p[0] < 250 || p[1] < 250 || p[2] < 250 {
                    non_white += 1;
                    if non_white > 8 {
                        return false;
                    }
                }
            }
        }
        true
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

    fn domain_session_path(domain: &str) -> PathBuf {
        let dir = PathBuf::from("/root/.config/ava/browser_sessions");
        let safe_name = domain.replace(['/', ':', '\\', ' '], "_");
        dir.join(format!("{safe_name}.json"))
    }

    pub async fn persist_domain_session(&self, domain: &str) -> Result<(), String> {
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
            "domain": domain,
            "cookies": cookies,
            "localStorage": local_storage,
            "saved_at": chrono::Utc::now().to_rfc3339(),
        });

        let path = Self::domain_session_path(domain);
        if let Some(parent) = path.parent() {
            let _ = tokio::fs::create_dir_all(parent).await;
        }

        let serialized = serde_json::to_string_pretty(&state).unwrap_or_default();
        let _ = tokio::fs::write(&path, &serialized).await;
        let _ = tokio::fs::write(&self.state_file_path, &serialized).await;
        Ok(())
    }

    pub async fn restore_domain_session(&self, domain: &str) -> bool {
        let path = Self::domain_session_path(domain);
        let path_to_read = if path.exists() {
            path
        } else if self.state_file_path.exists() {
            self.state_file_path.clone()
        } else {
            return false;
        };

        if let Ok(content) = tokio::fs::read_to_string(&path_to_read).await {
            if let Ok(state) = serde_json::from_str::<Value>(&content) {
                if let Some(cookies) = state.get("cookies").and_then(Value::as_array) {
                    if let Ok(client) = self.ensure_client().await {
                        let _ = client
                            .call(
                                "Network.setCookies",
                                Some(json!({
                                    "cookies": cookies
                                })),
                            )
                            .await;
                        return true;
                    }
                }
            }
        }
        false
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

    pub async fn get_console_logs(&self) -> Vec<String> {
        if let Some(client) = &*self.cdp_client.lock().await {
            let logs = client.get_console_logs().await;
            logs.into_iter()
                .map(|l| {
                    let prefix = match l.message_type.as_str() {
                        "error" => "[Console Error]",
                        "warning" => "[Console Warning]",
                        "info" => "[Console Info]",
                        _ => "[Console Log]",
                    };
                    if let (Some(u), Some(line)) = (l.url, l.line) {
                        format!("{prefix} {} ({}:{})", l.text, u, line)
                    } else {
                        format!("{prefix} {}", l.text)
                    }
                })
                .collect()
        } else {
            Vec::new()
        }
    }

    pub async fn get_devtools_metrics(&self) -> Result<Value, String> {
        let client = self.ensure_client().await?;
        let _ = client.call("Performance.enable", None).await;
        let res = client
            .call("Performance.getMetrics", None)
            .await
            .map_err(|e| format!("Failed to get performance metrics: {e}"))?;
        let _ = client.call("Performance.disable", None).await;
        Ok(res)
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
    /// Moves the mouse to the center of an element (hover), triggering
    /// mouseover/mouseenter handlers (e.g. dropdown menus, tooltips).
    pub async fn hover(&self, ref_or_selector: &str) -> Result<String, String> {
        let selector = self.resolve_selector(ref_or_selector).await;
        let bounds_script = format!(
            r#"(() => {{
                const el = document.querySelector({sel:?});
                if (!el) return null;
                el.scrollIntoView({{ block: 'center', inline: 'center', behavior: 'instant' }});
                const rect = el.getBoundingClientRect();
                return {{ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }};
            }})()"#,
            sel = selector
        );
        let bounds_res = self.evaluate_raw(&bounds_script).await?;
        let (x, y) = match &bounds_res {
            Value::Object(map) => (
                map.get("x").and_then(Value::as_f64),
                map.get("y").and_then(Value::as_f64),
            ),
            _ => (None, None),
        };
        let (x, y) = match (x, y) {
            (Some(x), Some(y)) => (x, y),
            _ => return Err(format!("Element not found for hover [{ref_or_selector}]")),
        };
        let client = self.ensure_client().await?;
        client
            .call(
                "Input.dispatchMouseEvent",
                Some(json!({ "type": "mouseMoved", "x": x, "y": y })),
            )
            .await
            .map_err(|e| format!("hover failed: {e}"))?;
        Ok(format!("Hovered [{ref_or_selector}] at ({x:.0}, {y:.0})"))
    }

    /// Presses a keyboard key. Accepts friendly names ("Enter", "Tab",
    /// "Escape", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight",
    /// "Backspace", "Delete", "Space") or a single character.
    pub async fn press_key(&self, key: &str) -> Result<String, String> {
        let client = self.ensure_client().await?;
        let (key_name, code, vk, text) = match key.to_lowercase().as_str() {
            "enter" => ("Enter", "Enter", 13, None),
            "tab" => ("Tab", "Tab", 9, None),
            "escape" | "esc" => ("Escape", "Escape", 27, None),
            "arrowdown" | "down" => ("ArrowDown", "ArrowDown", 40, None),
            "arrowup" | "up" => ("ArrowUp", "ArrowUp", 38, None),
            "arrowleft" | "left" => ("ArrowLeft", "ArrowLeft", 37, None),
            "arrowright" | "right" => ("ArrowRight", "ArrowRight", 39, None),
            "backspace" => ("Backspace", "Backspace", 8, None),
            "delete" => ("Delete", "Delete", 46, None),
            "space" => (" ", "Space", 32, Some(" ".to_string())),
            _ if key.chars().count() == 1 => {
                let c = key.chars().next().unwrap();
                (key, key, c as u32, Some(key.to_string()))
            }
            _ => (key, key, 0, None),
        };
        for event_type in ["keyDown", "keyUp"] {
            let mut params = json!({
                "type": event_type,
                "key": key_name,
                "code": code,
                "windowsVirtualKeyCode": vk,
                "nativeVirtualKeyCode": vk,
            });
            if event_type == "keyDown" {
                if let Some(t) = &text {
                    params["text"] = json!(t);
                    params["unmodifiedText"] = json!(t);
                }
            }
            client
                .call("Input.dispatchKeyEvent", Some(params))
                .await
                .map_err(|e| format!("press_key({key}) failed: {e}"))?;
        }
        Ok(format!("Pressed key '{key}'"))
    }

    /// Drags from one element (or selector) to another via mouse events.
    pub async fn drag(&self, from_ref: &str, to_ref: &str) -> Result<String, String> {
        let from_sel = self.resolve_selector(from_ref).await;
        let to_sel = self.resolve_selector(to_ref).await;
        let pos_script = format!(
            r#"(() => {{
                const pos = (sel) => {{
                    const el = document.querySelector(sel);
                    if (!el) return null;
                    el.scrollIntoView({{ block: 'center', inline: 'center', behavior: 'instant' }});
                    const r = el.getBoundingClientRect();
                    return {{ x: r.left + r.width / 2, y: r.top + r.height / 2 }};
                }};
                return {{ from: pos({from:?}), to: pos({to:?}) }};
            }})()"#,
            from = from_sel,
            to = to_sel
        );
        let res = self.evaluate_raw(&pos_script).await?;
        let get_xy = |v: &Value| -> Option<(f64, f64)> {
            let m = v.as_object()?;
            Some((m.get("x")?.as_f64()?, m.get("y")?.as_f64()?))
        };
        let (fx, fy) = get_xy(res.get("from").unwrap_or(&Value::Null))
            .ok_or_else(|| format!("Drag source not found [{from_ref}]"))?;
        let (tx, ty) = get_xy(res.get("to").unwrap_or(&Value::Null))
            .ok_or_else(|| format!("Drag target not found [{to_ref}]"))?;
        let client = self.ensure_client().await?;
        let seq = [
            ("mouseMoved", fx, fy, true),
            ("mousePressed", fx, fy, false),
            ("mouseMoved", tx, ty, false),
            ("mouseReleased", tx, ty, false),
        ];
        for (i, (t, x, y, _)) in seq.iter().enumerate() {
            let mut params = json!({ "type": t, "x": x, "y": y, "button": "left" });
            if *t == "mousePressed" {
                params["clickCount"] = json!(1);
            }
            // Small pause between steps so the page processes the drag.
            if i > 0 {
                tokio::time::sleep(std::time::Duration::from_millis(60)).await;
            }
            client
                .call("Input.dispatchMouseEvent", Some(params))
                .await
                .map_err(|e| format!("drag step {t} failed: {e}"))?;
        }
        Ok(format!(
            "Dragged [{from_ref}] to [{to_ref}] ({fx:.0},{fy:.0} -> {tx:.0},{ty:.0})"
        ))
    }

    /// Lists open targets (tabs/pages).
    pub async fn tab_list(&self) -> Result<Value, String> {
        let client = self.ensure_client().await?;
        client
            .call("Target.getTargets", None)
            .await
            .map_err(|e| format!("tab_list failed: {e}"))
    }

    /// Opens a new tab (target). If `url` is given, navigates there.
    pub async fn tab_new(&self, url: Option<&str>) -> Result<String, String> {
        let client = self.ensure_client().await?;
        let mut params = json!({});
        if let Some(u) = url {
            params["url"] = json!(u);
        }
        let res = client
            .call("Target.createTarget", Some(params))
            .await
            .map_err(|e| format!("tab_new failed: {e}"))?;
        let target_id = res
            .get("targetId")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        // Move the CDP session to the new tab; otherwise all subsequent
        // calls would keep operating on the previous tab.
        client
            .attach_to_target(&target_id)
            .await
            .map_err(|e| format!("tab_new: session attach failed: {e}"))?;
        Ok(target_id)
    }

    /// Activates (switches to) a tab by target id.
    pub async fn tab_switch(&self, target_id: &str) -> Result<String, String> {
        let client = self.ensure_client().await?;
        client
            .call(
                "Target.activateTarget",
                Some(json!({ "targetId": target_id })),
            )
            .await
            .map_err(|e| format!("tab_switch failed: {e}"))?;
        // ActivateTarget only changes visual focus; move the CDP session too,
        // otherwise subsequent calls still hit the previous tab.
        client
            .attach_to_target(target_id)
            .await
            .map_err(|e| format!("tab_switch: session attach failed: {e}"))?;
        // Re-resolve refs for the newly active page.
        let _ = self.scan_dom().await;
        Ok(format!("Switched to tab {target_id}"))
    }

    /// Closes a tab by target id.
    pub async fn tab_close(&self, target_id: &str) -> Result<String, String> {
        let client = self.ensure_client().await?;
        client
            .call("Target.closeTarget", Some(json!({ "targetId": target_id })))
            .await
            .map_err(|e| format!("tab_close failed: {e}"))?;
        Ok(format!("Closed tab {target_id}"))
    }

    /// Captures a lightweight base64 JPEG frame for live view.
    /// Returns (base64_data, width, height). Optimized for frequent polling:
    /// reduced size and JPEG compression.
    pub async fn live_frame(&self) -> Result<(String, u32, u32), String> {
        let client = self.ensure_client().await?;
        // Capture at reduced scale for bandwidth efficiency.
        let res = client
            .call(
                "Page.captureScreenshot",
                Some(json!({
                    "format": "jpeg",
                    "quality": 60,
                    "clip": null,
                    "captureBeyondViewport": false,
                })),
            )
            .await
            .map_err(|e| format!("live_frame failed: {e}"))?;
        let data = res
            .get("data")
            .and_then(Value::as_str)
            .ok_or_else(|| "live_frame: no data in response".to_string())?
            .to_string();
        let (w, h, _) = self.current_viewport_info().await;
        Ok((data, w, h))
    }
}
