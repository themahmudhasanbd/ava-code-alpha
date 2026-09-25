use codex_config::types::BrowserConfig;
use codex_core::config::Config;
use codex_extension_api::ExtensionData;
use codex_extension_api::ExtensionRegistryBuilder;
use codex_extension_api::ToolName;
use pretty_assertions::assert_eq;
use serde_json::json;

use crate::coordinator::{BrowserCoordinator, PageIndicators};
use crate::engine::parse_viewport_string;
use crate::extension::{BrowserExtensionConfig, install};
use crate::observer::Observer;
use crate::prompts::build_browser_developer_instructions;
use crate::tools::{BROWSER_TOOL_NAME, BrowserArgs};

#[test]
fn viewport_profile_parsing_works() {
    assert_eq!(parse_viewport_string("desktop"), (1920, 1080, false));
    assert_eq!(parse_viewport_string("laptop"), (1440, 900, false));
    assert_eq!(parse_viewport_string("tablet"), (768, 1024, false));
    assert_eq!(parse_viewport_string("mobile"), (375, 812, true));
    assert_eq!(parse_viewport_string("1280x720"), (1280, 720, false));
    assert_eq!(parse_viewport_string("360x640"), (360, 640, true));
}

#[test]
fn mode_inference_works() {
    assert_eq!(Observer::infer_mode(None), "functional");
    assert_eq!(
        Observer::infer_mode(Some("click login button")),
        "functional"
    );
    assert_eq!(
        Observer::infer_mode(Some("review homepage visual layout")),
        "visual"
    );
    assert_eq!(
        Observer::infer_mode(Some("capture responsive screenshot")),
        "visual"
    );
    assert_eq!(
        Observer::infer_mode(Some("check mobile view alignment")),
        "visual"
    );
}

#[test]
fn page_indicators_formatting() {
    let mut ind = PageIndicators::default();
    assert!(BrowserCoordinator::format_indicators(&ind).contains("No error/success/loading"));

    ind.has_error_banner = true;
    ind.error_texts = vec!["Invalid credentials".to_string()];
    let formatted = BrowserCoordinator::format_indicators(&ind);
    assert!(formatted.contains("[ERROR] Invalid credentials"));
}

#[test]
fn browser_args_deserialization() {
    let raw = json!({
        "action": "open",
        "url": "https://example.com",
        "viewport": "desktop",
        "task_intent": "inspect landing page",
    });

    let args: BrowserArgs = serde_json::from_value(raw).expect("BrowserArgs deserialize");
    assert_eq!(args.action, "open");
    assert_eq!(args.url.as_deref(), Some("https://example.com"));
    assert_eq!(args.viewport.as_deref(), Some("desktop"));
}

#[test]
fn browser_developer_instructions_not_empty() {
    let inst = build_browser_developer_instructions();
    assert!(!inst.is_empty());
    assert!(inst.contains("Observe"));
    assert!(inst.contains("Semantic Refs"));
    assert!(inst.contains("Responsive Audits"));
}

#[test]
fn browser_extension_installation() {
    let mut builder = ExtensionRegistryBuilder::<Config>::new();
    install(&mut builder, None);
    let registry = builder.build();

    let session_store = ExtensionData::new("session");
    let thread_store = ExtensionData::new("11111111-1111-4111-8111-111111111111");

    thread_store.insert(BrowserExtensionConfig {
        enabled: true,
        browser: BrowserConfig::default(),
    });

    let tool_names = registry
        .tool_contributors()
        .iter()
        .flat_map(|contributor| contributor.tools(&session_store, &thread_store))
        .map(|tool| tool.tool_name())
        .collect::<Vec<_>>();

    assert_eq!(tool_names, vec![ToolName::plain(BROWSER_TOOL_NAME)]);
}
