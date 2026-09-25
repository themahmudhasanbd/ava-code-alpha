use std::sync::Arc;
use std::time::Duration;

use codex_config::types::BrowserConfig;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tokio::sync::{Mutex, RwLock};
use tokio::time::sleep;

use crate::engine::{BrowserEngine, ViewportProfile};
use crate::observer::{ObservationResult, Observer};

pub use crate::engine::PageIndicators;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct NavigationVerification {
    pub navigated: bool,
    pub current_url: String,
    pub title: String,
    pub page_indicators: PageIndicators,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CulpritElement {
    pub tag: String,
    pub id: String,
    pub class_name: String,
    pub width: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsiveAuditItem {
    pub viewport: String,
    pub width: u32,
    pub height: u32,
    pub has_overflow: bool,
    pub scroll_width: i64,
    pub culprits: Vec<CulpritElement>,
    pub screenshot_path: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ObserveReminder {
    None,
    NeedsFreshObserve,
}

pub struct BrowserCoordinator {
    engine: Arc<BrowserEngine>,
    observer: Arc<Observer>,
    config: BrowserConfig,
    dom_stale: RwLock<bool>,
    action_mutex: Mutex<()>,
}

impl BrowserCoordinator {
    pub fn new(config: BrowserConfig) -> Self {
        let engine = Arc::new(BrowserEngine::new(config.clone()));
        let observer = Arc::new(Observer::new());
        Self {
            engine,
            observer,
            config,
            dom_stale: RwLock::new(false),
            action_mutex: Mutex::new(()),
        }
    }

    pub fn engine(&self) -> &Arc<BrowserEngine> {
        &self.engine
    }

    pub fn observer(&self) -> &Arc<Observer> {
        &self.observer
    }

    pub fn config(&self) -> &BrowserConfig {
        &self.config
    }

    pub fn format_indicators(ind: &PageIndicators) -> String {
        let mut lines = Vec::new();
        for err in &ind.error_texts {
            lines.push(format!("[ERROR] {err}"));
        }
        for v in &ind.validation_texts {
            lines.push(format!("[VALIDATION] {v}"));
        }
        for s in &ind.success_texts {
            lines.push(format!("[SUCCESS] {s}"));
        }
        if ind.is_loading {
            lines.push("[LOADING] Page has active loading spinners.".to_string());
        }

        if lines.is_empty() {
            "No error/success/loading indicators found.".to_string()
        } else {
            lines.join("\n")
        }
    }

    pub async fn observe(
        &self,
        diff_only: bool,
        visual: bool,
    ) -> Result<ObservationResult, String> {
        let mut obs = self
            .observer
            .observe(&self.engine, diff_only, visual)
            .await?;
        let mut stale = self.dom_stale.write().await;
        *stale = false;
        obs.stale = false;
        Ok(obs)
    }

    pub async fn mark_dom_mutated(&self) -> ObserveReminder {
        let mut stale = self.dom_stale.write().await;
        *stale = true;
        ObserveReminder::NeedsFreshObserve
    }

    pub async fn is_dom_stale(&self) -> bool {
        *self.dom_stale.read().await
    }

    pub async fn open_url(
        &self,
        url: &str,
        viewport: Option<&str>,
        wait_for: Option<&str>,
        task_intent: Option<&str>,
    ) -> Result<crate::actions::ActionResult, String> {
        let _guard = self.action_mutex.lock().await;

        if let Some(vp_str) = viewport {
            self.engine.set_viewport(vp_str).await?;
        }

        self.engine.goto(url, None).await?;

        if let Some(sel) = wait_for {
            self.engine.wait_for_selector(sel, 15).await?;
        } else {
            sleep(Duration::from_millis(500)).await;
        }

        let indicators = self.engine.inspect_page_indicators().await;
        let mode = Observer::infer_mode(task_intent);
        let obs = self.observe(false, mode == "visual").await?;

        let mut output_lines = Vec::new();
        output_lines.push(format!("Navigated to: {}", obs.url));
        output_lines.push(format!("Page Title: {}", obs.title));

        if let Some(intent) = task_intent {
            output_lines.push(format!("Task Intent: {intent}"));
        }

        if indicators.has_error_banner {
            output_lines.push("\n⚠️ Error Banner Detected:".to_string());
            for err in &indicators.error_texts {
                output_lines.push(format!("  - {err}"));
            }
        }

        if indicators.has_validation_errors {
            output_lines.push("\n⚠️ Validation Errors:".to_string());
            for v in &indicators.validation_texts {
                output_lines.push(format!("  - {v}"));
            }
        }

        if indicators.has_success_message {
            output_lines.push("\n✅ Success Message:".to_string());
            for s in &indicators.success_texts {
                output_lines.push(format!("  - {s}"));
            }
        }

        if let Some(ss) = &obs.screenshot_path {
            output_lines.push(format!("\nScreenshot captured: `{ss}`"));
        }

        output_lines.push("\n--- Interactive Elements ---".to_string());
        output_lines.push(obs.summary);

        Ok(crate::actions::ActionResult {
            success: !indicators.has_error_banner,
            title: format!("Opened: {}", obs.title),
            output: output_lines.join("\n"),
            url: Some(obs.url),
            metadata: Some(serde_json::to_value(&indicators).unwrap_or(Value::Null)),
        })
    }

    pub async fn login(
        &self,
        url: Option<&str>,
        username: &str,
        password: &str,
        submit_selector: Option<&str>,
        post_login_check: Option<&str>,
    ) -> Result<crate::actions::ActionResult, String> {
        let _guard = self.action_mutex.lock().await;

        if let Some(u) = url {
            self.engine.goto(u, None).await?;
            sleep(Duration::from_millis(500)).await;
        }

        let cred_res = self.engine.fill_credentials(username, password).await?;
        if !cred_res.username_found || !cred_res.password_found {
            return Err(format!(
                "Login failed: Could not detect standard username/password inputs on page (User found: {}, Pass found: {})",
                cred_res.username_found, cred_res.password_found
            ));
        }

        let submit_res = if let Some(sel) = submit_selector {
            self.engine.click(sel).await.map(|_| true)
        } else {
            self.engine.submit_form().await
        };

        if let Err(e) = submit_res {
            return Err(format!("Failed to submit login form: {e}"));
        }

        sleep(Duration::from_secs(2)).await;

        if let Some(chk) = post_login_check {
            let _ = self.engine.wait_for_selector(chk, 10).await;
        }

        let indicators = self.engine.inspect_page_indicators().await;
        let state = self.engine.get_page_state().await?;
        let obs = self.observe(false, false).await?;

        let mut output_lines = Vec::new();
        output_lines.push("### Login Form Submitted".to_string());
        output_lines.push(format!("Current URL: {}", state.url));
        output_lines.push(format!("Page Title: {}", state.title));
        output_lines.push(format!(
            "Logged In: {}",
            if state.is_logged_in { "Yes" } else { "Likely" }
        ));

        if indicators.has_error_banner {
            output_lines.push("\n❌ Login Error Detected:".to_string());
            for err in &indicators.error_texts {
                output_lines.push(format!("  - {err}"));
            }
        }

        if indicators.has_success_message {
            output_lines.push("\n✅ Login Success Indicator:".to_string());
            for s in &indicators.success_texts {
                output_lines.push(format!("  - {s}"));
            }
        }

        output_lines.push("\n--- Post-Login DOM Elements ---".to_string());
        output_lines.push(obs.summary);

        Ok(crate::actions::ActionResult {
            success: !indicators.has_error_banner,
            title: format!(
                "Login: {}",
                if indicators.has_error_banner {
                    "Failed/Error"
                } else {
                    "Success"
                }
            ),
            output: output_lines.join("\n"),
            url: Some(state.url),
            metadata: Some(serde_json::to_value(&indicators).unwrap_or(Value::Null)),
        })
    }

    pub async fn click(
        &self,
        target: &str,
        wait_navigation: bool,
    ) -> Result<crate::actions::ActionResult, String> {
        let _guard = self.action_mutex.lock().await;

        let prev_state = self.engine.get_page_state().await?;
        let (_, new_url, navigated) = self.engine.click(target).await?;

        if wait_navigation && navigated {
            sleep(Duration::from_millis(500)).await;
        }

        let reminder = self.mark_dom_mutated().await;
        let indicators = self.engine.inspect_page_indicators().await;
        let curr_state = self.engine.get_page_state().await?;

        let mut output_lines = Vec::new();
        output_lines.push(format!("Clicked element `{target}`."));

        if navigated {
            output_lines.push(format!(
                "Navigated from `{}` to `{}`",
                prev_state.url, new_url
            ));
            output_lines.push(format!("New Page Title: {}", curr_state.title));
        }

        if indicators.has_error_banner {
            output_lines.push("\n⚠️ Error Banner Triggered:".to_string());
            for err in &indicators.error_texts {
                output_lines.push(format!("  - {err}"));
            }
        }

        if indicators.has_validation_errors {
            output_lines.push("\n⚠️ Validation Errors:".to_string());
            for v in &indicators.validation_texts {
                output_lines.push(format!("  - {v}"));
            }
        }

        if indicators.has_success_message {
            output_lines.push("\n✅ Success Feedback:".to_string());
            for s in &indicators.success_texts {
                output_lines.push(format!("  - {s}"));
            }
        }

        if reminder == ObserveReminder::NeedsFreshObserve {
            output_lines.push("\n⚠️ Note: Page state changed. Call 'observe' to update element refs before next interaction.".to_string());
        }

        Ok(crate::actions::ActionResult {
            success: !indicators.has_error_banner,
            title: format!("Clicked: {target}"),
            output: output_lines.join("\n"),
            url: Some(curr_state.url),
            metadata: Some(serde_json::to_value(&indicators).unwrap_or(Value::Null)),
        })
    }

    pub async fn fill(
        &self,
        target: &str,
        value: &str,
    ) -> Result<crate::actions::ActionResult, String> {
        let _guard = self.action_mutex.lock().await;

        self.engine.fill(target, value).await?;
        let reminder = self.mark_dom_mutated().await;

        let mut output_lines = Vec::new();
        output_lines.push(format!("Filled `{target}` with `{value}`."));

        if reminder == ObserveReminder::NeedsFreshObserve {
            output_lines.push(
                "\n⚠️ Input updated. You can now fill other fields or click submit.".to_string(),
            );
        }

        Ok(crate::actions::ActionResult {
            success: true,
            title: format!("Filled: {target}"),
            output: output_lines.join("\n"),
            url: None,
            metadata: None,
        })
    }

    pub async fn fill_form(
        &self,
        fields: &[(&str, &str)],
        submit_ref: Option<&str>,
    ) -> Result<crate::actions::ActionResult, String> {
        let _guard = self.action_mutex.lock().await;

        let mut filled_count = 0;
        for (target, value) in fields {
            self.engine.fill(target, value).await?;
            filled_count += 1;
        }

        let mut submitted = false;
        if let Some(sub) = submit_ref {
            let _ = self.engine.click(sub).await?;
            sleep(Duration::from_millis(800)).await;
            submitted = true;
        }

        let _ = self.mark_dom_mutated().await;
        let indicators = self.engine.inspect_page_indicators().await;
        let curr_state = self.engine.get_page_state().await?;

        let mut output_lines = Vec::new();
        output_lines.push(format!("Filled {filled_count} form field(s)."));
        if submitted {
            output_lines.push(format!(
                "Clicked submit element `{}`.",
                submit_ref.unwrap_or_default()
            ));
        }

        if indicators.has_error_banner {
            output_lines.push("\n⚠️ Form Error Banner:".to_string());
            for err in &indicators.error_texts {
                output_lines.push(format!("  - {err}"));
            }
        }

        if indicators.has_validation_errors {
            output_lines.push("\n⚠️ Form Validation Errors:".to_string());
            for v in &indicators.validation_texts {
                output_lines.push(format!("  - {v}"));
            }
        }

        if indicators.has_success_message {
            output_lines.push("\n✅ Form Success Message:".to_string());
            for s in &indicators.success_texts {
                output_lines.push(format!("  - {s}"));
            }
        }

        Ok(crate::actions::ActionResult {
            success: !indicators.has_error_banner && !indicators.has_validation_errors,
            title: format!("Form: Filled {filled_count} Fields"),
            output: output_lines.join("\n"),
            url: Some(curr_state.url),
            metadata: Some(serde_json::to_value(&indicators).unwrap_or(Value::Null)),
        })
    }

    pub async fn responsive_audit(&self) -> Result<Vec<ResponsiveAuditItem>, String> {
        let _guard = self.action_mutex.lock().await;

        let viewports = [
            ViewportProfile::Desktop,
            ViewportProfile::Tablet,
            ViewportProfile::Mobile,
        ];

        let mut audit_items = Vec::new();

        for vp in viewports {
            let (w, h) = vp.dimensions();
            self.engine.set_viewport(vp.name()).await?;
            sleep(Duration::from_millis(300)).await;

            let audit_js = r#"
            (() => {
                const vw = window.innerWidth || document.documentElement.clientWidth;
                const culprits = [];
                const all = document.querySelectorAll('*');
                for (const el of all) {
                    const rect = el.getBoundingClientRect();
                    if (rect.right > vw + 1 || rect.width > vw + 1) {
                        culprits.push({
                            tag: el.tagName.toLowerCase(),
                            id: el.id || '',
                            class_name: el.className ? String(el.className).slice(0, 50) : '',
                            width: Math.round(rect.width)
                        });
                    }
                }
                return {
                    has_overflow: document.documentElement.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1,
                    scroll_width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
                    culprits: culprits.slice(0, 5)
                };
            })()
            "#;

            let audit_val = self
                .engine
                .evaluate_raw(audit_js)
                .await
                .unwrap_or(Value::Null);
            let has_overflow = audit_val
                .get("has_overflow")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            let scroll_width = audit_val
                .get("scroll_width")
                .and_then(Value::as_i64)
                .unwrap_or(0);
            let culprits_raw = audit_val.get("culprits").and_then(Value::as_array);

            let culprits: Vec<CulpritElement> = culprits_raw
                .map(|arr| serde_json::from_value(json!(arr)).unwrap_or_default())
                .unwrap_or_default();

            let screenshot_path = self
                .engine
                .screenshot("viewport", None, None)
                .await
                .unwrap_or_default();

            audit_items.push(ResponsiveAuditItem {
                viewport: vp.name().to_string(),
                width: w,
                height: h,
                has_overflow,
                scroll_width,
                culprits,
                screenshot_path,
            });
        }

        // Reset to desktop
        let _ = self.engine.set_viewport("desktop").await;

        Ok(audit_items)
    }

    pub async fn reset(&self) {
        self.observer.reset().await;
        let mut stale = self.dom_stale.write().await;
        *stale = false;
    }

    pub async fn close(&self) -> Result<(), String> {
        self.reset().await;
        self.engine.close().await?;
        Ok(())
    }
}
