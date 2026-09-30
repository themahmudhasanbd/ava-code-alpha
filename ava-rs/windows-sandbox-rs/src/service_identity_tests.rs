use super::validate_service_family_hint;

#[test]
fn service_routing_accepts_package_families() {
    for family in ["OpenAI.Ava_3k8sg7r9htsxt", "OpenAI.AvaBeta_jabp31b5fhs74"] {
        assert!(validate_service_family_hint(family).is_ok());
    }
}

#[test]
fn service_routing_rejects_paths_and_malformed_families() {
    for family in [
        "",
        "_3k8sg7r9htsxt",
        "OpenAI.Ava_bad",
        "OpenAI.Ava_3k8sg7r9htsxt\\child",
        "..\\OpenAI.Ava_3k8sg7r9htsxt",
        "OpenAI.Ava_extra_3k8sg7r9htsxt",
        "OpenAI.Ava\0_3k8sg7r9htsxt",
    ] {
        assert!(validate_service_family_hint(family).is_err(), "{family:?}");
    }
}
