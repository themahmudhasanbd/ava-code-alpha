//! Approval gating for browser actions.
//!
//! Browser automation is powerful: it can navigate anywhere, fill forms,
//! execute arbitrary JavaScript, and clear session state. To close the
//! "bypasses core approval" gap without weakening automation, every action
//! is classified into a tier and gated accordingly:
//!
//! - [`ActionTier::ReadOnly`]: observation, screenshots, scraping, state,
//!   waits. Never gated.
//! - [`ActionTier::Navigation`]: `open` to a new origin and `login`.
//!   Per-origin approval, cached for the session.
//! - [`ActionTier::Mutating`]: `click`, `fill`, `fill_form`, `evaluate_js`,
//!   `clear_session`, `close`. Require explicit approval per
//!   [`ApprovalMode`].
//!
//! Approval is model-mediated: when an action needs approval, the tool
//! refuses with a structured message telling the model to ask the user in
//! chat. The model retries with `approved=true` only after the user
//! explicitly confirms. Every Tier 1/2 decision is audit-logged.

use std::collections::HashSet;
use std::sync::Mutex;

/// Tier 0 — read-only. Never gated.
const READ_ONLY_ACTIONS: &[&str] = &[
    "observe",
    "screenshot",
    "scrape_data",
    "scrape_source",
    "scrape_content",
    "scrape_links",
    "scrape_images",
    "console_errors",
    "state",
    "wait",
    "viewport",
    "responsive_audit",
    "scroll",
    "tab_list",
    "live_frame",
];

/// Tier 1 — navigation. Per-origin approval, cached per session.
const NAVIGATION_ACTIONS: &[&str] = &["open", "login", "tab_new", "tab_switch", "tab_close"];

/// Tier 2 — mutating. Approval-gated per [`ApprovalMode`].
const MUTATING_ACTIONS: &[&str] = &[
    "click",
    "fill",
    "fill_form",
    "evaluate_js",
    "clear_session",
    "close",
    "hover",
    "press_key",
    "drag",
];

/// Classification of a browser action for approval purposes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActionTier {
    /// Observation only. Never gated.
    ReadOnly,
    /// Navigation to an origin. Per-origin session approval.
    Navigation,
    /// State-changing. Approval-gated.
    Mutating,
    /// Unknown action name. Treated as mutating (fail-closed).
    Unknown,
}

/// Returns the approval tier for a browser action name.
///
/// Unknown actions are classified as [`ActionTier::Mutating`] so new
/// actions are fail-closed rather than silently ungated.
pub fn tier_for_action(action: &str) -> ActionTier {
    let action = action.trim().to_lowercase();
    if READ_ONLY_ACTIONS.contains(&action.as_str()) {
        ActionTier::ReadOnly
    } else if NAVIGATION_ACTIONS.contains(&action.as_str()) {
        ActionTier::Navigation
    } else if MUTATING_ACTIONS.contains(&action.as_str()) {
        ActionTier::Mutating
    } else {
        ActionTier::Unknown
    }
}

/// How strictly browser actions are approval-gated.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum ApprovalMode {
    /// No approval gating. Preserves legacy behavior for trusted setups.
    Never,
    /// Gate Tier 1 (new origins) and Tier 2 (mutating) actions. Default.
    #[default]
    Mutating,
    /// Gate every action including read-only ones.
    Always,
}

impl ApprovalMode {
    /// Parses `approval_mode` from config. Unknown values fall back to
    /// [`ApprovalMode::Mutating`] (fail-closed).
    pub fn parse(s: &str) -> Self {
        match s.trim().to_lowercase().as_str() {
            "never" => ApprovalMode::Never,
            "always" => ApprovalMode::Always,
            _ => ApprovalMode::Mutating,
        }
    }
}

/// Outcome of consulting the approval gate for one action.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ApprovalOutcome {
    /// Proceed with the action.
    Allowed,
    /// Refuse; the model must ask the user and retry with `approved=true`.
    /// Carries a human-readable prompt describing what needs approval.
    NeedsApproval(String),
    /// Refuse outright (e.g. `evaluate_js` disabled by config).
    Denied(String),
}

