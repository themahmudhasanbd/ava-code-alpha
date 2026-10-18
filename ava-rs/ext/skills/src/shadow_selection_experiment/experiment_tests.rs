use pretty_assertions::assert_eq;

use super::*;

#[test]
fn recent_invocations_refresh_recency_and_evict_old_skills() {
    let history = RecentSkillInvocations::default();
    for index in 0..=MAX_SHADOW_RESULTS {
        history.record(format!("skill-{index}"));
    }
    history.record("skill-1".to_string());

    let recent = history.snapshot();

    assert_eq!(MAX_SHADOW_RESULTS, recent.len());
    assert_eq!(Some("skill-1"), recent.first().map(String::as_str));
    assert_eq!(Some("skill-2"), recent.last().map(String::as_str));
    assert!(!recent.iter().any(|skill| skill == "skill-0"));
}

#[test]
fn rank_buckets_distinguish_results_above_twenty() {
    assert_eq!("11_20", rank_bucket(Some(20)));
    assert_eq!("21_50", rank_bucket(Some(21)));
    assert_eq!("21_50", rank_bucket(Some(50)));
    assert_eq!("miss", rank_bucket(Some(51)));
}

#[test]
fn selected_skill_resources_accumulates_and_falls_back() {
    let mut eligible = HashSet::new();
    eligible.insert("skill-fallback-1".to_string());
    eligible.insert("skill-fallback-2".to_string());

    // Case 1: BM25 is empty, but character_ngram has matches
    let state = ShadowSelectionTurnState {
        ranked_selections: vec![
            RankedSelection {
                method: "fielded_bm25_v1",
                skill_resources: vec![],
            },
            RankedSelection {
                method: "character_ngram_v1",
                skill_resources: vec!["skill-ngram-1".to_string(), "skill-ngram-2".to_string()],
            },
        ],
        explicitly_selected_resources: HashSet::new(),
        turn_id: "turn-1".to_string(),
        query_script: "Latin",
        eligible_skill_resources: eligible.clone(),
        seen_skill_resources: Mutex::new(HashSet::new()),
        recent_skill_invocations: Arc::new(RecentSkillInvocations::default()),
        task_context: Arc::new(ShadowTaskContext::default()),
    };

    let selected = state.selected_skill_resources(5);
    assert!(selected.contains("skill-ngram-1"));
    assert!(selected.contains("skill-ngram-2"));

    // Case 2: All selectors empty -> falls back to eligible skills
    let empty_state = ShadowSelectionTurnState {
        ranked_selections: vec![RankedSelection {
            method: "fielded_bm25_v1",
            skill_resources: vec![],
        }],
        explicitly_selected_resources: HashSet::new(),
        turn_id: "turn-2".to_string(),
        query_script: "Bengali",
        eligible_skill_resources: eligible,
        seen_skill_resources: Mutex::new(HashSet::new()),
        recent_skill_invocations: Arc::new(RecentSkillInvocations::default()),
        task_context: Arc::new(ShadowTaskContext::default()),
    };

    let fallback_selected = empty_state.selected_skill_resources(5);
    assert!(!fallback_selected.is_empty());
    assert!(
        fallback_selected.contains("skill-fallback-1")
            || fallback_selected.contains("skill-fallback-2")
    );
}

