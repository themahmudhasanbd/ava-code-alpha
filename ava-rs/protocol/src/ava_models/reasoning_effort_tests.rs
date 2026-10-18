use super::super::ReasoningEffortPreset;
use super::super::tests::test_model;
use super::ReasoningEffort;
use pretty_assertions::assert_eq;

#[test]
fn resolves_ultra_using_model_override_and_supported_fallbacks() {
    use ReasoningEffort::High;
    use ReasoningEffort::Low;
    use ReasoningEffort::Max;
    use ReasoningEffort::Medium;
    use ReasoningEffort::Ultra;

    // 4-tier ladder only: ultra -> max -> medium -> low. Legacy levels
    // (high, xhigh) are no longer valid fallback targets.
    for (supported, multi_agent_effort, expected) in [
        (vec![High, Max, Ultra], Some(High), Ultra),
        (vec![High, Max, Ultra], None, Ultra),
        (vec![High, Max], None, Max),
        (vec![Max, Medium], None, Max),
        (vec![Low, Medium], None, Medium),
        (vec![Low], None, Low),
        (vec![], None, Ultra),
    ] {
        let mut model = test_model(/*spec*/ None);
        model.supported_reasoning_levels = supported
            .into_iter()
            .map(|effort| ReasoningEffortPreset {
                effort,
                description: String::new(),
            })
            .collect();
        model.multi_agent_reasoning_effort = multi_agent_effort;
        assert_eq!(model.resolve_reasoning_effort(Ultra), expected);
    }
}

#[test]
fn resolves_max_and_medium_and_low_fallbacks() {
    use ReasoningEffort::High;
    use ReasoningEffort::Low;
    use ReasoningEffort::Max;
    use ReasoningEffort::Medium;

    let mut model = test_model(/*spec*/ None);
    model.supported_reasoning_levels = vec![
        ReasoningEffortPreset {
            effort: Low,
            description: String::new(),
        },
        ReasoningEffortPreset {
            effort: Medium,
            description: String::new(),
        },
        ReasoningEffortPreset {
            effort: High,
            description: String::new(),
        },
    ];

    // Model only has Low, Medium, High. Max is an unsupported primary tier,
    // so it falls back to the nearest supported primary tier: Medium.
    assert_eq!(model.resolve_reasoning_effort(Max), Medium);
    // User selects Medium -> uses Medium.
    assert_eq!(model.resolve_reasoning_effort(Medium), Medium);
    // User selects Low -> uses Low.
    assert_eq!(model.resolve_reasoning_effort(Low), Low);
}

#[test]
fn preserves_native_efforts_and_translates_persistent_mode() {
    let model = test_model(/*spec*/ None);
    for effort in [
        ReasoningEffort::Low,
        ReasoningEffort::Medium,
        ReasoningEffort::High,
        ReasoningEffort::Max,
        ReasoningEffort::Custom("future-effort".to_string()),
    ] {
        assert_eq!(model.resolve_reasoning_effort(effort.clone()), effort);
    }
    assert_eq!(
        model.resolve_reasoning_effort(ReasoningEffort::Persistent),
        ReasoningEffort::Custom("disabled".to_string()),
    );
}