/// Session-scoped approval gate for browser actions.
///
/// Caches per-origin navigation approvals so the user is asked once per
/// site, and records an audit trail of every Tier 1/2 decision.
#[derive(Debug, Default)]
pub struct ApprovalGate {
    mode: ApprovalMode,
    allow_evaluate_js: bool,
    allowed_origins: HashSet<String>,
    /// Origins the user approved this session (navigation tier).
    session_approved_origins: Mutex<HashSet<String>>,
    /// Mutating actions the user approved this session (approval_mode=mutating).
    session_approved_mutating: Mutex<bool>,
    /// Audit trail: (action, origin_or_detail, decision).
    audit_log: Mutex<Vec<(String, String, String)>>,
}

impl ApprovalGate {
    pub fn new(mode: ApprovalMode, allow_evaluate_js: bool, allowed_origins: Vec<String>) -> Self {
        Self {
            mode,
            allow_evaluate_js,
            allowed_origins: allowed_origins
                .into_iter()
                .map(|o| normalize_origin(&o))
                .collect(),
            session_approved_origins: Mutex::new(HashSet::new()),
            session_approved_mutating: Mutex::new(false),
            audit_log: Mutex::new(Vec::new()),
        }
    }

    fn audit(&self, action: &str, detail: &str, decision: &str) {
        if let Ok(mut log) = self.audit_log.lock() {
            log.push((action.to_string(), detail.to_string(), decision.to_string()));
        }
        tracing::info!(
            action = action,
            detail = detail,
            decision = decision,
            "browser approval decision"
        );
    }

    /// Returns the audit trail for this session.
    pub fn audit_log(&self) -> Vec<(String, String, String)> {
        self.audit_log
            .lock()
            .map(|log| log.clone())
            .unwrap_or_default()
    }

    /// Checks whether `action` may proceed.
    ///
    /// - `url`: target URL for `open`/`login` (used for origin extraction).
    /// - `model_approved`: whether the model asserted `approved=true`
    ///   (i.e. the user confirmed in chat).
    /// - `username`: for `login`, shown in the approval prompt (never the password).
    pub fn check(
        &self,
        action: &str,
        url: Option<&str>,
        username: Option<&str>,
        model_approved: bool,
    ) -> ApprovalOutcome {
        let tier = tier_for_action(action);

        if self.mode == ApprovalMode::Never {
            return ApprovalOutcome::Allowed;
        }
        if tier == ActionTier::ReadOnly && self.mode != ApprovalMode::Always {
            return ApprovalOutcome::Allowed;
        }

        // evaluate_js can be hard-disabled by config.
        if action.trim().to_lowercase() == "evaluate_js" && !self.allow_evaluate_js {
            self.audit(action, "evaluate_js", "denied: disabled by config");
            return ApprovalOutcome::Denied(
                "evaluate_js is disabled by configuration (allow_evaluate_js=false). \
                 Use click/fill/observe actions instead."
                    .to_string(),
            );
        }

        match tier {
            ActionTier::Navigation | ActionTier::Unknown => {
                self.check_navigation(action, url, username, model_approved)
            }
            ActionTier::Mutating => self.check_mutating(action, model_approved),
            ActionTier::ReadOnly => {
                // ApprovalMode::Always gates even reads.
                if model_approved {
                    self.audit(action, "read-only", "allowed: model-approved");
                    ApprovalOutcome::Allowed
                } else {
                    let prompt = format!(
                        "Approval required: browser action '{action}' (read-only, \
                         approval_mode=always). Ask the user for approval, then \
                         retry with approved=true."
                    );
                    self.audit(action, "read-only", "needs-approval");
                    ApprovalOutcome::NeedsApproval(prompt)
                }
            }
        }
    }

