use super::types::*;

pub struct BlastRadiusGate;

impl BlastRadiusGate {
    pub const CRITICAL_PATHS: &'static [&'static str] = &[
        "core/src",
        "ava-rs/core",
        "protocol",
        "guardian",
        "exec_policy",
        "execpolicy",
        "security",
        "auth",
        "migrations",
        "schema",
        "Cargo.toml",
        "package.json",
        "pnpm-lock.yaml",
        "Cargo.lock",
        "defs.bzl",
        "BUILD.bazel",
        "MODULE.bazel",
    ];

    pub fn evaluate(changed_files: &[String]) -> BlastRadiusCheckpoint {
        let mut critical_files_touched = Vec::new();

        for file in changed_files {
            let normalized = file.replace('\\', "/");
            if Self::is_critical_path(&normalized) {
                critical_files_touched.push(file.clone());
            }
        }

        let is_multi_core = critical_files_touched.len() >= 2;
        let file_count = changed_files.len();

        let (highest_risk, explanation) = if is_multi_core || file_count >= 8 {
            (
                RiskLevel::Critical,
                format!(
                    "Critical blast radius: {} critical files touched across {} total modifications.",
                    critical_files_touched.len(),
                    file_count
                ),
            )
        } else if !critical_files_touched.is_empty() || file_count >= 4 {
            (
                RiskLevel::High,
                format!(
                    "High blast radius: Touches critical architecture paths ({:?}).",
                    critical_files_touched
                ),
            )
        } else if file_count >= 2 {
            (
                RiskLevel::Medium,
                format!("Moderate blast radius across {} files.", file_count),
            )
        } else {
            (
                RiskLevel::Low,
                "Localized change with low blast radius.".to_string(),
            )
        };

        let requires_explicit_approval =
            matches!(highest_risk, RiskLevel::Critical | RiskLevel::High) || file_count >= 6;

        BlastRadiusCheckpoint {
            highest_risk,
            requires_explicit_approval,
            target_files: changed_files.to_vec(),
            critical_files_touched,
            total_impacted_callers: file_count * 3, // Heuristic caller proxy
            explanation,
        }
    }

    fn is_critical_path(path: &str) -> bool {
        let p = path.to_lowercase();
        Self::CRITICAL_PATHS
            .iter()
            .any(|c| p.contains(&c.to_lowercase()))
    }
}
