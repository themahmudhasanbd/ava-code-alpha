use std::path::PathBuf;

use chrono::Utc;
use codex_config::types::MemoriesConfig;
use codex_extension_api::FunctionCallError;
use codex_extension_api::JsonToolOutput;
use codex_extension_api::ResponsesApiTool;
use codex_extension_api::ToolCall;
use codex_extension_api::ToolExecutor;
use codex_extension_api::ToolName;
use codex_extension_api::ToolSpec;
use codex_extension_api::parse_tool_input_schema;
use codex_otel::MetricsClient;
use codex_tools::ResponsesApiNamespace;
use codex_tools::ResponsesApiNamespaceTool;
use codex_tools::default_namespace_description;
use schemars::JsonSchema;
use serde::Deserialize;
use serde::Serialize;
use serde_json::json;
use uuid::Uuid;

use crate::MEMORY_TOOLS_NAMESPACE;
use crate::schema;
use crate::store::MemoryRecord;
use crate::store::MemoryStats;
use crate::store::PersistentMemoryStore;
use crate::store::SessionMemoryRecord;
use crate::store::SessionMemoryStore;
use crate::store::infer_evidence_provenance;
use crate::store::resolve_global_memory_db;
use crate::store::resolve_global_session_memory_db;
use crate::store::resolve_project_memory_db;
use crate::store::resolve_project_session_memory_db;

pub const UNIFIED_MEMORY_TOOL_NAME: &str = "memory";

#[derive(Debug, Clone, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct UnifiedMemoryArgs {
    /// Action to perform: 'search', 'save', 'update', 'delete', 'reset', 'list', 'get', 'stats', 'session_search', 'session_list', 'session_get', 'session_save'.
    pub action: String,
    /// Search query string for full-text search across persistent memories or past session messages.
    pub query: Option<String>,
    /// The core knowledge, architectural rule, bug fix learning, or design specification to save or update.
    pub content: Option<String>,
    /// Concrete evidence or test output justifying this memory (required when saving).
    pub evidence: Option<String>,
    /// Importance level ('critical', 'high', 'normal', 'low') for retention and priority.
    pub importance: Option<String>,
    /// Domain tag (e.g. 'design', 'architecture', 'bug_fix', 'convention', 'deployment', 'testing', 'auth').
    pub domain: Option<String>,
    /// Category classification ('architecture', 'business_rule', 'bug_fix', 'design_token', 'security', 'preference', 'general').
    pub category: Option<String>,
    /// Memory scope: 'project' (.ava-code/memory/ or .ava/memory/), 'global' (~/.local/share/ava-code/), or 'all'. Default: 'project'.
    pub scope: Option<String>,
    /// Record ID to retrieve, update, or delete.
    pub id: Option<String>,
    /// Array of record IDs for batch deletion.
    pub ids: Option<Vec<String>>,
    /// Array of search tags/keywords for this memory.
    pub tags: Option<Vec<String>>,
    /// Array of relative file paths related to this memory.
    pub related_files: Option<Vec<String>>,
    /// Memory status: 'active', 'archived', or 'superseded'.
    pub status: Option<String>,
    /// Maximum number of memory records to return.
    pub limit: Option<usize>,
    /// Filter results to a specific session ID, or 'all' to search across sessions.
    pub session_id: Option<String>,
    /// Whether to search across past sessions (default: true).
    pub cross_session: Option<bool>,
    /// Explicit target memory type: 'persistent' or 'session'.
    pub memory_type: Option<String>,
    /// Confirmation flag to proceed with memory reset (default: true).
    pub confirm: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Serialize, JsonSchema)]
#[schemars(deny_unknown_fields)]
pub struct UnifiedMemoryResponse {
    pub success: bool,
    pub title: String,
    pub output: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub count: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub record_id: Option<String>,
}

#[derive(Clone)]
pub struct UnifiedMemoryTool {
    pub workspace_dir: PathBuf,
    pub config: MemoriesConfig,
    pub metrics_client: Option<MetricsClient>,
}

impl UnifiedMemoryTool {
    pub fn new(
        workspace_dir: PathBuf,
        config: MemoriesConfig,
        metrics_client: Option<MetricsClient>,
    ) -> Self {
        Self {
            workspace_dir,
            config,
            metrics_client,
        }
    }
}

impl<'call> ToolExecutor<ToolCall<'call>> for UnifiedMemoryTool {
    fn tool_name(&self) -> ToolName {
        super::memory_tool_name(UNIFIED_MEMORY_TOOL_NAME)
    }

