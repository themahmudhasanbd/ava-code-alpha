use super::types::*;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct ParsedDiffLine {
    pub file: String,
    pub content: String,
}

#[derive(Debug, Clone, Default)]
pub struct ParsedDiff {
    pub added: Vec<ParsedDiffLine>,
    pub removed: Vec<ParsedDiffLine>,
    pub files: Vec<String>,
}

pub struct DiffDisciplineGuard;

impl DiffDisciplineGuard {
    pub fn parse_unified_diff(diff_text: &str) -> ParsedDiff {
        let mut added = Vec::new();
        let mut removed = Vec::new();
        let mut files = Vec::new();
        let mut current_file = String::new();

        for line in diff_text.lines() {
            if line.starts_with("+++ ") {
                let path_str = line[4..].trim_start_matches("b/").trim();
                if !path_str.is_empty() && path_str != "/dev/null" {
                    current_file = path_str.to_string();
                    if !files.contains(&current_file) {
                        files.push(current_file.clone());
                    }
                }
                continue;
            }

            if line.starts_with("--- ") {
                let path_str = line[4..].trim_start_matches("a/").trim();
                if !path_str.is_empty() && path_str != "/dev/null" && current_file.is_empty() {
                    current_file = path_str.to_string();
                    if !files.contains(&current_file) {
                        files.push(current_file.clone());
                    }
                }
                continue;
            }

            if line.starts_with("diff --git") {
                current_file.clear();
                continue;
            }

            if line.starts_with("@@") || line.starts_with("index ") || line.starts_with('\\') {
                continue;
            }

            if let Some(content) = line.strip_prefix('+') {
                added.push(ParsedDiffLine {
                    file: current_file.clone(),
                    content: content.to_string(),
                });
            } else if let Some(content) = line.strip_prefix('-') {
                removed.push(ParsedDiffLine {
                    file: current_file.clone(),
                    content: content.to_string(),
                });
            }
        }

        ParsedDiff {
            added,
            removed,
            files,
        }
    }

    pub fn audit(
        diff_text: &str,
        expected_files: Option<&[String]>,
    ) -> (DiffCheckResult, ParsedDiff) {
        let parsed = Self::parse_unified_diff(diff_text);
        let mut violations = Vec::new();

        let added_count = parsed.added.len();
        let removed_count = parsed.removed.len();
        let total_changed = added_count + removed_count;

        // Detect formatting churn (same trimmed line in added and removed)
        let mut removed_pool: HashMap<String, usize> = HashMap::new();
        for r in &parsed.removed {
            let trimmed = r.content.trim().to_string();
            if !trimmed.is_empty() {
                *removed_pool.entry(trimmed).or_insert(0) += 1;
            }
        }

        let mut churn_pairs = 0;
        for a in &parsed.added {
            let trimmed = a.content.trim().to_string();
            if let Some(count) = removed_pool.get_mut(&trimmed) {
                if *count > 0 {
                    *count -= 1;
                    churn_pairs += 1;
                }
            }
        }

        let churn_ratio = if total_changed > 0 {
            (churn_pairs * 2) as f32 / total_changed as f32
        } else {
            0.0
        };

        let has_formatting_churn = total_changed >= 12 && churn_ratio >= 0.45;
        if has_formatting_churn {
            violations.push(format!(
                "Formatting churn detected: {:.1}% of changed lines are whitespace/formatting edits.",
                churn_ratio * 100.0
            ));
        }

        // Scope check
        let mut has_unrelated_files = false;
        if let Some(expected) = expected_files {
            if !expected.is_empty() {
                for file in &parsed.files {
                    if !expected
                        .iter()
                        .any(|exp| file.contains(exp) || exp.contains(file))
                    {
                        has_unrelated_files = true;
                        violations.push(format!(
                            "File '{}' was modified but not declared in scope.",
                            file
                        ));
                    }
                }
            }
        }

        let metrics = DiffMetrics {
            added_lines: added_count,
            removed_lines: removed_count,
            changed_files_count: parsed.files.len(),
            has_formatting_churn,
            churn_ratio,
            has_unrelated_files,
        };

        let passed = violations.is_empty();

        (
            DiffCheckResult {
                passed,
                metrics,
                violations,
            },
            parsed,
        )
    }
}
