use super::*;

#[test]
fn test_task_classification() {
    let simple = TaskClassifier::classify("fix typo in readme", &["README.md".to_string()]);
    assert_eq!(simple.task_type, TaskType::BugFix);
    assert_eq!(simple.complexity, TaskComplexity::Low);

    let contract = TaskClassifier::classify(
        "update database migration",
        &["migrations/001_users.sql".to_string()],
    );
    assert_eq!(contract.task_type, TaskType::ContractOrSchema);
    assert_eq!(contract.complexity, TaskComplexity::VeryHigh);
    assert!(contract.requires_contract_drift_check);
}

#[test]
fn test_blast_radius() {
    let safe_files = vec!["docs/readme.md".to_string()];
    let res_safe = BlastRadiusGate::evaluate(&safe_files);
    assert_eq!(res_safe.highest_risk, RiskLevel::Low);
    assert!(!res_safe.requires_explicit_approval);

    let critical_files = vec![
        "ava-rs/core/src/guardian/mod.rs".to_string(),
        "ava-rs/core/src/lib.rs".to_string(),
    ];
    let res_critical = BlastRadiusGate::evaluate(&critical_files);
    assert!(res_critical.requires_explicit_approval);
    assert!(matches!(
        res_critical.highest_risk,
        RiskLevel::Critical | RiskLevel::High
    ));
}

#[test]
fn test_adversarial_reviewer_catches_secrets_and_bugs() {
    let diff = r#"
--- a/src/auth.rs
+++ b/src/auth.rs
@@ -1,3 +1,6 @@
+let api_key = "sk-proj-123456789012345678901234567890";
+if (score === NaN) {}
+try { doWork(); } catch {}
"#;

    let (_, parsed) = DiffDisciplineGuard::audit(diff, None);
    let findings = AdversarialReviewer::review_diff(&parsed, "update auth logic");

    let has_secret = findings
        .iter()
        .any(|f| f.rule_id == "SEC001_HARDCODED_SECRET");
    let has_nan = findings.iter().any(|f| f.rule_id == "JS001_NAN_EQUALITY");
    let has_catch = findings
        .iter()
        .any(|f| f.rule_id == "ERR001_SWALLOWED_ERROR");

    assert!(has_secret, "Should catch hardcoded secret");
    assert!(has_nan, "Should catch NaN comparison");
    assert!(has_catch, "Should catch swallowed empty catch");
}

#[test]
fn test_independent_verifier() {
    let classification = TaskClassifier::classify(
        "implement feature",
        &[
            "file1.rs".to_string(),
            "file2.rs".to_string(),
            "file3.rs".to_string(),
            "file4.rs".to_string(),
        ],
    );

    let failed_signal = vec![VerificationSignal {
        signal_type: "test".to_string(),
        command: "cargo test".to_string(),
        exit_code: 101,
        output: "assertion failed: `(left == right)`".to_string(),
        duration_ms: Some(120),
    }];

    let res = IndependentVerifier::verify_signals(&failed_signal, &classification);
    assert!(!res.all_passed);
    assert_eq!(res.failed_signals, 1);
}

#[test]
fn test_end_to_end_quality_gate() {
    let input = QualityGateInput {
        session_id: "test-session".to_string(),
        workspace_path: "/var/www/ava-code".to_string(),
        task_description: "Refactor session handling and add safety checks".to_string(),
        diff_content: r#"
--- a/src/session.rs
+++ b/src/session.rs
@@ -10,2 +10,4 @@
+let _ = perform_action();
+tracing::info!("Session updated");
"#
        .to_string(),
        changed_files: vec!["src/session.rs".to_string()],
        verification_signals: vec![VerificationSignal {
            signal_type: "test".to_string(),
            command: "cargo test -p codex-core".to_string(),
            exit_code: 0,
            output: "test result: ok. 15 passed; 0 failed".to_string(),
            duration_ms: Some(400),
        }],
        turn_count: Some(2),
    };

    let result = QualityGate::evaluate(&input);
    assert!(result.approved);
    assert_eq!(result.status, QualityGateStatus::Verified);
    assert!(result.risk_score.composite_score < 75);
}
