use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::engine::{BrowserEngine, SemanticRef};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObservationResult {
    pub url: String,
    pub title: String,
    pub elements: Vec<SemanticRef>,
    pub summary: String,
    pub stale: bool,
    pub mode: String,
    pub screenshot_path: Option<String>,
    pub diff: Option<String>,
}

pub struct Observer {
    last_elements_summary: RwLock<String>,
}

impl Observer {
    pub fn new() -> Self {
        Self {
            last_elements_summary: RwLock::new(String::new()),
        }
    }

    pub fn infer_mode(task_intent: Option<&str>) -> &'static str {
        match task_intent {
            Some(intent) => {
                let lower = intent.to_lowercase();
                if lower.contains("visual")
                    || lower.contains("screenshot")
                    || lower.contains("look")
                    || lower.contains("appearance")
                    || lower.contains("layout")
                    || lower.contains("align")
                    || lower.contains("responsive")
                    || lower.contains("design")
                    || lower.contains("mobile view")
                {
                    "visual"
                } else {
                    "functional"
                }
            }
            None => "functional",
        }
    }

    pub async fn observe(
        &self,
        engine: &Arc<BrowserEngine>,
        diff_only: bool,
        visual: bool,
    ) -> Result<ObservationResult, String> {
        let (elements, raw_summary) = engine.scan_dom().await?;
        let page_state = engine.get_page_state().await?;

        let mut diff = None;
        if diff_only {
            let last = self.last_elements_summary.read().await;
            if !last.is_empty() {
                diff = Some(generate_dom_diff(&last, &raw_summary));
            }
        }

        {
            let mut last = self.last_elements_summary.write().await;
            *last = raw_summary.clone();
        }

        let mut screenshot_path = None;
        if visual {
            screenshot_path = engine.screenshot("viewport", None, None).await.ok();
        }

        Ok(ObservationResult {
            url: page_state.url,
            title: page_state.title,
            elements,
            summary: raw_summary,
            stale: false,
            mode: if diff_only { "diff" } else { "full" }.to_string(),
            screenshot_path,
            diff,
        })
    }

    pub async fn reset(&self) {
        let mut last = self.last_elements_summary.write().await;
        last.clear();
    }
}

fn generate_dom_diff(old: &str, new: &str) -> String {
    let old_lines: Vec<&str> = old.lines().collect();
    let new_lines: Vec<&str> = new.lines().collect();

    let mut added = Vec::new();
    let mut removed = Vec::new();

    for line in &new_lines {
        if !old_lines.contains(line) {
            added.push(format!("+ {line}"));
        }
    }

    for line in &old_lines {
        if !new_lines.contains(line) {
            removed.push(format!("- {line}"));
        }
    }

    if added.is_empty() && removed.is_empty() {
        return "No DOM changes detected.".to_string();
    }

    let mut diff = Vec::new();
    if !removed.is_empty() {
        diff.push("--- Removed Elements ---".to_string());
        diff.extend(removed);
    }
    if !added.is_empty() {
        diff.push("+++ Added / Updated Elements +++".to_string());
        diff.extend(added);
    }

    diff.join("\n")
}
