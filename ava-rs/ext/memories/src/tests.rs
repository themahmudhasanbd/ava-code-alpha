use std::path::Path;
use std::sync::Arc;

use codex_config::types::MemoriesConfig;
use codex_extension_api::ContextContributor;
use codex_extension_api::ExtensionData;
use codex_extension_api::ExtensionRegistryBuilder;
use codex_extension_api::NoopTurnItemEmitter;
use codex_extension_api::PromptSlot;
use codex_extension_api::ToolCall;
use codex_extension_api::ToolCallSource;
use codex_extension_api::ToolContributor;
use codex_extension_api::ToolExecutor;
use codex_extension_api::ToolName;
use codex_extension_api::ToolPayload;
use codex_tools::ToolOutput;
use codex_utils_absolute_path::test_support::PathBufExt;
use codex_utils_absolute_path::test_support::PathExt;
use codex_utils_absolute_path::test_support::test_path_buf;
use codex_utils_output_truncation::TruncationPolicy;
use pretty_assertions::assert_eq;
use serde_json::json;

use crate::UNIFIED_MEMORY_TOOL_NAME;
use crate::backend::ListMemoriesRequest;
use crate::backend::ListMemoriesResponse;
use crate::backend::MemoriesBackend;
use crate::backend::MemoryEntry;
use crate::backend::MemoryEntryType;
use crate::backend::SearchMatchMode;
use crate::backend::SearchMemoriesRequest;
use crate::extension::MemoriesExtension;
use crate::extension::MemoriesExtensionConfig;
use crate::local::LocalMemoriesBackend;
use crate::tools::UnifiedMemoryTool;

#[test]
fn memory_tool_namespace_matches_responses_api_identifier() {
    assert!(!crate::MEMORY_TOOLS_NAMESPACE.is_empty());
    assert!(
        crate::MEMORY_TOOLS_NAMESPACE
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
    );
}

#[test]
fn tools_are_not_contributed_without_thread_config() {
    let extension = MemoriesExtension::default();

    assert!(
        extension
            .tools(
                &ExtensionData::new("session"),
                &ExtensionData::new("thread"),
            )
            .is_empty()
    );
}

#[test]
fn tools_are_not_contributed_when_disabled() {
    let extension = MemoriesExtension::default();
    let thread_store = ExtensionData::new("thread");
    thread_store.insert(MemoriesExtensionConfig {
        version: codex_protocol::MemoryVersion::V1,
        enabled: false,
        dedicated_tools: true,
        codex_home: test_path_buf("/tmp/codex-home").abs(),
        cwd: test_path_buf("/tmp/codex-cwd").to_path_buf(),
        memories: MemoriesConfig::default(),
    });

    assert!(
        extension
            .tools(&ExtensionData::new("session"), &thread_store)
            .is_empty()
    );
}

#[test]
fn unified_tool_contributed_when_enabled_without_dedicated_tools() {
    let extension = MemoriesExtension::default();
    let thread_store = ExtensionData::new("thread");
    thread_store.insert(MemoriesExtensionConfig {
        version: codex_protocol::MemoryVersion::V1,
        enabled: true,
        dedicated_tools: false,
        codex_home: test_path_buf("/tmp/codex-home").abs(),
        cwd: test_path_buf("/tmp/codex-cwd").to_path_buf(),
        memories: MemoriesConfig::default(),
    });

    let tool_names = extension
        .tools(&ExtensionData::new("session"), &thread_store)
        .into_iter()
        .map(|tool| tool.tool_name())
        .collect::<Vec<_>>();

    assert_eq!(tool_names, vec![memory_tool_name(UNIFIED_MEMORY_TOOL_NAME)]);
}

#[test]
fn tools_are_contributed_when_enabled_with_dedicated_tools() {
    let extension = MemoriesExtension::default();
    let thread_store = ExtensionData::new("thread");
    thread_store.insert(MemoriesExtensionConfig {
        version: codex_protocol::MemoryVersion::V1,
        enabled: true,
        dedicated_tools: true,
        codex_home: test_path_buf("/tmp/codex-home").abs(),
        cwd: test_path_buf("/tmp/codex-cwd").to_path_buf(),
        memories: MemoriesConfig::default(),
    });

    let tool_names = extension
        .tools(&ExtensionData::new("session"), &thread_store)
        .into_iter()
        .map(|tool| tool.tool_name())
        .collect::<Vec<_>>();

    assert_eq!(
        tool_names,
        vec![
            memory_tool_name(UNIFIED_MEMORY_TOOL_NAME),
            memory_tool_name(crate::ADD_AD_HOC_NOTE_TOOL_NAME),
            memory_tool_name(crate::LIST_TOOL_NAME),
            memory_tool_name(crate::READ_TOOL_NAME),
            memory_tool_name(crate::SEARCH_TOOL_NAME),
        ]
    );
}

