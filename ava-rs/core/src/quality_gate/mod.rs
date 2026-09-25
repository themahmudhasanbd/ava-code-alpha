pub mod adversarial_rules;
pub mod blast_radius;
pub mod classifier;
pub mod contract_drift;
pub mod diff_guard;
pub mod independent_verifier;
pub mod remediation;
pub mod types;

#[cfg(test)]
mod tests;

pub use adversarial_rules::AdversarialReviewer;
pub use blast_radius::BlastRadiusGate;
pub use classifier::TaskClassifier;
pub use contract_drift::ContractDriftGate;
pub use diff_guard::DiffDisciplineGuard;
pub use independent_verifier::IndependentVerifier;
pub use remediation::RemediationEngine;
pub use types::*;

pub struct QualityGate;

impl QualityGate {
    /// Comprehensive Next-Gen Quality Gate evaluation pipeline
    pub fn evaluate(input: &QualityGateInput) -> QualityGateResult {
        // 1. Task Classification & Strategy Selection
        let classification =
            TaskClassifier::classify(&input.task_description, &input.changed_files);

        // 2. Blast Radius Assessment
        let blast_radius = BlastRadiusGate::evaluate(&input.changed_files);

        // 3. Diff Discipline Check (formatting churn, scope creep)
        let (diff_check, parsed_diff) =
            DiffDisciplineGuard::audit(&input.diff_content, Some(&input.changed_files));

        // 4. Adversarial Syntactic & Rule-based Review
        let findings = AdversarialReviewer::review_diff(&parsed_diff, &input.task_description);

        // 5. Schema and Contract Drift Guard
        let contract_drift = ContractDriftGate::evaluate(&input.changed_files);

        // 6. Independent Programmatic Verification (exit codes)
        let verification =
            IndependentVerifier::verify_signals(&input.verification_signals, &classification);

        // 7. Multi-Vector Risk Scoring (0 - 100)
        let risk_score = Self::calculate_risk_score(
            &classification,
            &blast_radius,
            &diff_check,
            &findings,
            &verification,
            &contract_drift,
        );

        // 8. Auto-Remediation Suggestions
        let auto_remediations =
            RemediationEngine::generate_remediations(&findings, &diff_check, &contract_drift);

        // 9. Consolidate Blockers and Warnings
        let mut blockers = Vec::new();
        let mut warnings = Vec::new();

        for finding in &findings {
            match finding.severity {
                Severity::Blocker => {
                    blockers.push(format!("[{}] {}", finding.rule_id, finding.message))
                }
                Severity::Warning => {
                    warnings.push(format!("[{}] {}", finding.rule_id, finding.message))
                }
                Severity::Note => {}
            }
        }

        for v in &diff_check.violations {
            warnings.push(format!("[DIFF_GUARD] {}", v));
        }

        for v in &contract_drift.violations {
            blockers.push(format!("[CONTRACT_DRIFT] {}", v));
        }

        for v in &verification.violations {
            blockers.push(format!("[VERIFIER] {}", v));
        }

        // Loop detection heuristic
        if let Some(turns) = input.turn_count {
            if turns >= 8 && risk_score.composite_score >= 50 {
                warnings.push(format!(
                    "Iteration budget warning: Turn count ({}) is high. Potential hallucination loop.",
                    turns
                ));
            }
        }

        // 10. Determine Final Gate Status
        let (status, approved) = if !blockers.is_empty() {
            (QualityGateStatus::Blocked, false)
        } else if !warnings.is_empty() {
            (QualityGateStatus::PartiallyVerified, true)
        } else if verification.successful_signals > 0 {
            (QualityGateStatus::Verified, true)
        } else {
            (QualityGateStatus::Unverified, false)
        };

        let summary = format!(
            "Quality Gate: {} (Score: {}/100, Risk: {:?}) | Blockers: {}, Warnings: {}, Remediations: {}",
            status,
            risk_score.composite_score,
            risk_score.risk_level,
            blockers.len(),
            warnings.len(),
            auto_remediations.len()
        );

        QualityGateResult {
            status,
            approved,
            summary,
            risk_score,
            classification,
            blast_radius,
            diff_check,
            contract_drift,
            blockers,
            warnings,
            findings,
            auto_remediations,
        }
    }

    fn calculate_risk_score(
        classification: &TaskClassification,
        blast_radius: &BlastRadiusCheckpoint,
        diff_check: &DiffCheckResult,
        findings: &[Finding],
        verification: &independent_verifier::VerificationSummary,
        contract_drift: &ContractDriftReport,
    ) -> RiskScore {
        let blast_radius_subscore = match blast_radius.highest_risk {
            RiskLevel::Low => 10,
            RiskLevel::Medium => 35,
            RiskLevel::High => 70,
            RiskLevel::Critical => 95,
        };

        let complexity_subscore = match classification.complexity {
            TaskComplexity::Low => 10,
            TaskComplexity::Medium => 30,
            TaskComplexity::High => 65,
            TaskComplexity::VeryHigh => 90,
        };

        let test_gap_subscore = if verification.all_passed && verification.successful_signals > 0 {
            0
        } else if verification.failed_signals > 0 {
            90
        } else {
            40 // Unverified
        };

        let scope_drift_subscore = if diff_check.metrics.has_formatting_churn {
            50
        } else if diff_check.metrics.has_unrelated_files {
            75
        } else {
            10
        };

        let mut safety_risk_subscore: u32 = 0;
        for f in findings {
            match f.severity {
                Severity::Blocker => safety_risk_subscore = safety_risk_subscore.saturating_add(35),
                Severity::Warning => safety_risk_subscore = safety_risk_subscore.saturating_add(15),
                Severity::Note => safety_risk_subscore = safety_risk_subscore.saturating_add(5),
            }
        }
        if contract_drift.has_contract_drift {
            safety_risk_subscore = safety_risk_subscore.saturating_add(25);
        }
        safety_risk_subscore = safety_risk_subscore.min(100);

        // Weighted composite calculation:
        // Blast (35%) + Complexity (25%) + Test Gap (20%) + Scope (10%) + Safety (10%)
        let composite = (blast_radius_subscore as f32 * 0.35)
            + (complexity_subscore as f32 * 0.25)
            + (test_gap_subscore as f32 * 0.20)
            + (scope_drift_subscore as f32 * 0.10)
            + (safety_risk_subscore as f32 * 0.10);

        let composite_score = (composite.round() as u32).min(100);

        let risk_level = if composite_score >= 80 {
            RiskLevel::Critical
        } else if composite_score >= 55 {
            RiskLevel::High
        } else if composite_score >= 25 {
            RiskLevel::Medium
        } else {
            RiskLevel::Low
        };

        let explanation = format!(
            "Composite risk score: {}/100 (Blast: {}, Complexity: {}, TestGap: {}, Scope: {}, Safety: {})",
            composite_score,
            blast_radius_subscore,
            complexity_subscore,
            test_gap_subscore,
            scope_drift_subscore,
            safety_risk_subscore
        );

        RiskScore {
            composite_score,
            risk_level,
            blast_radius_subscore,
            complexity_subscore,
            test_gap_subscore,
            scope_drift_subscore,
            safety_risk_subscore,
            explanation,
        }
    }
}
