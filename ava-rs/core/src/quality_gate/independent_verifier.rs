use super::types::*;
use serde::{Deserialize, Serialize};

pub struct IndependentVerifier;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationSummary {
    pub all_passed: bool,
    pub total_signals: usize,
    pub successful_signals: usize,
    pub failed_signals: usize,
    pub violations: Vec<String>,
}

impl IndependentVerifier {
    pub fn verify_signals(
        signals: &[VerificationSignal],
        task: &TaskClassification,
    ) -> VerificationSummary {
        let mut violations = Vec::new();
        let total_signals = signals.len();
        let mut successful_signals = 0;
        let mut failed_signals = 0;

        let has_test_signal = signals.iter().any(|s| s.signal_type == "test");
        let has_build_signal = signals
            .iter()
            .any(|s| s.signal_type == "build" || s.signal_type == "typecheck");

        for signal in signals {
            if signal.exit_code == 0 {
                successful_signals += 1;

                // Check for hollow test run (e.g. 0 tests run)
                if signal.signal_type == "test" {
                    let out = signal.output.to_lowercase();
                    if out.contains("0 passed")
                        && (out.contains("0 total") || out.contains("no tests"))
                    {
                        violations.push(format!(
                            "Hollow test execution: Test command '{}' exited with 0 but ran zero tests.",
                            signal.command
                        ));
                    }
                }
            } else {
                failed_signals += 1;
                violations.push(format!(
                    "Command '{}' failed with non-zero exit code ({}). Output snippet: {}",
                    signal.command,
                    signal.exit_code,
                    signal.output.lines().take(3).collect::<Vec<_>>().join(" ")
                ));
            }
        }

        // Enforce required signals for high complexity tasks
        if matches!(
            task.complexity,
            TaskComplexity::High | TaskComplexity::VeryHigh
        ) {
            if !has_test_signal {
                violations.push(
                    "High-complexity task requires at least one automated test execution signal."
                        .to_string(),
                );
            }
            if !has_build_signal {
                violations.push(
                    "High-complexity task requires a compilation or typecheck verification signal."
                        .to_string(),
                );
            }
        }

        let all_passed = violations.is_empty() && failed_signals == 0;

        VerificationSummary {
            all_passed,
            total_signals,
            successful_signals,
            failed_signals,
            violations,
        }
    }
}