#[test]
fn install_registers_dedicated_tool_contributor() {
    let mut builder = ExtensionRegistryBuilder::<codex_core::config::Config>::new();
    crate::install(&mut builder, /*metrics_client*/ None);
    let registry = builder.build();
    let thread_store = ExtensionData::new("thread");
    thread_store.insert(MemoriesExtensionConfig {
        version: codex_protocol::MemoryVersion::V1,
        enabled: true,
        dedicated_tools: true,
        codex_home: test_path_buf("/tmp/codex-home").abs(),
        cwd: test_path_buf("/tmp/codex-cwd").to_path_buf(),
        memories: MemoriesConfig::default(),
    });

    let tool_names = registry
        .tool_contributors()
        .iter()
        .flat_map(|contributor| contributor.tools(&ExtensionData::new("session"), &thread_store))
        .map(|tool| tool.tool_name())
        .collect::<Vec<_>>();

    assert_eq!(
        tool_names,
        vec![
            memory_tool_name(UNIFIED_MEMORY_TOOL_NAME),
            memory_tool_name(crate::ADD_AD_HOC_NOTE_TOOL_NAME),
            memory_tool_name(crate::LIST_TOOL_NAME),
            memory_tool_name(crate::READ_TOOL_NAME),
            memory_tool_name(crate::SEARCH_TOOL_NAME),
        ]
    );
}

#[test]
fn ad_hoc_tool_definition_includes_filename_contract() {
    let tool = memory_tool(
        Path::new("/tmp/codex-home/memories"),
        crate::ADD_AD_HOC_NOTE_TOOL_NAME,
    );
    let spec = serde_json::to_value(tool.spec()).expect("serialize tool spec");

    let filename = spec
        .pointer("/tools/0/parameters/properties/filename")
        .expect("filename parameter should be in tool schema");
    assert_eq!(filename.pointer("/type"), Some(&json!("string")));
    assert!(
        filename
            .pointer("/description")
            .and_then(serde_json::Value::as_str)
            .is_some_and(|description| description.contains("YYYY-MM-DDTHH-MM-SS-<slug>.md"))
    );
}

#[tokio::test]
async fn prompt_contribution_uses_memory_summary_when_enabled() {
    let tempdir = tempfile::tempdir().expect("tempdir");
    let memories_dir = tempdir.path().join("memories");
    tokio::fs::create_dir_all(&memories_dir)
        .await
        .expect("create memories dir");
    tokio::fs::write(
        memories_dir.join("memory_summary.md"),
        "Remember repository-specific implementation preferences.",
    )
    .await
    .expect("write memory summary");

    let extension = MemoriesExtension::default();
    let thread_store = ExtensionData::new("thread");
    thread_store.insert(MemoriesExtensionConfig {
        version: codex_protocol::MemoryVersion::V1,
        enabled: true,
        dedicated_tools: false,
        codex_home: tempdir.path().abs(),
        cwd: tempdir.path().to_path_buf(),
        memories: MemoriesConfig::default(),
    });

    let fragments = extension
        .contribute_thread_context(&ExtensionData::new("session"), &thread_store)
        .await;

    assert_eq!(fragments.len(), 1);
    assert_eq!(fragments[0].slot(), PromptSlot::DeveloperPolicy);
    assert!(
        fragments[0]
            .text()
            .contains("Remember repository-specific implementation preferences.")
    );
}