    fn spec(&self) -> ToolSpec {
        let tool = ResponsesApiTool {
            name: UNIFIED_MEMORY_TOOL_NAME.to_string(),
            description: r#"Search, save, update, delete, reset, list, or inspect persistent knowledge and past session conversation memories in SQLite FTS5.

Supported Actions:
- 'search': Full-text search across persistent knowledge, rules, bug fixes, architecture, design tokens, or past sessions (with automatic fallback).
- 'save' / 'store': Save verified persistent knowledge, conventions, bug fixes, or architecture decisions with evidence.
- 'update': Update an existing memory record's content, evidence, importance, or domain by ID.
- 'delete': Delete memory records by single ID, batch of IDs, or domain.
- 'reset': Clear and wipe persistent memory across project, global, or all scopes.
- 'list': List recent persistent memories or session messages.
- 'get': Retrieve a specific memory record or session message by ID.
- 'stats': View memory statistics, record counts, and domain distribution.
- 'session_search': Search across past session messages and conversation history.
- 'session_list': List recent session conversation messages.
- 'session_get': Retrieve a session conversation message by ID.
- 'session_save': Save or index a session conversation message.

Scopes:
- 'project': Workspace-specific (.ava-code/memory/ or .ava/memory/).
- 'global': Cross-project developer memory (~/.local/share/ava-code/global.db).
- 'all': Cross-scope federation querying both project and global stores.
"#
            .to_string(),
            strict: false,
            defer_loading: None,
            parameters: parse_tool_input_schema(&schema::input_schema_for::<UnifiedMemoryArgs>())
                .unwrap_or_else(|err| {
                    panic!("generated input schema for {UNIFIED_MEMORY_TOOL_NAME} should parse: {err}")
                }),
            output_schema: Some(schema::output_schema_for::<UnifiedMemoryResponse>().into()),
        };

        ToolSpec::Namespace(ResponsesApiNamespace {
            name: MEMORY_TOOLS_NAMESPACE.to_string(),
            description: default_namespace_description(MEMORY_TOOLS_NAMESPACE),
            tools: vec![ResponsesApiNamespaceTool::Function(tool)],
        })
    }

    fn handle<'a>(&'a self, call: ToolCall<'call>) -> codex_extension_api::ToolExecutorFuture<'a>
    where
        'call: 'a,
    {
        Box::pin(self.handle_call(call))
    }
}

impl UnifiedMemoryTool {
    async fn handle_call(
        &self,
        call: ToolCall<'_>,
    ) -> Result<Box<dyn codex_extension_api::ToolOutput>, FunctionCallError> {
        let args: UnifiedMemoryArgs = super::parse_args(&call)?;
        let response = self.execute_action(args).await?;
        Ok(Box::new(JsonToolOutput::new(json!(response))))
    }

    pub async fn execute_action(
        &self,
        args: UnifiedMemoryArgs,
    ) -> Result<UnifiedMemoryResponse, FunctionCallError> {
        let action = args.action.trim().to_lowercase();
        let default_scope_str = self.config.default_scope.as_str();
        let requested_scope = args
            .scope
            .as_deref()
            .unwrap_or(default_scope_str)
            .to_string();

        // Check if action is session-related or specified via memory_type / session_id
        let is_session_action = matches!(
            action.as_str(),
            "session_search" | "session_list" | "session_get" | "session_save"
        ) || args.memory_type.as_deref() == Some("session")
            || (matches!(action.as_str(), "search" | "list") && args.session_id.is_some());

        if is_session_action {
            if !self.config.session_memory_enabled {
                return Ok(UnifiedMemoryResponse {
                    success: false,
                    title: "Session Memory Disabled".to_string(),
                    output: "Session memory indexing and search is currently disabled in configuration (memories.session_memory_enabled = false).".to_string(),
                    count: Some(0),
                    scope: Some(requested_scope.to_string()),
                    record_id: None,
                });
            }
            return self
                .handle_session_action(&action, args, &requested_scope)
                .await;
        }

        self.handle_persistent_action(&action, args, &requested_scope)
            .await
    }

