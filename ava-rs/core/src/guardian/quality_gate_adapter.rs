//! Guardian Adapter for the Next-Gen Smart Quality Gate Subsystem.
//!
//! Intercepts Guardian approval requests (diff patches, dangerous execution commands)
//! and evaluates them through the Quality Gate pipeline:
//! 1. Diff discipline & churn analysis
//! 2. Multi-language adversarial safety checks (secrets, unwraps, swallowed errors)
//! 3. Blast radius analysis against critical infrastructure paths
//! 4. Contract & schema drift detection
//! 5. Composite risk scoring (0-100)

use super::GuardianApprovalRequest;
use crate::quality_gate::{
    QualityGate, QualityGateInput, QualityGateResult, QualityGateStatus, RiskLevel,
};
use codex_protocol::protocol::ReviewDecision;

/// Evaluates a Guardian approval request through the Quality Gate.
pub(crate) fn evaluate_guardian_quality_gate(
    request: &GuardianApprovalRequest,
    session_id: &str,
    task_description: Option<&str>,
) -> Option<QualityGateResult> {
    match request {
        GuardianApprovalRequest::ApplyPatch {
            patch, files, cwd, ..
        } => {
            let changed_files: Vec<String> = files.iter().map(|p| p.to_string()).collect();

            let input = QualityGateInput {
                session_id: session_id.to_string(),
                workspace_path: cwd.to_string(),
                task_description: task_description.unwrap_or("apply diff patch").to_string(),
                diff_content: patch.clone(),
                changed_files,
                verification_signals: Vec::new(),
                turn_count: Some(1),
            };

            let result = QualityGate::evaluate(&input);
            Some(result)
        }
        GuardianApprovalRequest::ExecCommand { command, cwd, .. } => {
            let cmd_str = command.join(" ");
            let is_destructive_or_critical = cmd_str.contains("rm -rf")
                || cmd_str.contains("git reset --hard")
                || cmd_str.contains("git clean")
                || cmd_str.contains("dd if=");

            if is_destructive_or_critical {
                let input = QualityGateInput {
                    session_id: session_id.to_string(),
                    workspace_path: cwd.to_string(),
                    task_description: format!("Execute potentially destructive command: {cmd_str}"),
                    diff_content: String::new(),
                    changed_files: vec!["<shell-command>".to_string()],
                    verification_signals: Vec::new(),
                    turn_count: Some(1),
                };
                let mut result = QualityGate::evaluate(&input);
                result.status = QualityGateStatus::Blocked;
                result.summary = format!(
                    "Quality Gate intercepted high-risk destructive shell command: `{cmd_str}`"
                );
                Some(result)
            } else {
                None
            }
        }
        _ => None,
    }
}

/// Applies Quality Gate findings to Guardian's final decision.
///
/// Rules:
/// - If the gate status is `Blocked`, the action is automatically denied with detailed feedback.
/// - If the gate calculates `Critical` risk, automatic approval is prohibited and
///   downgraded to `None` (requiring manual user review).
/// - If clean or low/medium risk, the original decision is honored.
pub(crate) fn apply_quality_gate_decision(
    initial_decision: Option<ReviewDecision>,
    qg_result: &QualityGateResult,
) -> Option<ReviewDecision> {
    if qg_result.status == QualityGateStatus::Blocked {
        tracing::warn!(
            summary = %qg_result.summary,
            risk = qg_result.risk_score.composite_score,
            "Quality Gate blocked the Guardian approval request"
        );

        let rejection_message = if !qg_result.blockers.is_empty() {
            let details = qg_result.blockers.join("; ");
            format!("Quality Gate blocked execution: {details}")
        } else {
            format!("Quality Gate blocked execution: {}", qg_result.summary)
        };

        return Some(ReviewDecision::denied(rejection_message));
    }

    if qg_result.risk_score.risk_level == RiskLevel::Critical {
        tracing::warn!(
            composite_score = qg_result.risk_score.composite_score,
            "Quality Gate marked action as CRITICAL risk. Downgrading to interactive user approval."
        );

        // Disallow automated bypass when risk is critical; escalate to user
        if matches!(
            initial_decision,
            Some(ReviewDecision::Approved | ReviewDecision::ApprovedForSession)
        ) {
            return None;
        }
    }

    initial_decision
}
