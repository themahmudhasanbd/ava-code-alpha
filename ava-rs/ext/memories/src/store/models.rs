use schemars::JsonSchema;
use serde::Deserialize;
use serde::Serialize;
use std::collections::HashMap;

/// A stored persistent memory record.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema)]
#[schemars(deny_unknown_fields)]
pub struct MemoryRecord {
    pub id: String,
    pub scope: String,
    pub domain: String,
    pub category: Option<String>,
    pub tags: Vec<String>,
    pub content: String,
    pub evidence: Option<String>,
    pub evidence_source: Option<String>,
    pub verified: Option<bool>,
    pub source_session: Option<String>,
    pub confidence: f64,
    pub importance: String,
    pub related_files: Option<Vec<String>>,
    pub created_at: String,
    pub last_used_at: Option<String>,
    pub last_verified_at: Option<String>,
    pub use_count: i64,
    pub status: String,
    pub superseded_by: Option<String>,
    pub supersedes: Option<String>,
}

/// A stored session message / conversation memory record.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[schemars(deny_unknown_fields)]
pub struct SessionMemoryRecord {
    pub id: String,
    pub session_id: String,
    pub message_id: String,
    pub content: String,
    pub message_type: String,
    pub created_at: String,
}

/// Memory analytics and statistics.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema)]
#[schemars(deny_unknown_fields)]
pub struct MemoryStats {
    pub total: usize,
    pub domains: HashMap<String, usize>,
    pub avg_confidence: f64,
}