#[tokio::test]
async fn unified_memory_tool_crud_and_search_operations() {
    let tempdir = tempfile::tempdir().expect("tempdir");
    let workspace_dir = tempdir.path().to_path_buf();
    let config = MemoriesConfig::default();
    let tool = UnifiedMemoryTool::new(workspace_dir, config, None);

    // 1. Save memory
    let save_payload = ToolPayload::Function {
        arguments: json!({
            "action": "save",
            "content": "Always use PostgreSQL connection pooling with max 20 connections.",
            "evidence": "Observed connection exhaustion in staging load tests; pooling resolved it.",
            "domain": "architecture",
            "category": "database",
            "importance": "high",
            "tags": ["postgres", "pooling", "performance"],
            "scope": "project"
        })
        .to_string(),
    };

    let save_output = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-save".to_string(),
            tool_name: memory_tool_name(UNIFIED_MEMORY_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(4096),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload: save_payload.clone(),
        })
        .await
        .expect("save memory should succeed");

    let save_resp = save_output
        .post_tool_use_response("call-save", &save_payload)
        .expect("response json");
    assert_eq!(save_resp.pointer("/success"), Some(&json!(true)));
    let record_id = save_resp
        .pointer("/record_id")
        .and_then(|v| v.as_str())
        .expect("record_id returned")
        .to_string();

    // 2. Search memory
    let search_payload = ToolPayload::Function {
        arguments: json!({
            "action": "search",
            "query": "PostgreSQL connection pooling",
            "scope": "project"
        })
        .to_string(),
    };

    let search_output = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-search".to_string(),
            tool_name: memory_tool_name(UNIFIED_MEMORY_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(4096),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload: search_payload.clone(),
        })
        .await
        .expect("search memory should succeed");

    let search_resp = search_output
        .post_tool_use_response("call-search", &search_payload)
        .expect("search response json");
    assert_eq!(search_resp.pointer("/success"), Some(&json!(true)));
    assert_eq!(search_resp.pointer("/count"), Some(&json!(1)));

    // 3. Get memory by ID
    let get_payload = ToolPayload::Function {
        arguments: json!({
            "action": "get",
            "id": record_id.clone(),
            "scope": "project"
        })
        .to_string(),
    };

    let get_output = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-get".to_string(),
            tool_name: memory_tool_name(UNIFIED_MEMORY_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(4096),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload: get_payload.clone(),
        })
        .await
        .expect("get memory should succeed");

    let get_resp = get_output
        .post_tool_use_response("call-get", &get_payload)
        .expect("get response json");
    assert_eq!(get_resp.pointer("/success"), Some(&json!(true)));

    // 4. Stats
    let stats_payload = ToolPayload::Function {
        arguments: json!({
            "action": "stats",
            "scope": "project"
        })
        .to_string(),
    };

    let stats_output = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-stats".to_string(),
            tool_name: memory_tool_name(UNIFIED_MEMORY_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(4096),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload: stats_payload.clone(),
        })
        .await
        .expect("stats should succeed");

    let stats_resp = stats_output
        .post_tool_use_response("call-stats", &stats_payload)
        .expect("stats response json");
    assert_eq!(stats_resp.pointer("/success"), Some(&json!(true)));

    // 5. Delete memory
    let delete_payload = ToolPayload::Function {
        arguments: json!({
            "action": "delete",
            "id": record_id,
            "scope": "project"
        })
        .to_string(),
    };

    let delete_output = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-delete".to_string(),
            tool_name: memory_tool_name(UNIFIED_MEMORY_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(4096),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload: delete_payload.clone(),
        })
        .await
        .expect("delete should succeed");

    let delete_resp = delete_output
        .post_tool_use_response("call-delete", &delete_payload)
        .expect("delete response json");
    assert_eq!(delete_resp.pointer("/success"), Some(&json!(true)));
}

