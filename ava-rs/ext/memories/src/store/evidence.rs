/// Inferred provenance and validation status of evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EvidenceSource {
    TestOutcome,
    BuildOutcome,
    RuntimeObservation,
    FileContent,
    ToolOutput,
    UserStatement,
    AgentInference,
}

impl EvidenceSource {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::TestOutcome => "test_outcome",
            Self::BuildOutcome => "build_outcome",
            Self::RuntimeObservation => "runtime_observation",
            Self::FileContent => "file_content",
            Self::ToolOutput => "tool_output",
            Self::UserStatement => "user_statement",
            Self::AgentInference => "agent_inference",
        }
    }
}

/// Infer the provenance, verification status, and default confidence from evidence text.
pub fn infer_evidence_provenance(evidence: Option<&str>) -> (EvidenceSource, bool, f64) {
    let Some(evidence) = evidence else {
        return (EvidenceSource::AgentInference, false, 0.60);
    };

    let trimmed = evidence.trim();
    if trimmed.len() < 5 {
        return (EvidenceSource::AgentInference, false, 0.60);
    }

    let lower = trimmed.to_lowercase();

    // Rejection of placeholder strings
    if matches!(
        lower.as_str(),
        "n/a" | "none" | "manually stored" | "tbd" | "see above" | "inferred" | "null"
    ) {
        return (EvidenceSource::AgentInference, false, 0.50);
    }

    // 1. Explicit user statements
    if lower.contains("user stated")
        || lower.contains("user explicitly")
        || lower.contains("user said")
        || lower.contains("user instructed")
        || lower.contains("user confirmed")
        || lower.contains("boss said")
        || lower.contains("requested by user")
    {
        return (EvidenceSource::UserStatement, true, 0.95);
    }

    // 2. Test outcomes
    if lower.contains("passed")
        || lower.contains("test passed")
        || lower.contains("vitest")
        || lower.contains("cargo test")
        || lower.contains("jest")
        || lower.contains("pytest")
        || lower.contains("tests passed")
        || lower.contains("tests pass")
        || lower.contains("test suite")
    {
        return (EvidenceSource::TestOutcome, true, 0.95);
    }

    // 3. Build outcomes
    if lower.contains("exit code 0")
        || lower.contains("build succeeded")
        || lower.contains("compiled successfully")
        || lower.contains("build passed")
        || lower.contains("npm run build")
        || lower.contains("cargo build")
    {
        return (EvidenceSource::BuildOutcome, true, 0.95);
    }

    // 4. Runtime observations
    if lower.contains("http 200")
        || lower.contains("http 201")
        || lower.contains("status code 200")
        || lower.contains("endpoint returned")
        || lower.contains("curl output")
        || lower.contains("response status")
    {
        return (EvidenceSource::RuntimeObservation, true, 0.95);
    }

    // 5. File content inspections
    if lower.contains("read from line")
        || lower.contains("read line")
        || lower.contains("line ")
        || lower.contains("found in ")
        || lower.contains(".rs:")
        || lower.contains(".ts:")
        || lower.contains(".json")
        || lower.contains(".toml")
    {
        return (EvidenceSource::FileContent, true, 0.90);
    }

    // 6. Tool output
    if lower.contains("ripgrep")
        || lower.contains("rg output")
        || lower.contains("grep output")
        || lower.contains("find output")
        || lower.contains("tool output")
    {
        return (EvidenceSource::ToolOutput, true, 0.90);
    }

    (EvidenceSource::AgentInference, false, 0.60)
}
