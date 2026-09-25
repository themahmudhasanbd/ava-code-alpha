use super::types::*;

pub struct TaskClassifier;

impl TaskClassifier {
    pub fn classify(prompt: &str, changed_files: &[String]) -> TaskClassification {
        let p = prompt.to_lowercase();
        let file_count = changed_files.len();

        let is_contract = changed_files.iter().any(|f| {
            let lower = f.to_lowercase();
            lower.ends_with(".proto")
                || lower.ends_with("schema.json")
                || lower.contains("schema")
                || lower.contains("migration")
                || lower.contains("protocol")
        }) || p.contains("schema")
            || p.contains("migration")
            || p.contains("protocol")
            || p.contains("api contract");

        let is_security = p.contains("security")
            || p.contains("vulnerability")
            || p.contains("cve")
            || p.contains("auth")
            || p.contains("secret")
            || p.contains("token")
            || p.contains("credential")
            || p.contains("permission");

        let is_refactor = p.contains("refactor")
            || p.contains("clean up")
            || p.contains("cleanup")
            || p.contains("restructure")
            || p.contains("reorganize");

        let is_bug_fix = p.contains("fix")
            || p.contains("bug")
            || p.contains("issue")
            || p.contains("error")
            || p.contains("crash")
            || p.contains("panic")
            || p.contains("regression");

        let is_performance = p.contains("perf")
            || p.contains("performance")
            || p.contains("optimize")
            || p.contains("latency")
            || p.contains("memory leak")
            || p.contains("throughput");

        let is_ui = changed_files.iter().any(|f| {
            let lower = f.to_lowercase();
            lower.ends_with(".tsx")
                || lower.ends_with(".jsx")
                || lower.ends_with(".html")
                || lower.ends_with(".css")
                || lower.ends_with(".scss")
                || lower.contains("component")
                || lower.contains("ui")
        }) || p.contains("ui")
            || p.contains("style")
            || p.contains("css")
            || p.contains("button")
            || p.contains("layout")
            || p.contains("frontend");

        let task_type = if is_contract {
            TaskType::ContractOrSchema
        } else if is_security {
            TaskType::Security
        } else if is_performance {
            TaskType::Performance
        } else if is_bug_fix {
            TaskType::BugFix
        } else if is_refactor {
            TaskType::Refactor
        } else if is_ui {
            TaskType::Ui
        } else if file_count > 3
            || p.contains("feature")
            || p.contains("add ")
            || p.contains("implement")
        {
            TaskType::Feature
        } else {
            TaskType::SimpleEdit
        };

        // Determine complexity
        let complexity = if file_count >= 6
            || p.contains("across all")
            || p.contains("architect")
            || is_contract
        {
            TaskComplexity::VeryHigh
        } else if file_count >= 3 || is_refactor || is_security || is_performance {
            TaskComplexity::High
        } else if file_count > 1 || is_bug_fix {
            TaskComplexity::Medium
        } else {
            TaskComplexity::Low
        };

        // Execution strategy
        let (strategy_name, steps) = match complexity {
            TaskComplexity::Low => (
                "direct_edit".to_string(),
                vec![
                    ExecutionStep::Inspect,
                    ExecutionStep::Implement,
                    ExecutionStep::Validate,
                ],
            ),
            TaskComplexity::Medium => (
                "focused_fix".to_string(),
                vec![
                    ExecutionStep::Inspect,
                    ExecutionStep::Understand,
                    ExecutionStep::Implement,
                    ExecutionStep::Validate,
                    ExecutionStep::Review,
                ],
            ),
            TaskComplexity::High => (
                "proportional_feature".to_string(),
                vec![
                    ExecutionStep::Inspect,
                    ExecutionStep::ImpactAnalysis,
                    ExecutionStep::Plan,
                    ExecutionStep::Implement,
                    ExecutionStep::Validate,
                    ExecutionStep::Review,
                    ExecutionStep::Verify,
                ],
            ),
            TaskComplexity::VeryHigh => (
                "full_enterprise_chain".to_string(),
                vec![
                    ExecutionStep::Explore,
                    ExecutionStep::ImpactAnalysis,
                    ExecutionStep::Plan,
                    ExecutionStep::Implement,
                    ExecutionStep::Validate,
                    ExecutionStep::Review,
                    ExecutionStep::Fix,
                    ExecutionStep::Verify,
                ],
            ),
        };

        let requires_blast_radius_check =
            matches!(complexity, TaskComplexity::High | TaskComplexity::VeryHigh)
                || is_contract
                || file_count >= 3;

        let requires_pre_implementation_plan =
            matches!(complexity, TaskComplexity::High | TaskComplexity::VeryHigh);
        let requires_adversarial_review = true; // Always on to maintain absolute safety
        let requires_contract_drift_check =
            is_contract || matches!(complexity, TaskComplexity::VeryHigh);

        let explanation = format!(
            "Classified as {:?} with {:?} complexity based on {} touched files and semantic intent keywords.",
            task_type, complexity, file_count
        );

        TaskClassification {
            task_type,
            complexity,
            strategy: ExecutionStrategy {
                name: strategy_name,
                steps,
            },
            explanation,
            requires_blast_radius_check,
            requires_pre_implementation_plan,
            requires_adversarial_review,
            requires_contract_drift_check,
        }
    }
}