#[tokio::test]
async fn unified_memory_tool_session_memory_operations() {
    let tempdir = tempfile::tempdir().expect("tempdir");
    let workspace_dir = tempdir.path().to_path_buf();
    let config = MemoriesConfig::default();
    let tool = UnifiedMemoryTool::new(workspace_dir, config, None);

    // 1. Session save
    let session_save_payload = ToolPayload::Function {
        arguments: json!({
            "action": "session_save",
            "session_id": "sess-alpha-100",
            "content": "User asked to implement OAuth2 PKCE auth flow for mobile clients.",
            "category": "auth",
            "tags": ["oauth2", "pkce", "mobile"],
            "scope": "project"
        })
        .to_string(),
    };

    let save_output = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-sess-save".to_string(),
            tool_name: memory_tool_name(UNIFIED_MEMORY_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(4096),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload: session_save_payload.clone(),
        })
        .await
        .expect("session save should succeed");

    let save_resp = save_output
        .post_tool_use_response("call-sess-save", &session_save_payload)
        .expect("session save response json");
    assert_eq!(save_resp.pointer("/success"), Some(&json!(true)));
    let sess_record_id = save_resp
        .pointer("/record_id")
        .and_then(|v| v.as_str())
        .expect("record id")
        .to_string();

    // 2. Session search
    let session_search_payload = ToolPayload::Function {
        arguments: json!({
            "action": "session_search",
            "query": "OAuth2 PKCE",
            "scope": "project"
        })
        .to_string(),
    };

    let search_output = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-sess-search".to_string(),
            tool_name: memory_tool_name(UNIFIED_MEMORY_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(4096),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload: session_search_payload.clone(),
        })
        .await
        .expect("session search should succeed");

    let search_resp = search_output
        .post_tool_use_response("call-sess-search", &session_search_payload)
        .expect("session search response json");
    assert_eq!(search_resp.pointer("/success"), Some(&json!(true)));
    assert_eq!(search_resp.pointer("/count"), Some(&json!(1)));

    // 3. Session list
    let session_list_payload = ToolPayload::Function {
        arguments: json!({
            "action": "session_list",
            "session_id": "sess-alpha-100",
            "scope": "project"
        })
        .to_string(),
    };

    let list_output = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-sess-list".to_string(),
            tool_name: memory_tool_name(UNIFIED_MEMORY_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(4096),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload: session_list_payload.clone(),
        })
        .await
        .expect("session list should succeed");

    let list_resp = list_output
        .post_tool_use_response("call-sess-list", &session_list_payload)
        .expect("session list response json");
    assert_eq!(list_resp.pointer("/success"), Some(&json!(true)));

    // 4. Session get
    let session_get_payload = ToolPayload::Function {
        arguments: json!({
            "action": "session_get",
            "id": sess_record_id,
            "scope": "project"
        })
        .to_string(),
    };

    let get_output = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-sess-get".to_string(),
            tool_name: memory_tool_name(UNIFIED_MEMORY_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(4096),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload: session_get_payload.clone(),
        })
        .await
        .expect("session get should succeed");

    let get_resp = get_output
        .post_tool_use_response("call-sess-get", &session_get_payload)
        .expect("session get response json");
    assert_eq!(get_resp.pointer("/success"), Some(&json!(true)));
}

#[tokio::test]
async fn unified_memory_tool_session_disabled_toggle() {
    let tempdir = tempfile::tempdir().expect("tempdir");
    let workspace_dir = tempdir.path().to_path_buf();
    let mut config = MemoriesConfig::default();
    config.session_memory_enabled = false;
    let tool = UnifiedMemoryTool::new(workspace_dir, config, None);

    let session_search_payload = ToolPayload::Function {
        arguments: json!({
            "action": "session_search",
            "query": "something"
        })
        .to_string(),
    };

    let output = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-sess-disabled".to_string(),
            tool_name: memory_tool_name(UNIFIED_MEMORY_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(4096),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload: session_search_payload.clone(),
        })
        .await
        .expect("tool call handled");

    let resp = output
        .post_tool_use_response("call-sess-disabled", &session_search_payload)
        .expect("response json");
    assert_eq!(resp.pointer("/success"), Some(&json!(false)));
    assert!(
        resp.pointer("/output")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .contains("disabled")
    );
}

#[tokio::test]
async fn add_ad_hoc_note_tool_creates_note_file() {
    let tempdir = tempfile::tempdir().expect("tempdir");
    let memory_root = tempdir.path().join("memories");
    let tool = memory_tool(&memory_root, crate::ADD_AD_HOC_NOTE_TOOL_NAME);
    let payload = ToolPayload::Function {
        arguments: json!({
            "filename": "2026-05-26T13-42-08-remember-review-style.md",
            "note": "Remember to keep PR review comments concise.",
        })
        .to_string(),
    };

    let output = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-1".to_string(),
            tool_name: memory_tool_name(crate::ADD_AD_HOC_NOTE_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(1024),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload: payload.clone(),
        })
        .await
        .expect("ad-hoc note should be written");

    assert_eq!(
        output.post_tool_use_response("call-1", &payload),
        Some(json!({}))
    );
    assert_eq!(
        tokio::fs::read_to_string(
            memory_root
                .join("extensions/ad_hoc/notes")
                .join("2026-05-26T13-42-08-remember-review-style.md")
        )
        .await
        .expect("read ad-hoc note"),
        "Remember to keep PR review comments concise."
    );
}

#[tokio::test]
async fn add_ad_hoc_note_tool_rejects_paths_as_filenames() {
    let tempdir = tempfile::tempdir().expect("tempdir");
    let memory_root = tempdir.path().join("memories");
    let tool = memory_tool(&memory_root, crate::ADD_AD_HOC_NOTE_TOOL_NAME);
    let payload = ToolPayload::Function {
        arguments: json!({
            "filename": "../2026-05-26T13-42-08-remember-review-style.md",
            "note": "Remember to keep PR review comments concise.",
        })
        .to_string(),
    };

    let result = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-1".to_string(),
            tool_name: memory_tool_name(crate::ADD_AD_HOC_NOTE_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(1024),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload,
        })
        .await;
    let err = match result {
        Ok(_) => panic!("path-like filename should be rejected"),
        Err(err) => err,
    };

    assert!(err.to_string().contains("filename"));
    assert!(err.to_string().contains("YYYY-MM-DDTHH-MM-SS"));
}