    async fn handle_persistent_action(
        &self,
        action: &str,
        args: UnifiedMemoryArgs,
        requested_scope: &str,
    ) -> Result<UnifiedMemoryResponse, FunctionCallError> {
        let project_db = resolve_project_memory_db(&self.workspace_dir);
        let global_db = resolve_global_memory_db();

        let project_store = PersistentMemoryStore::open(&project_db)
            .await
            .map_err(|e| {
                FunctionCallError::RespondToModel(format!(
                    "Failed to open project memory store: {e}"
                ))
            })?;
        let global_store = PersistentMemoryStore::open(&global_db).await.map_err(|e| {
            FunctionCallError::RespondToModel(format!("Failed to open global memory store: {e}"))
        })?;

        let store = if requested_scope == "global" {
            &global_store
        } else {
            &project_store
        };

        match action {
            // 1. Search persistent memories
            "search" => {
                let query = args.query.as_deref().unwrap_or("").trim();
                if query.is_empty() {
                    return Ok(UnifiedMemoryResponse {
                        success: false,
                        title: "Memory Search".to_string(),
                        output: "Please provide a query parameter to search persistent memory."
                            .to_string(),
                        count: Some(0),
                        scope: Some(requested_scope.to_string()),
                        record_id: None,
                    });
                }

                let limit = args
                    .limit
                    .unwrap_or(self.config.preferences.max_results)
                    .clamp(1, 100);
                let mut effective_scope = requested_scope.to_string();
                let results = if requested_scope == "all" {
                    let proj_res = project_store
                        .search(
                            query,
                            args.domain.as_deref(),
                            args.category.as_deref(),
                            args.importance.as_deref(),
                            Some("project"),
                            limit,
                        )
                        .await
                        .unwrap_or_default();
                    let glob_res = global_store
                        .search(
                            query,
                            args.domain.as_deref(),
                            args.category.as_deref(),
                            args.importance.as_deref(),
                            Some("global"),
                            limit,
                        )
                        .await
                        .unwrap_or_default();
                    let mut combined = Vec::new();
                    let mut seen = std::collections::HashSet::new();
                    for r in proj_res.into_iter().chain(glob_res) {
                        if seen.insert(r.id.clone()) {
                            combined.push(r);
                        }
                        if combined.len() >= limit {
                            break;
                        }
                    }
                    effective_scope = "all (project + global)".to_string();
                    combined
                } else {
                    let mut res = store
                        .search(
                            query,
                            args.domain.as_deref(),
                            args.category.as_deref(),
                            args.importance.as_deref(),
                            Some(requested_scope),
                            limit,
                        )
                        .await
                        .unwrap_or_default();

                    // Smart fallback: If project has 0 records, check global store
                    if res.is_empty() && requested_scope == "project" {
                        let glob_res = global_store
                            .search(
                                query,
                                args.domain.as_deref(),
                                args.category.as_deref(),
                                args.importance.as_deref(),
                                Some("global"),
                                limit,
                            )
                            .await
                            .unwrap_or_default();
                        if !glob_res.is_empty() {
                            res = glob_res;
                            effective_scope = "global (fallback)".to_string();
                        }
                    }
                    res
                };

                if !results.is_empty() {
                    let ids: Vec<String> = results.iter().map(|r| r.id.clone()).collect();
                    if effective_scope.contains("global") {
                        let _ = global_store.mark_used_batch(&ids).await;
                    } else {
                        let _ = project_store.mark_used_batch(&ids).await;
                    }
                }

                if results.is_empty() {
                    return Ok(UnifiedMemoryResponse {
                        success: true,
                        title: format!("Memory Search: \"{query}\""),
                        output: format!(
                            "No matching memory records found in {requested_scope} memory."
                        ),
                        count: Some(0),
                        scope: Some(requested_scope.to_string()),
                        record_id: None,
                    });
                }

                let formatted = results
                    .iter()
                    .map(|r| {
                        let verified_str = match r.verified {
                            Some(true) => " [verified]",
                            Some(false) => " [unverified]",
                            None => "",
                        };
                        let evidence_str = r.evidence.as_ref().map(|e| format!("\n- **Evidence:** {e}")).unwrap_or_default();
                        let files_str = r.related_files.as_ref().filter(|f| !f.is_empty()).map(|f| format!("\n- **Files:** {}", f.join(", "))).unwrap_or_default();
                        format!(
                            "### Record [{id}] (Domain: {domain} | Conf: {conf}{verified} | Imp: {imp})\n- **Content:** {content}{evidence_str}{files_str}",
                            id = r.id,
                            domain = r.domain,
                            conf = r.confidence,
                            verified = verified_str,
                            imp = r.importance,
                            content = r.content,
                            evidence_str = evidence_str,
                            files_str = files_str,
                        )
                    })
                    .collect::<Vec<_>>()
                    .join("\n\n");

                Ok(UnifiedMemoryResponse {
                    success: true,
                    title: format!(
                        "Memory Search: {} record(s) found ({effective_scope})",
                        results.len()
                    ),
                    output: formatted,
                    count: Some(results.len()),
                    scope: Some(effective_scope),
                    record_id: None,
                })
            }

            // 2. Save new persistent memory
            "save" | "store" => {
                let content = match args.content.as_deref() {
                    Some(c) if !c.trim().is_empty() => c.trim().to_string(),
                    _ => {
                        return Ok(UnifiedMemoryResponse {
                            success: false,
                            title: "Memory Save Failed".to_string(),
                            output: "Error: 'content' parameter is required when saving a memory record.".to_string(),
                            count: Some(0),
                            scope: Some(requested_scope.to_string()),
                            record_id: None,
                        });
                    }
                };

                let evidence = args.evidence.as_deref();
                let (source, verified, default_conf) = infer_evidence_provenance(evidence);
                let importance = args
                    .importance
                    .unwrap_or_else(|| self.config.preferences.default_importance.clone());
                let domain = args.domain.unwrap_or_else(|| "general".to_string());
                let category = args.category.or_else(|| Some("general".to_string()));
                let scope_val = if requested_scope == "global" {
                    "global"
                } else {
                    "project"
                };

                let record_id = format!(
                    "mem_{}_{}",
                    Utc::now().timestamp(),
                    &Uuid::new_v4().to_string()[..8]
                );
                let now = Utc::now().to_rfc3339();

                let record = MemoryRecord {
                    id: record_id.clone(),
                    scope: scope_val.to_string(),
                    domain: domain.clone(),
                    category,
                    tags: args.tags.unwrap_or_default(),
                    content: content.clone(),
                    evidence: evidence.map(ToString::to_string),
                    evidence_source: Some(source.as_str().to_string()),
                    verified: Some(verified),
                    source_session: None,
                    confidence: default_conf,
                    importance: importance.clone(),
                    related_files: args.related_files,
                    created_at: now.clone(),
                    last_used_at: Some(now.clone()),
                    last_verified_at: if verified { Some(now) } else { None },
                    use_count: 0,
                    status: "active".to_string(),
                    superseded_by: None,
                    supersedes: None,
                };

                store.insert(&record).await.map_err(|e| {
                    FunctionCallError::RespondToModel(format!("Failed to save memory record: {e}"))
                })?;

                let output_lines = vec![
                    format!("Action: SAVED"),
                    format!("Record ID: {record_id}"),
                    format!("Domain: {domain}"),
                    format!("Importance: {importance}"),
                    format!("Scope: {scope_val}"),
                    format!("Evidence Source: {}", source.as_str()),
                    format!("Verified: {verified}"),
                    format!("Confidence: {default_conf}"),
                ];

                Ok(UnifiedMemoryResponse {
                    success: true,
                    title: format!("Memory Saved: {record_id}"),
                    output: output_lines.join("\n"),
                    count: Some(1),
                    scope: Some(scope_val.to_string()),
                    record_id: Some(record_id),
                })
            }

            // 3. Update existing persistent memory
            "update" => {
                let id = match args.id.as_deref() {
                    Some(id) if !id.trim().is_empty() => id.trim(),
                    _ => {
                        return Ok(UnifiedMemoryResponse {
                            success: false,
                            title: "Memory Update Failed".to_string(),
                            output: "Error: 'id' parameter is required for 'update' action."
                                .to_string(),
                            count: Some(0),
                            scope: Some(requested_scope.to_string()),
                            record_id: None,
                        });
                    }
                };

                let existing = store.get(id).await.map_err(|e| {
                    FunctionCallError::RespondToModel(format!("Failed to read memory store: {e}"))
                })?;

                if existing.is_none() {
                    return Ok(UnifiedMemoryResponse {
                        success: false,
                        title: "Memory Not Found".to_string(),
                        output: format!(
                            "No memory found with ID \"{id}\" in {requested_scope} store."
                        ),
                        count: Some(0),
                        scope: Some(requested_scope.to_string()),
                        record_id: Some(id.to_string()),
                    });
                }

                let evidence = args.evidence.as_deref();
                let (source, verified) = if let Some(ev) = evidence {
                    let (src, ver, _) = infer_evidence_provenance(Some(ev));
                    (Some(src.as_str()), Some(ver))
                } else {
                    (None, None)
                };

                let updated = store
                    .update(
                        id,
                        args.content.as_deref(),
                        args.domain.as_deref(),
                        args.category.as_deref(),
                        args.importance.as_deref(),
                        evidence,
                        source,
                        verified,
                        args.related_files.as_deref(),
                        args.tags.as_deref(),
                        args.status.as_deref(),
                    )
                    .await
                    .map_err(|e| {
                        FunctionCallError::RespondToModel(format!("Failed to update memory: {e}"))
                    })?;

                if updated {
                    let fresh = store.get(id).await.unwrap_or(None);
                    let formatted = serde_json::to_string_pretty(&fresh).unwrap_or_default();
                    Ok(UnifiedMemoryResponse {
                        success: true,
                        title: format!("Memory Updated: {id}"),
                        output: format!(
                            "Successfully updated memory record \"{id}\".\n{formatted}"
                        ),
                        count: Some(1),
                        scope: Some(requested_scope.to_string()),
                        record_id: Some(id.to_string()),
                    })
                } else {
                    Ok(UnifiedMemoryResponse {
                        success: false,
                        title: "Memory Update".to_string(),
                        output: format!("No fields provided to update memory \"{id}\"."),
                        count: Some(0),
                        scope: Some(requested_scope.to_string()),
                        record_id: Some(id.to_string()),
                    })
                }
            }

            // 4. Delete persistent memories
            "delete" => {
                if let Some(ids) = &args.ids {
                    if !ids.is_empty() {
                        let deleted = store.delete_batch(ids).await.map_err(|e| {
                            FunctionCallError::RespondToModel(format!("Batch delete failed: {e}"))
                        })?;
                        return Ok(UnifiedMemoryResponse {
                            success: true,
                            title: format!("Batch Memory Deleted ({deleted} records)"),
                            output: format!(
                                "Successfully deleted {deleted} memory records from {requested_scope} store."
                            ),
                            count: Some(deleted),
                            scope: Some(requested_scope.to_string()),
                            record_id: None,
                        });
                    }
                }

                if let Some(id) = args.id.as_deref() {
                    let deleted = store.delete(id).await.map_err(|e| {
                        FunctionCallError::RespondToModel(format!("Delete failed: {e}"))
                    })?;
                    return Ok(UnifiedMemoryResponse {
                        success: deleted,
                        title: if deleted {
                            "Memory Deleted".to_string()
                        } else {
                            "Memory Not Found".to_string()
                        },
                        output: if deleted {
                            format!(
                                "Memory record \"{id}\" has been deleted from {requested_scope} store."
                            )
                        } else {
                            format!(
                                "No memory record found with ID \"{id}\" in {requested_scope} store."
                            )
                        },
                        count: Some(if deleted { 1 } else { 0 }),
                        scope: Some(requested_scope.to_string()),
                        record_id: Some(id.to_string()),
                    });
                }

                if let Some(domain) = args.domain.as_deref() {
                    let deleted = store.delete_by_domain(domain).await.map_err(|e| {
                        FunctionCallError::RespondToModel(format!("Delete by domain failed: {e}"))
                    })?;
                    return Ok(UnifiedMemoryResponse {
                        success: true,
                        title: format!("Memory Deleted: Domain \"{domain}\""),
                        output: format!(
                            "Successfully deleted {deleted} memory record(s) in domain \"{domain}\" from {requested_scope} store."
                        ),
                        count: Some(deleted),
                        scope: Some(requested_scope.to_string()),
                        record_id: None,
                    });
                }

                Ok(UnifiedMemoryResponse {
                    success: false,
                    title: "Memory Delete Failed".to_string(),
                    output: "Error: Please provide 'id', 'ids', or 'domain' to delete memories. To wipe all memories, use action 'reset'.".to_string(),
                    count: Some(0),
                    scope: Some(requested_scope.to_string()),
                    record_id: None,
                })
            }

            // 5. Reset persistent memories
            "reset" => {
                if requested_scope == "all" {
                    let _ = project_store.clear().await;
                    let _ = global_store.clear().await;
                    return Ok(UnifiedMemoryResponse {
                        success: true,
                        title: "Memory Reset: All Scopes".to_string(),
                        output: "All persistent memories in both 'project' and 'global' stores have been completely reset.".to_string(),
                        count: Some(0),
                        scope: Some("all".to_string()),
                        record_id: None,
                    });
                }

                if let Some(domain) = args.domain.as_deref() {
                    let count = store.delete_by_domain(domain).await.unwrap_or(0);
                    return Ok(UnifiedMemoryResponse {
                        success: true,
                        title: format!("Memory Reset: Domain \"{domain}\""),
                        output: format!(
                            "Successfully cleared {count} memory record(s) in domain \"{domain}\" from {requested_scope} store."
                        ),
                        count: Some(count),
                        scope: Some(requested_scope.to_string()),
                        record_id: None,
                    });
                }

                store
                    .clear()
                    .await
                    .map_err(|e| FunctionCallError::RespondToModel(format!("Reset failed: {e}")))?;

                Ok(UnifiedMemoryResponse {
                    success: true,
                    title: format!("Memory Reset: {}", requested_scope.to_uppercase()),
                    output: format!(
                        "All persistent memories in the {requested_scope} store have been completely reset."
                    ),
                    count: Some(0),
                    scope: Some(requested_scope.to_string()),
                    record_id: None,
                })
            }

            // 6. List persistent memories
            "list" => {
                let limit = args.limit.unwrap_or(10).clamp(1, 100);
                let memories = store
                    .list(args.domain.as_deref(), Some(requested_scope), limit)
                    .await
                    .unwrap_or_default();

                if memories.is_empty() {
                    return Ok(UnifiedMemoryResponse {
                        success: true,
                        title: format!("List Memories ({requested_scope})"),
                        output: format!(
                            "No memories currently stored in {requested_scope} database{}.",
                            args.domain
                                .as_ref()
                                .map(|d| format!(" for domain \"{d}\""))
                                .unwrap_or_default()
                        ),
                        count: Some(0),
                        scope: Some(requested_scope.to_string()),
                        record_id: None,
                    });
                }

                let formatted = memories
                    .iter()
                    .map(|r| {
                        let snippet = if r.content.len() > 150 {
                            format!("{}...", &r.content[..150])
                        } else {
                            r.content.clone()
                        };
                        format!(
                            "- **[{}]** ({}) [{}]: {}",
                            r.id, r.domain, r.importance, snippet
                        )
                    })
                    .collect::<Vec<_>>()
                    .join("\n");

                Ok(UnifiedMemoryResponse {
                    success: true,
                    title: format!("Persistent Memories: {} item(s)", memories.len()),
                    output: formatted,
                    count: Some(memories.len()),
                    scope: Some(requested_scope.to_string()),
                    record_id: None,
                })
            }

            // 7. Get persistent memory by ID
            "get" => {
                let id = match args.id.as_deref() {
                    Some(id) if !id.trim().is_empty() => id.trim(),
                    _ => {
                        return Ok(UnifiedMemoryResponse {
                            success: false,
                            title: "Memory Get Failed".to_string(),
                            output: "Error: 'id' parameter is required for 'get' action."
                                .to_string(),
                            count: Some(0),
                            scope: Some(requested_scope.to_string()),
                            record_id: None,
                        });
                    }
                };

                let mut record = project_store.get(id).await.unwrap_or(None);
                if record.is_none() {
                    record = global_store.get(id).await.unwrap_or(None);
                }

                match record {
                    Some(r) => {
                        let json_str = serde_json::to_string_pretty(&r).unwrap_or_default();
                        Ok(UnifiedMemoryResponse {
                            success: true,
                            title: format!("Memory Record: {}", r.id),
                            output: json_str,
                            count: Some(1),
                            scope: Some(r.scope),
                            record_id: Some(r.id),
                        })
                    }
                    None => Ok(UnifiedMemoryResponse {
                        success: false,
                        title: "Memory Not Found".to_string(),
                        output: format!("No memory record found with ID \"{id}\"."),
                        count: Some(0),
                        scope: Some(requested_scope.to_string()),
                        record_id: Some(id.to_string()),
                    }),
                }
            }

            // 8. Stats / Analytics
            "stats" => {
                let stats: MemoryStats = store.stats().await.map_err(|e| {
                    FunctionCallError::RespondToModel(format!("Failed to get stats: {e}"))
                })?;

                let mut domain_lines = stats
                    .domains
                    .iter()
                    .map(|(d, c)| format!("  - {d}: {c}"))
                    .collect::<Vec<_>>();
                domain_lines.sort();

                let output = vec![
                    format!("Active Records: {}", stats.total),
                    format!("Average Confidence: {}", stats.avg_confidence),
                    format!(
                        "Domains:\n{}",
                        if domain_lines.is_empty() {
                            "  (None)".to_string()
                        } else {
                            domain_lines.join("\n")
                        }
                    ),
                ]
                .join("\n");

                Ok(UnifiedMemoryResponse {
                    success: true,
                    title: format!("Memory Stats ({requested_scope})"),
                    output,
                    count: Some(stats.total),
                    scope: Some(requested_scope.to_string()),
                    record_id: None,
                })
            }

            _ => Ok(UnifiedMemoryResponse {
                success: false,
                title: "Memory Tool".to_string(),
                output: format!(
                    "Unknown action \"{action}\". Valid persistent actions: search, save, update, delete, reset, list, get, stats. Valid session actions: session_search, session_list, session_get, session_save."
                ),
                count: Some(0),
                scope: Some(requested_scope.to_string()),
                record_id: None,
            }),
        }
    }

