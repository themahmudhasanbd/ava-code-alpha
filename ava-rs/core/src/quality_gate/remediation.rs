use super::types::*;

pub struct RemediationEngine;

impl RemediationEngine {
    pub fn generate_remediations(
        findings: &[Finding],
        diff_check: &DiffCheckResult,
        contract_drift: &ContractDriftReport,
    ) -> Vec<AutoRemediation> {
        let mut remediations = Vec::new();

        if diff_check.metrics.has_formatting_churn {
            remediations.push(AutoRemediation {
                rule_id: "FMT001_FORMATTING_CHURN".to_string(),
                description: "Format the codebase using the canonical workspace formatter to eliminate churn.".to_string(),
                action_command: Some("cargo fmt --all && git diff".to_string()),
                suggested_patch: None,
            });
        }

        for finding in findings {
            match finding.rule_id.as_str() {
                "SEC001_HARDCODED_SECRET" => {
                    remediations.push(AutoRemediation {
                        rule_id: finding.rule_id.clone(),
                        description:
                            "Extract sensitive credential to environment variable or secrets store."
                                .to_string(),
                        action_command: None,
                        suggested_patch: Some(
                            "let secret = std::env::var(\"API_SECRET\").map_err(|_| ...)?;"
                                .to_string(),
                        ),
                    });
                }
                "DBG001_LEFTOVER_DEBUG" => {
                    remediations.push(AutoRemediation {
                        rule_id: finding.rule_id.clone(),
                        description:
                            "Strip leftover debug statement or replace with structured logging."
                                .to_string(),
                        action_command: Some("tracing::debug!(target: \"core\", ...);".to_string()),
                        suggested_patch: None,
                    });
                }
                "RUST001_BARE_UNWRAP" => {
                    remediations.push(AutoRemediation {
                        rule_id: finding.rule_id.clone(),
                        description:
                            "Replace bare unwrap with robust error propagation (? operator)."
                                .to_string(),
                        action_command: None,
                        suggested_patch: Some(
                            "value.map_err(|e| anyhow::anyhow!(\"Failed to process: {e}\"))?"
                                .to_string(),
                        ),
                    });
                }
                "RUST002_UNSAFE_BLOCK" => {
                    remediations.push(AutoRemediation {
                        rule_id: finding.rule_id.clone(),
                        description: "Add mandatory // SAFETY: invariant explanation before unsafe block.".to_string(),
                        action_command: None,
                        suggested_patch: Some("// SAFETY: Pointer is guaranteed non-null and valid for the lifetime of self\nunsafe { ... }".to_string()),
                    });
                }
                "ERR001_SWALLOWED_ERROR" => {
                    remediations.push(AutoRemediation {
                        rule_id: finding.rule_id.clone(),
                        description: "Log or rethrow error instead of silently suppressing with empty catch/except.".to_string(),
                        action_command: None,
                        suggested_patch: Some("tracing::warn!(error = ?e, \"Operation failed gracefully\");".to_string()),
                    });
                }
                _ => {}
            }
        }

        if contract_drift.has_contract_drift {
            remediations.push(AutoRemediation {
                rule_id: "DRIFT001_SCHEMA_SYNC".to_string(),
                description:
                    "Synchronize schema updates with corresponding client bindings or data models."
                        .to_string(),
                action_command: Some("pnpm build:types || cargo check --workspace".to_string()),
                suggested_patch: None,
            });
        }

        remediations
    }
}
