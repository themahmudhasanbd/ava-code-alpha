use super::*;

#[test]
fn classifies_personal_access_tokens_by_prefix() {
    assert!(matches!(
        classify_ava_access_token("at-example"),
        AvaAccessToken::PersonalAccessToken("at-example")
    ));
    assert!(matches!(
        classify_ava_access_token("header.payload.signature"),
        AvaAccessToken::AgentIdentityJwt("header.payload.signature")
    ));
}