#[tokio::test]
async fn read_tool_reads_memory_file() {
    let tempdir = tempfile::tempdir().expect("tempdir");
    let memory_root = tempdir.path().join("memories");
    tokio::fs::create_dir_all(&memory_root)
        .await
        .expect("create memories dir");
    tokio::fs::write(
        memory_root.join("MEMORY.md"),
        "first line\nsecond needle line\nthird line\n",
    )
    .await
    .expect("write memory");
    let tool = memory_tool(&memory_root, crate::READ_TOOL_NAME);
    let payload = ToolPayload::Function {
        arguments: json!({
            "path": "MEMORY.md",
            "line_offset": 2,
            "max_lines": 1
        })
        .to_string(),
    };

    let output = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-1".to_string(),
            tool_name: memory_tool_name(crate::READ_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(1024),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload: payload.clone(),
        })
        .await
        .expect("read should succeed");

    assert_eq!(
        output.post_tool_use_response("call-1", &payload),
        Some(json!({
            "path": "MEMORY.md",
            "content": "second needle line\n",
            "start_line_number": 2,
            "truncated": true
        }))
    );
}

#[tokio::test]
async fn local_listing_and_search_ignore_symlinks() {
    let tempdir = tempfile::tempdir().expect("tempdir");
    let memory_root = tempdir.path().join("memories");
    let outside_root = tempdir.path().join("outside");
    std::fs::create_dir_all(memory_root.join("nested")).expect("create memories directory");
    std::fs::create_dir_all(&outside_root).expect("create outside directory");
    for (path, content) in [
        (memory_root.join("a.md"), "visible needle"),
        (memory_root.join("nested/z.md"), "nested needle"),
        (outside_root.join("secret.md"), "outside needle"),
    ] {
        std::fs::write(path, content).expect("write memory fixture");
    }
    #[cfg(unix)]
    std::os::unix::fs::symlink(&outside_root, memory_root.join("linked-directory"))
        .expect("create memory fixture symlink");

    let backend = LocalMemoriesBackend::from_memory_root(&memory_root);
    let listing = backend
        .list(ListMemoriesRequest {
            path: None,
            cursor: None,
            max_results: 10,
        })
        .await
        .expect("list visible memories");
    assert_eq!(
        listing,
        ListMemoriesResponse {
            path: None,
            entries: vec![
                MemoryEntry {
                    path: "a.md".to_string(),
                    entry_type: MemoryEntryType::File,
                },
                MemoryEntry {
                    path: "nested".to_string(),
                    entry_type: MemoryEntryType::Directory,
                },
            ],
            next_cursor: None,
            truncated: false,
        }
    );

    let response = backend
        .search(SearchMemoriesRequest {
            queries: vec!["needle".to_string()],
            match_mode: SearchMatchMode::Any,
            path: None,
            cursor: None,
            context_lines: 0,
            case_sensitive: false,
            normalized: false,
            max_results: 10,
        })
        .await
        .expect("search visible memories");
    let paths = response
        .matches
        .iter()
        .map(|matched| matched.path.as_str())
        .collect::<Vec<_>>();
    assert_eq!(paths, vec!["a.md", "nested/z.md"]);
}

