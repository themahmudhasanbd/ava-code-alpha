const PERSONAL_ACCESS_TOKEN_PREFIX: &str = "at-";

pub(super) enum AvaAccessToken<'a> {
    PersonalAccessToken(&'a str),
    AgentIdentityJwt(&'a str),
}

pub(super) fn classify_ava_access_token(access_token: &str) -> AvaAccessToken<'_> {
    if access_token.starts_with(PERSONAL_ACCESS_TOKEN_PREFIX) {
        AvaAccessToken::PersonalAccessToken(access_token)
    } else {
        AvaAccessToken::AgentIdentityJwt(access_token)
    }
}

#[cfg(test)]
#[path = "access_token_tests.rs"]
mod tests;
