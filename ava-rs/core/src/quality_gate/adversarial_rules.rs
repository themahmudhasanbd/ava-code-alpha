use super::diff_guard::ParsedDiff;
use super::types::*;

pub struct AdversarialReviewer;

impl AdversarialReviewer {
    pub fn review_diff(parsed_diff: &ParsedDiff, task_prompt: &str) -> Vec<Finding> {
        let mut findings = Vec::new();
        let prompt_lower = task_prompt.to_lowercase();

        let allows_debug = prompt_lower.contains("debug")
            || prompt_lower.contains("logging")
            || prompt_lower.contains("logger");
        let allows_stub = prompt_lower.contains("scaffold")
            || prompt_lower.contains("stub")
            || prompt_lower.contains("placeholder");

        for line in &parsed_diff.added {
            let content = &line.content;
            let trimmed = content.trim();

            if trimmed.is_empty() || Self::is_comment(trimmed) {
                continue;
            }

            // 1. Secrets and hardcoded credentials
            if Self::has_secret_pattern(trimmed) {
                findings.push(Finding {
                    severity: Severity::Blocker,
                    rule_id: "SEC001_HARDCODED_SECRET".to_string(),
                    message: "Hardcoded secret, API key, or private token detected in added code."
                        .to_string(),
                    file: Some(line.file.clone()),
                    line: None,
                    suggested_fix: Some(
                        "Use environment variables or secure credential storage.".to_string(),
                    ),
                });
            }

            // 2. Leftover debug statements
            if !allows_debug && (trimmed.contains("console.log(") || trimmed.contains("debugger;"))
            {
                findings.push(Finding {
                    severity: Severity::Warning,
                    rule_id: "DBG001_LEFTOVER_DEBUG".to_string(),
                    message: "Leftover debugging statement (console.log / debugger) in added code."
                        .to_string(),
                    file: Some(line.file.clone()),
                    line: None,
                    suggested_fix: Some(
                        "Remove console.log or replace with structured tracing/logging."
                            .to_string(),
                    ),
                });
            }

            // 3. Rust specific: unwrap() in non-test production code
            if line.file.ends_with(".rs") && !line.file.contains("test") {
                if trimmed.contains(".unwrap()") {
                    findings.push(Finding {
                        severity: Severity::Warning,
                        rule_id: "RUST001_BARE_UNWRAP".to_string(),
                        message: "Bare .unwrap() in non-test Rust source can cause unexpected runtime panics.".to_string(),
                        file: Some(line.file.clone()),
                        line: None,
                        suggested_fix: Some("Use '?' operator, unwrap_or_default(), or match with error handling.".to_string()),
                    });
                }

                if trimmed.contains("unsafe {") || trimmed.starts_with("unsafe fn ") {
                    findings.push(Finding {
                        severity: Severity::Warning,
                        rule_id: "RUST002_UNSAFE_BLOCK".to_string(),
                        message: "Unsafe block added in Rust codebase. Requires explicit // SAFETY: justification.".to_string(),
                        file: Some(line.file.clone()),
                        line: None,
                        suggested_fix: Some("Document invariants with '// SAFETY: ...' comment before the unsafe block.".to_string()),
                    });
                }
            }

            // 4. Broken comparison checks
            if trimmed.contains("== NaN")
                || trimmed.contains("=== NaN")
                || trimmed.contains("!= NaN")
                || trimmed.contains("!== NaN")
            {
                findings.push(Finding {
                    severity: Severity::Blocker,
                    rule_id: "JS001_NAN_EQUALITY".to_string(),
                    message: "Comparison against NaN using equality will never evaluate to true."
                        .to_string(),
                    file: Some(line.file.clone()),
                    line: None,
                    suggested_fix: Some("Use Number.isNaN(val) instead.".to_string()),
                });
            }

            // 5. Silent error swallowing
            if (trimmed.contains("catch") && trimmed.contains("{}"))
                || trimmed.contains("catch (") && trimmed.ends_with("{}")
                || trimmed.contains("except:")
                    && (trimmed.contains("pass") || trimmed.contains("..."))
            {
                findings.push(Finding {
                    severity: Severity::Blocker,
                    rule_id: "ERR001_SWALLOWED_ERROR".to_string(),
                    message: "Empty catch/except block silently swallows errors, concealing system failures.".to_string(),
                    file: Some(line.file.clone()),
                    line: None,
                    suggested_fix: Some("Log the error or re-throw appropriately.".to_string()),
                });
            }

            // 6. Incomplete implementation stubs
            if !allows_stub
                && (trimmed.contains("TODO:")
                    || trimmed.contains("FIXME:")
                    || trimmed.contains("XXX")
                    || trimmed.contains("HACK:"))
            {
                findings.push(Finding {
                    severity: Severity::Warning,
                    rule_id: "STUB001_TODO_MARKER".to_string(),
                    message: "Incomplete implementation marker (TODO/FIXME/HACK) added in production code.".to_string(),
                    file: Some(line.file.clone()),
                    line: None,
                    suggested_fix: Some("Complete the implementation or record as an explicit tracking issue.".to_string()),
                });
            }
        }

        findings
    }

    fn is_comment(line: &str) -> bool {
        line.starts_with("//")
            || line.starts_with("/*")
            || line.starts_with('*')
            || line.starts_with('#')
            || line.starts_with("--")
            || line.starts_with("<!--")
    }

    fn has_secret_pattern(line: &str) -> bool {
        let l = line.to_lowercase();
        if l.contains("sk-") && line.len() > 25 {
            return true;
        }
        if l.contains("ghp_") && line.len() > 25 {
            return true;
        }
        if line.contains("AKIA") && line.len() >= 20 {
            return true;
        }
        if line.contains("-----BEGIN PRIVATE KEY-----")
            || line.contains("-----BEGIN RSA PRIVATE KEY-----")
        {
            return true;
        }
        if (l.contains("api_key")
            || l.contains("apikey")
            || l.contains("secret")
            || l.contains("password"))
            && (line.contains("=\"")
                || line.contains(": \"")
                || line.contains("='")
                || line.contains(": '"))
            && line.len() > 30
        {
            return true;
        }
        false
    }
}
