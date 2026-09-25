use std::sync::Arc;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tokio::time::sleep;

use crate::coordinator::BrowserCoordinator;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionResult {
    pub success: bool,
    pub title: String,
    pub output: String,
    pub url: Option<String>,
    pub metadata: Option<Value>,
}

pub struct ActionDispatcher;

impl ActionDispatcher {
    pub async fn dispatch(
        coordinator: &Arc<BrowserCoordinator>,
        action: &str,
        params: &Value,
    ) -> Result<ActionResult, String> {
        let engine = coordinator.engine();

        match action.to_lowercase().as_str() {
            "open" => {
                let url = params
                    .get("url")
                    .and_then(Value::as_str)
                    .ok_or_else(|| "Missing required parameter 'url'".to_string())?;

                let viewport = params.get("viewport").and_then(Value::as_str);
                let wait_for = params.get("wait_for").and_then(Value::as_str);
                let task_intent = params.get("task_intent").and_then(Value::as_str);

                coordinator
                    .open_url(url, viewport, wait_for, task_intent)
                    .await
            }

            "login" => {
                let url = params.get("url").and_then(Value::as_str);
                let username = params
                    .get("username")
                    .and_then(Value::as_str)
                    .ok_or_else(|| "Missing required parameter 'username'".to_string())?;
                let password = params
                    .get("password")
                    .and_then(Value::as_str)
                    .ok_or_else(|| "Missing required parameter 'password'".to_string())?;
                let submit_selector = params.get("submit_selector").and_then(Value::as_str);
                let post_login_check = params.get("post_login_check").and_then(Value::as_str);

                coordinator
                    .login(url, username, password, submit_selector, post_login_check)
                    .await
            }

            "observe" => {
                let diff_only = params
                    .get("diff_only")
                    .and_then(Value::as_bool)
                    .unwrap_or(false);
                let visual = params
                    .get("visual")
                    .and_then(Value::as_bool)
                    .unwrap_or(false);

                let observation = coordinator.observe(diff_only, visual).await?;

                let title = if observation.diff.is_some() {
                    format!("Browser Observation (Diff): {}", observation.title)
                } else {
                    format!("Browser Observation: {}", observation.title)
                };

                let mut out = observation.summary.clone();
                if let Some(diff) = &observation.diff {
                    out = format!("<dom_diff>\n{}\n</dom_diff>\n\n{}", diff, out);
                }
                if let Some(screenshot) = &observation.screenshot_path {
                    out = format!("{}\n\nScreenshot saved: `{}`", out, screenshot);
                }

                Ok(ActionResult {
                    success: true,
                    title,
                    output: out,
                    url: Some(observation.url),
                    metadata: Some(json!({
                        "mode": observation.mode,
                        "elements_count": observation.elements.len(),
                        "stale": observation.stale,
                    })),
                })
            }

            "click" => {
                let target_ref = params.get("ref").and_then(Value::as_str);
                let selector = params.get("selector").and_then(Value::as_str);
                let wait_nav = params
                    .get("wait_for_navigation")
                    .and_then(Value::as_bool)
                    .unwrap_or(true);
                let target = target_ref.or(selector).ok_or_else(|| {
                    "Missing target parameter: provide either 'ref' (e.g. 'e1') or 'selector'"
                        .to_string()
                })?;

                coordinator.click(target, wait_nav).await
            }

            "fill" => {
                let target_ref = params.get("ref").and_then(Value::as_str);
                let selector = params.get("selector").and_then(Value::as_str);
                let value = params
                    .get("value")
                    .and_then(Value::as_str)
                    .ok_or_else(|| "Missing required parameter 'value'".to_string())?;

                let target = target_ref.or(selector).ok_or_else(|| {
                    "Missing target parameter: provide either 'ref' (e.g. 'e1') or 'selector'"
                        .to_string()
                })?;

                coordinator.fill(target, value).await
            }

            "fill_form" => {
                let form_fields =
                    params
                        .get("fields")
                        .and_then(Value::as_array)
                        .ok_or_else(|| {
                            "Missing required parameter 'fields': array of {ref, value}".to_string()
                        })?;

                let mut fields = Vec::new();
                for f in form_fields {
                    let r = f
                        .get("ref")
                        .or_else(|| f.get("selector"))
                        .and_then(Value::as_str)
                        .unwrap_or_default();
                    let v = f.get("value").and_then(Value::as_str).unwrap_or_default();
                    if !r.is_empty() {
                        fields.push((r, v));
                    }
                }

                let submit_ref = params
                    .get("submit_ref")
                    .or_else(|| params.get("submit_selector"))
                    .and_then(Value::as_str);

                coordinator.fill_form(&fields, submit_ref).await
            }

            "scroll" => {
                let direction = params
                    .get("direction")
                    .and_then(Value::as_str)
                    .unwrap_or("down");
                let amount = params.get("amount").and_then(Value::as_i64).unwrap_or(500) as i32;

                let res = engine.scroll(direction, amount).await?;
                let reminder = coordinator.mark_dom_mutated().await;
                let reminder_msg = match reminder {
                    crate::coordinator::ObserveReminder::NeedsFreshObserve => {
                        "\n⚠️ Note: Scrolling may have brought new interactive elements into view. Run action 'observe' to update element refs."
                    }
                    _ => "",
                };

                Ok(ActionResult {
                    success: true,
                    title: format!("Browser Scroll: {direction}"),
                    output: format!("{res}{reminder_msg}"),
                    url: None,
                    metadata: None,
                })
            }

            "wait" => {
                let seconds = params
                    .get("seconds")
                    .or_else(|| params.get("duration"))
                    .and_then(Value::as_f64)
                    .unwrap_or(1.0);

                sleep(Duration::from_secs_f64(seconds.clamp(0.1, 30.0))).await;

                Ok(ActionResult {
                    success: true,
                    title: "Browser Wait Complete".to_string(),
                    output: format!("Waited for {:.1}s.", seconds),
                    url: None,
                    metadata: None,
                })
            }

            "viewport" => {
                let profile_str = params
                    .get("profile")
                    .or_else(|| params.get("viewport"))
                    .and_then(Value::as_str)
                    .unwrap_or("desktop");

                let res = engine.set_viewport(profile_str).await?;

                let reminder = coordinator.mark_dom_mutated().await;
                let reminder_msg = match reminder {
                    crate::coordinator::ObserveReminder::NeedsFreshObserve => {
                        "\n⚠️ Viewport changed. Elements may have shifted or collapsed into responsive menus. Call 'observe' to update refs."
                    }
                    _ => "",
                };

                Ok(ActionResult {
                    success: true,
                    title: format!("Viewport Changed: {profile_str}"),
                    output: format!("{res}{reminder_msg}"),
                    url: None,
                    metadata: None,
                })
            }

            "screenshot" => {
                let clip_type = params
                    .get("clip_type")
                    .or_else(|| params.get("mode"))
                    .and_then(Value::as_str)
                    .unwrap_or("viewport");

                let selector = params
                    .get("selector")
                    .or_else(|| params.get("ref"))
                    .and_then(Value::as_str);

                let custom_path = params.get("path").and_then(Value::as_str);

                let path = engine.screenshot(clip_type, selector, custom_path).await?;

                Ok(ActionResult {
                    success: true,
                    title: "Browser Screenshot Captured".to_string(),
                    output: format!("Screenshot saved to `{path}` (mode: {clip_type})."),
                    url: None,
                    metadata: Some(json!({ "path": path, "mode": clip_type })),
                })
            }

            "responsive_audit" => {
                let audit_items = coordinator.responsive_audit().await?;
                let mut report_lines = Vec::new();
                let mut issue_count = 0;

                report_lines.push("## Responsive Layout Audit Report".to_string());

                for item in &audit_items {
                    if item.has_overflow {
                        issue_count += 1;
                        report_lines.push(format!(
                            "\n❌ **{} ({}x{})**: Horizontal Overflow Detected! (Scroll width: {}px vs Viewport: {}px)",
                            item.viewport, item.width, item.height, item.scroll_width, item.width
                        ));

                        if !item.culprits.is_empty() {
                            report_lines.push("  Culprit elements causing overflow:".to_string());
                            for c in &item.culprits {
                                let mut desc = format!("<{}", c.tag);
                                if !c.id.is_empty() {
                                    desc.push_str(&format!(" id=\"{}\"", c.id));
                                }
                                if !c.class_name.is_empty() {
                                    desc.push_str(&format!(" class=\"{}\"", c.class_name));
                                }
                                desc.push('>');
                                report_lines.push(format!("    - `{desc}` (width: {}px)", c.width));
                            }
                        }
                    } else {
                        report_lines.push(format!(
                            "\n✅ **{} ({}x{})**: Clean layout, no horizontal overflow.",
                            item.viewport, item.width, item.height
                        ));
                    }
                    if !item.screenshot_path.is_empty() {
                        report_lines.push(format!("  Screenshot: `{}`", item.screenshot_path));
                    }
                }

                let title = if issue_count > 0 {
                    format!("Responsive Audit: Found {issue_count} Viewport Issues")
                } else {
                    "Responsive Audit: All Viewports Clean".to_string()
                };

                Ok(ActionResult {
                    success: issue_count == 0,
                    title,
                    output: report_lines.join("\n"),
                    url: None,
                    metadata: Some(json!({ "issues_count": issue_count, "items": audit_items })),
                })
            }

            "scrape_data" => {
                let container = params
                    .get("container")
                    .or_else(|| params.get("selector"))
                    .and_then(Value::as_str)
                    .unwrap_or("body");

                let fields = params
                    .get("fields")
                    .and_then(Value::as_object)
                    .cloned()
                    .unwrap_or_default();

                let fields_json = serde_json::to_string(&fields).unwrap_or_else(|_| "{}".into());

                let scrape_js = format!(
                    r#"
                    (() => {{
                        const containerSelector = {:?};
                        const fieldMap = {};
                        const containers = document.querySelectorAll(containerSelector);
                        const items = [];
                        for (const cont of containers) {{
                            const item = {{}};
                            for (const [key, sel] of Object.entries(fieldMap)) {{
                                const el = cont.querySelector(sel);
                                item[key] = el ? (el.innerText || el.textContent || '').trim() : null;
                            }}
                            if (Object.keys(fieldMap).length === 0) {{
                                item['text'] = (cont.innerText || cont.textContent || '').trim();
                            }}
                            items.push(item);
                        }}
                        return items;
                    }})()
                    "#,
                    container, fields_json
                );

                let result = engine.evaluate_raw(&scrape_js).await?;
                let count = result.as_array().map(|a| a.len()).unwrap_or(0);
                let json_output = serde_json::to_string_pretty(&result).unwrap_or_default();

                Ok(ActionResult {
                    success: true,
                    title: format!("Scraped {count} Item(s)"),
                    output: json_output,
                    url: None,
                    metadata: Some(result),
                })
            }

            "scrape_source" => {
                let selector = params.get("selector").and_then(Value::as_str);
                let html = engine.get_outer_html(selector).await?;
                let length = html.len();

                let truncated = if length > 50_000 {
                    format!(
                        "{}\n\n<!-- Output truncated at 50,000 characters (total: {length} chars) -->",
                        &html[..50_000]
                    )
                } else {
                    html
                };

                Ok(ActionResult {
                    success: true,
                    title: format!("Page Source HTML ({length} bytes)"),
                    output: truncated,
                    url: None,
                    metadata: Some(json!({ "bytes": length })),
                })
            }

            "scrape_content" => {
                let selector = params.get("selector").and_then(Value::as_str);
                let text = engine.get_text_content(selector).await?;
                let lines_count = text.lines().count();

                Ok(ActionResult {
                    success: true,
                    title: format!("Clean Text Content ({lines_count} lines)"),
                    output: text,
                    url: None,
                    metadata: Some(json!({ "lines": lines_count })),
                })
            }

            "scrape_links" => {
                let container = params.get("container").and_then(Value::as_str);
                let js = format!(
                    r#"
                    (() => {{
                        const root = {:?} ? document.querySelector({:?}) || document : document;
                        const anchors = Array.from(root.querySelectorAll('a[href]'));
                        return anchors.map(a => ({{
                            text: (a.innerText || a.textContent || '').trim(),
                            href: a.href,
                            title: a.getAttribute('title') || ''
                        }})).filter(l => l.href && !l.href.startsWith('javascript:'));
                    }})()
                    "#,
                    container, container
                );

                let result = engine.evaluate_raw(&js).await?;
                let count = result.as_array().map(|a| a.len()).unwrap_or(0);
                let json_output = serde_json::to_string_pretty(&result).unwrap_or_default();

                Ok(ActionResult {
                    success: true,
                    title: format!("Found {count} Link(s)"),
                    output: json_output,
                    url: None,
                    metadata: Some(result),
                })
            }

            "scrape_images" => {
                let container = params.get("container").and_then(Value::as_str);
                let js = format!(
                    r#"
                    (() => {{
                        const root = {:?} ? document.querySelector({:?}) || document : document;
                        const imgs = Array.from(root.querySelectorAll('img'));
                        return imgs.map(i => ({{
                            src: i.src,
                            alt: i.getAttribute('alt') || '',
                            width: i.naturalWidth || i.width,
                            height: i.naturalHeight || i.height
                        }})).filter(i => i.src);
                    }})()
                    "#,
                    container, container
                );

                let result = engine.evaluate_raw(&js).await?;
                let count = result.as_array().map(|a| a.len()).unwrap_or(0);
                let json_output = serde_json::to_string_pretty(&result).unwrap_or_default();

                Ok(ActionResult {
                    success: true,
                    title: format!("Found {count} Image(s)"),
                    output: json_output,
                    url: None,
                    metadata: Some(result),
                })
            }

            "evaluate_js" => {
                let code = params
                    .get("code")
                    .or_else(|| params.get("script"))
                    .and_then(Value::as_str)
                    .ok_or_else(|| "Missing required parameter 'code'".to_string())?;

                let result = engine.evaluate_raw(code).await?;
                let formatted = serde_json::to_string_pretty(&result).unwrap_or_default();

                Ok(ActionResult {
                    success: true,
                    title: "JavaScript Execution Result".to_string(),
                    output: formatted,
                    url: None,
                    metadata: Some(result),
                })
            }

            "console_errors" => {
                let errors = engine.get_console_errors().await;
                let count = errors.len();
                let output = if errors.is_empty() {
                    "No console errors detected.".to_string()
                } else {
                    errors
                        .iter()
                        .map(|e| format!("- {}", e))
                        .collect::<Vec<_>>()
                        .join("\n")
                };

                Ok(ActionResult {
                    success: count == 0,
                    title: format!("Console Errors: {count}"),
                    output,
                    url: None,
                    metadata: Some(json!({ "count": count })),
                })
            }

            "state" => {
                let state = engine.get_page_state().await?;
                let nav_history = if state.history.is_empty() {
                    "None".to_string()
                } else {
                    state.history.join(" -> ")
                };
                let errs = if state.console_errors.is_empty() {
                    "None".to_string()
                } else {
                    state.console_errors.join("; ")
                };
                let output = format!(
                    "<page_state>\nURL: {}\nTitle: {}\nLogged In: {}\nNav History: {}\nConsole Errors: {}\n</page_state>",
                    state.url,
                    state.title,
                    if state.is_logged_in { "Yes" } else { "No" },
                    nav_history,
                    errs
                );

                Ok(ActionResult {
                    success: true,
                    title: "Browser Page State".to_string(),
                    output,
                    url: Some(state.url.clone()),
                    metadata: Some(json!(state)),
                })
            }

            "clear_session" => {
                engine.clear_session().await?;
                coordinator.reset().await;

                Ok(ActionResult {
                    success: true,
                    title: "Browser Session Cleared".to_string(),
                    output: "Cleared all cookies, localStorage, sessionStorage, and reset browser state.".to_string(),
                    url: None,
                    metadata: None,
                })
            }

            "close" => {
                coordinator.close().await?;

                Ok(ActionResult {
                    success: true,
                    title: "Browser Closed".to_string(),
                    output: "Browser process closed cleanly.".to_string(),
                    url: None,
                    metadata: None,
                })
            }

            _ => Err(format!(
                "Unknown browser action: '{action}'. Valid actions: open, login, observe, click, fill, fill_form, scroll, wait, viewport, screenshot, responsive_audit, scrape_data, scrape_source, scrape_content, scrape_links, scrape_images, evaluate_js, console_errors, state, clear_session, close."
            )),
        }
    }
}