    async fn handle_session_action(
        &self,
        action: &str,
        args: UnifiedMemoryArgs,
        requested_scope: &str,
    ) -> Result<UnifiedMemoryResponse, FunctionCallError> {
        let project_session_db = resolve_project_session_memory_db(&self.workspace_dir);
        let global_session_db = resolve_global_session_memory_db();

        let project_session_store = SessionMemoryStore::open(&project_session_db)
            .await
            .map_err(|e| {
                FunctionCallError::RespondToModel(format!(
                    "Failed to open project session store: {e}"
                ))
            })?;
        let global_session_store =
            SessionMemoryStore::open(&global_session_db)
                .await
                .map_err(|e| {
                    FunctionCallError::RespondToModel(format!(
                        "Failed to open global session store: {e}"
                    ))
                })?;

        let store = if requested_scope == "global" {
            &global_session_store
        } else {
            &project_session_store
        };

        match action {
            "session_search" | "search" => {
                let query = args.query.as_deref().unwrap_or("").trim();
                if query.is_empty() {
                    return Ok(UnifiedMemoryResponse {
                        success: false,
                        title: "Session Memory Search".to_string(),
                        output:
                            "Please provide a query parameter to search past session conversations."
                                .to_string(),
                        count: Some(0),
                        scope: Some(requested_scope.to_string()),
                        record_id: None,
                    });
                }

                let limit = args
                    .limit
                    .unwrap_or(self.config.preferences.max_results)
                    .clamp(1, 100);
                let is_single_session = args
                    .session_id
                    .as_deref()
                    .is_some_and(|s| s != "all" && !s.trim().is_empty());

                let mut effective_source = requested_scope.to_string();
                let results = if is_single_session {
                    let sid = args.session_id.as_deref();
                    effective_source = format!("session {}", sid.unwrap_or_default());
                    store.search(query, sid, limit).await.unwrap_or_default()
                } else if requested_scope == "all" {
                    let proj_res = project_session_store
                        .search(query, None, limit)
                        .await
                        .unwrap_or_default();
                    let glob_res = global_session_store
                        .search(query, None, limit)
                        .await
                        .unwrap_or_default();
                    let mut combined = Vec::new();
                    let mut seen = std::collections::HashSet::new();
                    for r in proj_res.into_iter().chain(glob_res) {
                        if seen.insert(r.id.clone()) {
                            combined.push(r);
                        }
                        if combined.len() >= limit {
                            break;
                        }
                    }
                    effective_source = "all sessions (project + global workspaces)".to_string();
                    combined
                } else {
                    let mut res = store.search(query, None, limit).await.unwrap_or_default();
                    if res.is_empty() && requested_scope == "project" {
                        let glob_res = global_session_store
                            .search(query, None, limit)
                            .await
                            .unwrap_or_default();
                        if !glob_res.is_empty() {
                            res = glob_res;
                            effective_source =
                                "other workspace sessions (global fallback)".to_string();
                        }
                    }
                    res
                };

                if results.is_empty() {
                    return Ok(UnifiedMemoryResponse {
                        success: true,
                        title: format!("Session Memory Search: \"{query}\""),
                        output: format!(
                            "No matching session memories found across {effective_source}."
                        ),
                        count: Some(0),
                        scope: Some(requested_scope.to_string()),
                        record_id: None,
                    });
                }

                let formatted = results
                    .iter()
                    .map(|r| {
                        format!(
                            "### [Record {id}] (Session: {session_id} | Type: {mtype} | Time: {created})\n{content}",
                            id = r.id,
                            session_id = r.session_id,
                            mtype = r.message_type,
                            created = r.created_at,
                            content = r.content
                        )
                    })
                    .collect::<Vec<_>>()
                    .join("\n\n---\n\n");

                Ok(UnifiedMemoryResponse {
                    success: true,
                    title: format!(
                        "Session Memory Search: {} record(s) found ({effective_source})",
                        results.len()
                    ),
                    output: formatted,
                    count: Some(results.len()),
                    scope: Some(requested_scope.to_string()),
                    record_id: None,
                })
            }

            "session_list" | "list" => {
                let limit = args.limit.unwrap_or(10).clamp(1, 100);
                let sid = args
                    .session_id
                    .as_deref()
                    .filter(|s| *s != "all" && !s.trim().is_empty());
                let mut memories = store.list_recent(sid, limit).await.unwrap_or_default();
                if memories.is_empty() && requested_scope == "project" && sid.is_none() {
                    memories = global_session_store
                        .list_recent(None, limit)
                        .await
                        .unwrap_or_default();
                }

                if memories.is_empty() {
                    return Ok(UnifiedMemoryResponse {
                        success: true,
                        title: "List Session Memories".to_string(),
                        output: "No session memories currently stored.".to_string(),
                        count: Some(0),
                        scope: Some(requested_scope.to_string()),
                        record_id: None,
                    });
                }

                let formatted = memories
                    .iter()
                    .map(|r| {
                        let snippet = if r.content.len() > 120 {
                            format!("{}...", &r.content[..120])
                        } else {
                            r.content.clone()
                        };
                        format!(
                            "- **[{}]** (Session: {}) [{}]: {}",
                            r.id, r.session_id, r.message_type, snippet
                        )
                    })
                    .collect::<Vec<_>>()
                    .join("\n");

                Ok(UnifiedMemoryResponse {
                    success: true,
                    title: format!("Session Memories: {} item(s)", memories.len()),
                    output: formatted,
                    count: Some(memories.len()),
                    scope: Some(requested_scope.to_string()),
                    record_id: None,
                })
            }

            "session_get" | "get" => {
                let id = match args.id.as_deref() {
                    Some(id) if !id.trim().is_empty() => id.trim(),
                    _ => {
                        return Ok(UnifiedMemoryResponse {
                            success: false,
                            title: "Session Memory Get Failed".to_string(),
                            output: "Error: 'id' parameter is required for 'session_get' action."
                                .to_string(),
                            count: Some(0),
                            scope: Some(requested_scope.to_string()),
                            record_id: None,
                        });
                    }
                };

                let mut record = project_session_store.get(id).await.unwrap_or(None);
                if record.is_none() {
                    record = global_session_store.get(id).await.unwrap_or(None);
                }

                match record {
                    Some(r) => {
                        let json_str = serde_json::to_string_pretty(&r).unwrap_or_default();
                        Ok(UnifiedMemoryResponse {
                            success: true,
                            title: format!("Session Memory Record: {}", r.id),
                            output: json_str,
                            count: Some(1),
                            scope: Some(requested_scope.to_string()),
                            record_id: Some(r.id),
                        })
                    }
                    None => Ok(UnifiedMemoryResponse {
                        success: false,
                        title: "Session Memory Not Found".to_string(),
                        output: format!("No session memory found with ID \"{id}\"."),
                        count: Some(0),
                        scope: Some(requested_scope.to_string()),
                        record_id: Some(id.to_string()),
                    }),
                }
            }

            "session_save" => {
                let content = match args.content.as_deref() {
                    Some(c) if !c.trim().is_empty() => c.trim().to_string(),
                    _ => {
                        return Ok(UnifiedMemoryResponse {
                            success: false,
                            title: "Session Memory Save Failed".to_string(),
                            output:
                                "Error: 'content' is required when saving a session memory record."
                                    .to_string(),
                            count: Some(0),
                            scope: Some(requested_scope.to_string()),
                            record_id: None,
                        });
                    }
                };

                let session_id = args.session_id.unwrap_or_else(|| "current".to_string());
                let message_id = args
                    .id
                    .unwrap_or_else(|| format!("msg_{}", Utc::now().timestamp()));
                let record_id = format!("sm_{}_{}", &session_id, &message_id);
                let record = SessionMemoryRecord {
                    id: record_id.clone(),
                    session_id,
                    message_id,
                    content,
                    message_type: args.category.unwrap_or_else(|| "assistant".to_string()),
                    created_at: Utc::now().to_rfc3339(),
                };

                store.insert(&record).await.map_err(|e| {
                    FunctionCallError::RespondToModel(format!("Failed to save session memory: {e}"))
                })?;

                Ok(UnifiedMemoryResponse {
                    success: true,
                    title: format!("Session Memory Saved: {record_id}"),
                    output: format!("Successfully indexed session memory record \"{record_id}\"."),
                    count: Some(1),
                    scope: Some(requested_scope.to_string()),
                    record_id: Some(record_id),
                })
            }

            _ => Ok(UnifiedMemoryResponse {
                success: false,
                title: "Session Memory Tool".to_string(),
                output: format!(
                    "Unknown session action \"{action}\". Valid session actions: session_search, session_list, session_get, session_save."
                ),
                count: Some(0),
                scope: Some(requested_scope.to_string()),
                record_id: None,
            }),
        }
    }
}
