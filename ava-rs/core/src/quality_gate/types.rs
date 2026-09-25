use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum QualityGateStatus {
    Verified,
    PartiallyVerified,
    Blocked,
    Unverified,
}

impl std::fmt::Display for QualityGateStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Verified => write!(f, "VERIFIED"),
            Self::PartiallyVerified => write!(f, "PARTIALLY_VERIFIED"),
            Self::Blocked => write!(f, "BLOCKED"),
            Self::Unverified => write!(f, "UNVERIFIED"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    Note,
    Warning,
    Blocker,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Finding {
    pub severity: Severity,
    pub rule_id: String,
    pub message: String,
    pub file: Option<String>,
    pub line: Option<usize>,
    pub suggested_fix: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskType {
    SimpleEdit,
    BugFix,
    Feature,
    Refactor,
    Investigation,
    Ui,
    Backend,
    Testing,
    Performance,
    Security,
    Deployment,
    ContractOrSchema,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskComplexity {
    Low,
    Medium,
    High,
    VeryHigh,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExecutionStep {
    Inspect,
    Understand,
    Explore,
    ImpactAnalysis,
    Plan,
    Implement,
    Validate,
    Review,
    Fix,
    Verify,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionStrategy {
    pub name: String,
    pub steps: Vec<ExecutionStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskClassification {
    pub task_type: TaskType,
    pub complexity: TaskComplexity,
    pub strategy: ExecutionStrategy,
    pub explanation: String,
    pub requires_blast_radius_check: bool,
    pub requires_pre_implementation_plan: bool,
    pub requires_adversarial_review: bool,
    pub requires_contract_drift_check: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskScore {
    /// 0 - 100 overall composite risk score
    pub composite_score: u32,
    pub risk_level: RiskLevel,
    pub blast_radius_subscore: u32,
    pub complexity_subscore: u32,
    pub test_gap_subscore: u32,
    pub scope_drift_subscore: u32,
    pub safety_risk_subscore: u32,
    pub explanation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationSignal {
    pub signal_type: String, // "test", "typecheck", "lint", "build", "custom"
    pub command: String,
    pub exit_code: i32,
    pub output: String,
    pub duration_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlastRadiusCheckpoint {
    pub highest_risk: RiskLevel,
    pub requires_explicit_approval: bool,
    pub target_files: Vec<String>,
    pub critical_files_touched: Vec<String>,
    pub total_impacted_callers: usize,
    pub explanation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffMetrics {
    pub added_lines: usize,
    pub removed_lines: usize,
    pub changed_files_count: usize,
    pub has_formatting_churn: bool,
    pub churn_ratio: f32,
    pub has_unrelated_files: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffCheckResult {
    pub passed: bool,
    pub metrics: DiffMetrics,
    pub violations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractDriftReport {
    pub has_contract_drift: bool,
    pub drift_type: Option<String>,
    pub touched_contracts: Vec<String>,
    pub missing_counterparts: Vec<String>,
    pub violations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoRemediation {
    pub rule_id: String,
    pub description: String,
    pub action_command: Option<String>,
    pub suggested_patch: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityGateInput {
    pub session_id: String,
    pub workspace_path: String,
    pub task_description: String,
    pub diff_content: String,
    pub changed_files: Vec<String>,
    pub verification_signals: Vec<VerificationSignal>,
    pub turn_count: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityGateResult {
    pub status: QualityGateStatus,
    pub approved: bool,
    pub summary: String,
    pub risk_score: RiskScore,
    pub classification: TaskClassification,
    pub blast_radius: BlastRadiusCheckpoint,
    pub diff_check: DiffCheckResult,
    pub contract_drift: ContractDriftReport,
    pub blockers: Vec<String>,
    pub warnings: Vec<String>,
    pub findings: Vec<Finding>,
    pub auto_remediations: Vec<AutoRemediation>,
}