#[tokio::test]
async fn search_tool_accepts_multiple_queries() {
    let tempdir = tempfile::tempdir().expect("tempdir");
    let memory_root = tempdir.path().join("memories");
    tokio::fs::create_dir_all(&memory_root)
        .await
        .expect("create memories dir");
    tokio::fs::write(
        memory_root.join("MEMORY.md"),
        "alpha only\nneedle only\nalpha needle\n",
    )
    .await
    .expect("write memory");
    let tool = memory_tool(&memory_root, crate::SEARCH_TOOL_NAME);
    let payload = ToolPayload::Function {
        arguments: json!({
            "queries": ["alpha", "needle"],
            "case_sensitive": false
        })
        .to_string(),
    };

    let output = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-1".to_string(),
            tool_name: memory_tool_name(crate::SEARCH_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(1024),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload: payload.clone(),
        })
        .await
        .expect("search should succeed");

    assert_eq!(
        output.post_tool_use_response("call-1", &payload),
        Some(json!({
            "queries": ["alpha", "needle"],
            "match_mode": {
                "type": "any"
            },
            "path": null,
            "matches": [
                {
                    "path": "MEMORY.md",
                    "match_line_number": 1,
                    "content_start_line_number": 1,
                    "content": "alpha only",
                    "matched_queries": ["alpha"]
                },
                {
                    "path": "MEMORY.md",
                    "match_line_number": 2,
                    "content_start_line_number": 2,
                    "content": "needle only",
                    "matched_queries": ["needle"]
                },
                {
                    "path": "MEMORY.md",
                    "match_line_number": 3,
                    "content_start_line_number": 3,
                    "content": "alpha needle",
                    "matched_queries": ["alpha", "needle"]
                }
            ],
            "next_cursor": null,
            "truncated": false
        }))
    );
}

#[tokio::test]
async fn search_tool_accepts_windowed_all_match_mode() {
    let tempdir = tempfile::tempdir().expect("tempdir");
    let memory_root = tempdir.path().join("memories");
    tokio::fs::create_dir_all(&memory_root)
        .await
        .expect("create memories dir");
    tokio::fs::write(memory_root.join("MEMORY.md"), "alpha\nmiddle\nneedle\n")
        .await
        .expect("write memory");
    let tool = memory_tool(&memory_root, crate::SEARCH_TOOL_NAME);
    let payload = ToolPayload::Function {
        arguments: json!({
            "queries": ["alpha", "needle"],
            "match_mode": {
                "type": "all_within_lines",
                "line_count": 3
            }
        })
        .to_string(),
    };

    let output = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-1".to_string(),
            tool_name: memory_tool_name(crate::SEARCH_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(1024),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload: payload.clone(),
        })
        .await
        .expect("search should succeed");

    assert_eq!(
        output.post_tool_use_response("call-1", &payload),
        Some(json!({
            "queries": ["alpha", "needle"],
            "match_mode": {
                "type": "all_within_lines",
                "line_count": 3
            },
            "path": null,
            "matches": [
                {
                    "path": "MEMORY.md",
                    "match_line_number": 1,
                    "content_start_line_number": 1,
                    "content": "alpha\nmiddle\nneedle",
                    "matched_queries": ["alpha", "needle"]
                }
            ],
            "next_cursor": null,
            "truncated": false
        }))
    );
}

#[tokio::test]
async fn search_tool_rejects_legacy_single_query() {
    let tempdir = tempfile::tempdir().expect("tempdir");
    let memory_root = tempdir.path().join("memories");
    tokio::fs::create_dir_all(&memory_root)
        .await
        .expect("create memories dir");
    let tool = memory_tool(&memory_root, crate::SEARCH_TOOL_NAME);
    let payload = ToolPayload::Function {
        arguments: json!({
            "query": "needle",
        })
        .to_string(),
    };

    let result = tool
        .handle(ToolCall {
            turn_id: "turn-1".to_string(),
            call_id: "call-1".to_string(),
            tool_name: memory_tool_name(crate::SEARCH_TOOL_NAME),
            model: "gpt-test".to_string(),
            codex_turn_metadata: None,
            truncation_policy: TruncationPolicy::Bytes(1024),
            source: ToolCallSource::Direct,
            conversation_history: codex_extension_api::ConversationHistory::default(),
            turn_item_emitter: Arc::new(NoopTurnItemEmitter),
            environments: Vec::new(),
            payload,
        })
        .await;
    let err = match result {
        Ok(_) => panic!("legacy query field should be rejected"),
        Err(err) => err,
    };

    assert!(err.to_string().contains("unknown field"));
    assert!(err.to_string().contains("query"));
}

fn memory_tool(
    memory_root: &Path,
    tool_name: &str,
) -> Arc<dyn for<'call> ToolExecutor<ToolCall<'call>>> {
    let expected_tool_name = memory_tool_name(tool_name);
    crate::tools::memory_tools(
        LocalMemoriesBackend::from_memory_root(memory_root),
        /*metrics_client*/ None,
    )
    .into_iter()
    .find(|tool| tool.tool_name() == expected_tool_name)
    .unwrap_or_else(|| panic!("{tool_name} tool should be registered"))
}

fn memory_tool_name(tool_name: &str) -> ToolName {
    ToolName::namespaced(crate::MEMORY_TOOLS_NAMESPACE, tool_name)
}
