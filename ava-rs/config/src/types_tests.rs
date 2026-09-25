use super::*;
use pretty_assertions::assert_eq;

#[test]
fn deserialize_skill_config_with_name_selector() {
    let cfg: SkillConfig = toml::from_str(
        r#"
            name = "github:yeet"
            enabled = false
        "#,
    )
    .expect("should deserialize skill config with name selector");

    assert_eq!(cfg.name.as_deref(), Some("github:yeet"));
    assert_eq!(cfg.path, None);
    assert!(!cfg.enabled);
}

#[test]
fn deserialize_skill_config_with_path_selector() {
    let tempdir = tempfile::tempdir().expect("tempdir");
    let skill_path = tempdir.path().join("skills").join("demo").join("SKILL.md");
    let cfg: SkillConfig = toml::from_str(&format!(
        r#"
            path = {path:?}
            enabled = false
        "#,
        path = skill_path.display().to_string(),
    ))
    .expect("should deserialize skill config with path selector");

    assert_eq!(
        cfg,
        SkillConfig {
            path: Some(
                AbsolutePathBuf::from_absolute_path(&skill_path)
                    .expect("skill path should be absolute"),
            ),
            name: None,
            enabled: false,
        }
    );
}

#[test]
fn memories_config_clamps_count_limits_to_nonzero_values() {
    let config = MemoriesConfig::from(MemoriesToml {
        max_raw_memories_for_consolidation: Some(0),
        max_rollouts_per_startup: Some(0),
        ..Default::default()
    });

    assert_eq!(
        config,
        MemoriesConfig {
            max_raw_memories_for_consolidation: 1,
            max_rollouts_per_startup: 1,
            ..MemoriesConfig::default()
        }
    );
}

#[test]
fn memories_config_clamps_rate_limit_remaining_threshold() {
    let config = MemoriesConfig::from(MemoriesToml {
        min_rate_limit_remaining_percent: Some(101),
        ..Default::default()
    });
    assert_eq!(
        config,
        MemoriesConfig {
            min_rate_limit_remaining_percent: 100,
            ..MemoriesConfig::default()
        }
    );

    let config = MemoriesConfig::from(MemoriesToml {
        min_rate_limit_remaining_percent: Some(-1),
        ..Default::default()
    });
    assert_eq!(
        config,
        MemoriesConfig {
            min_rate_limit_remaining_percent: 0,
            ..MemoriesConfig::default()
        }
    );
}

#[test]
fn memories_version_selects_pipeline_without_changing_other_defaults() {
    for (source, version) in [
        ("", MemoryVersion::V1),
        ("version = \"v2\"", MemoryVersion::V2),
    ] {
        let parsed: MemoriesToml = toml::from_str(source).expect("parse memories config");
        assert_eq!(
            MemoriesConfig::from(parsed),
            MemoriesConfig {
                version,
                ..Default::default()
            }
        );
    }
    assert!(toml::from_str::<MemoriesToml>("version = \"v3\"").is_err());
}

#[test]
fn memories_config_scope_and_preferences_defaults_and_parsing() {
    let source = r#"
enabled = true
session_memory_enabled = false
default_scope = "global"

[preferences]
min_confidence_percent = 85
default_importance = "high"
max_results = 25
auto_save_verified_evidence = false
cross_session_search = false
"#;
    let parsed: MemoriesToml = toml::from_str(source).expect("parse memories config");
    let config = MemoriesConfig::from(parsed);
    assert!(config.use_memories);
    assert!(!config.session_memory_enabled);
    assert_eq!(config.default_scope, crate::types::MemoryScope::Global);
    assert_eq!(config.preferences.min_confidence_percent, 85);
    assert_eq!(config.preferences.default_importance, "high");
    assert_eq!(config.preferences.max_results, 25);
    assert!(!config.preferences.auto_save_verified_evidence);
    assert!(!config.preferences.cross_session_search);
}

#[test]
fn memories_config_disabled_via_alias() {
    let source = "enabled = false";
    let parsed: MemoriesToml = toml::from_str(source).expect("parse memories config");
    let config = MemoriesConfig::from(parsed);
    assert!(!config.use_memories);
}