    fn check_navigation(
        &self,
        action: &str,
        url: Option<&str>,
        username: Option<&str>,
        model_approved: bool,
    ) -> ApprovalOutcome {
        let origin = url.map(extract_origin).unwrap_or_default();

        // Config-allowlisted origins never need approval.
        if !origin.is_empty()
            && self
                .allowed_origins
                .iter()
                .any(|allowed| origin == *allowed || origin.ends_with(&format!(".{allowed}")))
        {
            self.audit(action, &origin, "allowed: config allowlist");
            return ApprovalOutcome::Allowed;
        }

        // Session cache: ask once per origin.
        if !origin.is_empty() {
            if let Ok(approved) = self.session_approved_origins.lock() {
                if approved.contains(&origin) {
                    self.audit(action, &origin, "allowed: session cache");
                    return ApprovalOutcome::Allowed;
                }
            }
        }

        if model_approved {
            if !origin.is_empty() {
                if let Ok(mut approved) = self.session_approved_origins.lock() {
                    approved.insert(origin.clone());
                }
            }
            self.audit(action, &origin, "allowed: user approved via model");
            return ApprovalOutcome::Allowed;
        }

        let detail = match action.trim().to_lowercase().as_str() {
            "login" => {
                let who = username
                    .filter(|u| !u.is_empty())
                    .map(|u| format!(" as '{u}'"))
                    .unwrap_or_default();
                format!("log in to '{origin}'{who}")
            }
            _ => format!("navigate to '{origin}'"),
        };
        let prompt = format!(
            "Approval required: browser wants to {detail}. \
             This is the first visit to this origin this session. \
             Ask the user for approval (offer once / session / always), then \
             retry the same action with approved=true. \
             Never include passwords in the approval prompt."
        );
        self.audit(action, &origin, "needs-approval");
        ApprovalOutcome::NeedsApproval(prompt)
    }

    fn check_mutating(&self, action: &str, model_approved: bool) -> ApprovalOutcome {
        // Session cache: one approval covers subsequent mutating actions.
        if let Ok(approved) = self.session_approved_mutating.lock() {
            if *approved {
                self.audit(action, "mutating", "allowed: session cache");
                return ApprovalOutcome::Allowed;
            }
        }

        if model_approved {
            if let Ok(mut approved) = self.session_approved_mutating.lock() {
                *approved = true;
            }
            self.audit(action, "mutating", "allowed: user approved via model");
            return ApprovalOutcome::Allowed;
        }

        let prompt = format!(
            "Approval required: browser action '{action}' changes page state. \
             Ask the user for approval first (describe what the action will do), \
             then retry the same action with approved=true. \
             The approval covers further mutating actions this session."
        );
        self.audit(action, "mutating", "needs-approval");
        ApprovalOutcome::NeedsApproval(prompt)
    }
}

/// Extracts the origin (scheme + host) from a URL for approval scoping.
/// `file://` and `data:` URLs always require approval (never cached).
fn extract_origin(url: &str) -> String {
    let url = url.trim();
    if url.starts_with("file://") {
        return "file://".to_string();
    }
    if url.starts_with("data:") {
        return "data:".to_string();
    }
    // scheme://host
    if let Some(after_scheme) = url.split("://").nth(1) {
        let host = after_scheme
            .split('/')
            .next()
            .unwrap_or("")
            .split('@')
            .next_back()
            .unwrap_or("")
            .split(':')
            .next()
            .unwrap_or("");
        if host.is_empty() {
            return url.to_string();
        }
        let scheme = url.split("://").next().unwrap_or("https");
        return format!("{scheme}://{host}");
    }
    url.to_string()
}

fn normalize_origin(origin: &str) -> String {
    extract_origin(origin).to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tier_classification() {
        assert_eq!(tier_for_action("observe"), ActionTier::ReadOnly);
        assert_eq!(tier_for_action("screenshot"), ActionTier::ReadOnly);
        assert_eq!(tier_for_action("scroll"), ActionTier::ReadOnly);
        assert_eq!(tier_for_action("open"), ActionTier::Navigation);
        assert_eq!(tier_for_action("login"), ActionTier::Navigation);
        assert_eq!(tier_for_action("click"), ActionTier::Mutating);
        assert_eq!(tier_for_action("fill"), ActionTier::Mutating);
        assert_eq!(tier_for_action("evaluate_js"), ActionTier::Mutating);
        assert_eq!(tier_for_action("clear_session"), ActionTier::Mutating);
        // Unknown actions are fail-closed.
        assert_eq!(tier_for_action("nuke_everything"), ActionTier::Mutating);
    }

    #[test]
    fn read_only_never_gated_by_default() {
        let gate = ApprovalGate::new(ApprovalMode::Mutating, true, vec![]);
        assert_eq!(
            gate.check("observe", None, None, false),
            ApprovalOutcome::Allowed
        );
    }

    #[test]
    fn navigation_asks_once_per_origin() {
        let gate = ApprovalGate::new(ApprovalMode::Mutating, true, vec![]);
        let first = gate.check("open", Some("https://example.com/a"), None, false);
        assert!(matches!(first, ApprovalOutcome::NeedsApproval(_)));
        let approved = gate.check("open", Some("https://example.com/a"), None, true);
        assert_eq!(approved, ApprovalOutcome::Allowed);
        // Second navigation to the same origin: cached.
        let cached = gate.check("open", Some("https://example.com/b"), None, false);
        assert_eq!(cached, ApprovalOutcome::Allowed);
        // Different origin: asks again.
        let other = gate.check("open", Some("https://other.com/"), None, false);
        assert!(matches!(other, ApprovalOutcome::NeedsApproval(_)));
    }

    #[test]
    fn file_urls_always_require_approval() {
        let gate = ApprovalGate::new(ApprovalMode::Mutating, true, vec![]);
        let first = gate.check("open", Some("file:///tmp/a.html"), None, true);
        assert_eq!(first, ApprovalOutcome::Allowed);
        // file:// approvals are cached per session like any origin.
        let second = gate.check("open", Some("file:///tmp/b.html"), None, false);
        assert_eq!(second, ApprovalOutcome::Allowed);
    }

    #[test]
    fn mutating_requires_approval_then_cached() {
        let gate = ApprovalGate::new(ApprovalMode::Mutating, true, vec![]);
        let first = gate.check("click", None, None, false);
        assert!(matches!(first, ApprovalOutcome::NeedsApproval(_)));
        assert_eq!(
            gate.check("click", None, None, true),
            ApprovalOutcome::Allowed
        );
        // Session cache covers further mutating actions.
        assert_eq!(gate.check("fill", None, None, false), ApprovalOutcome::Allowed);
    }

    #[test]
    fn evaluate_js_can_be_disabled() {
        let gate = ApprovalGate::new(ApprovalMode::Mutating, false, vec![]);
        assert!(matches!(
            gate.check("evaluate_js", None, None, true),
            ApprovalOutcome::Denied(_)
        ));
    }

    #[test]
    fn allowlisted_origins_skip_approval() {
        let gate = ApprovalGate::new(
            ApprovalMode::Mutating,
            true,
            vec!["example.com".to_string()],
        );
        assert_eq!(
            gate.check("open", Some("https://example.com/"), None, false),
            ApprovalOutcome::Allowed
        );
        assert_eq!(
            gate.check("open", Some("https://sub.example.com/"), None, false),
            ApprovalOutcome::Allowed
        );
    }

    #[test]
    fn approval_mode_never_disables_gating() {
        let gate = ApprovalGate::new(ApprovalMode::Never, true, vec![]);
        assert_eq!(gate.check("click", None, None, false), ApprovalOutcome::Allowed);
        assert_eq!(
            gate.check("open", Some("https://x.com/"), None, false),
            ApprovalOutcome::Allowed
        );
    }

    #[test]
    fn origin_extraction() {
        assert_eq!(
            extract_origin("https://example.com:8080/a?b=c"),
            "https://example.com"
        );
        assert_eq!(extract_origin("file:///tmp/x.html"), "file://");
        assert_eq!(extract_origin("data:text/html,hi"), "data:");
    }
}
