use std::sync::Arc;
use std::sync::atomic::AtomicUsize;
use std::sync::atomic::Ordering;
use ava_api::AuthProvider;
use http::HeaderMap;
use http::HeaderValue;

/// Bearer-token auth provider for OpenAI-compatible model-provider requests with multi-token rotation support.
#[derive(Clone, Default)]
pub struct BearerAuthProvider {
    pub token: Option<String>,
    pub tokens: Vec<String>,
    pub current_index: Arc<AtomicUsize>,
    pub account_id: Option<String>,
    pub is_fedramp_account: bool,
}

impl BearerAuthProvider {
    pub fn new(token: String) -> Self {
        let trimmed = token.trim().to_string();
        let tokens = if trimmed.is_empty() { vec![] } else { vec![trimmed.clone()] };
        Self {
            token: if trimmed.is_empty() { None } else { Some(trimmed) },
            tokens,
            current_index: Arc::new(AtomicUsize::new(0)),
            account_id: None,
            is_fedramp_account: false,
        }
    }

    pub fn from_tokens(tokens: Vec<String>) -> Self {
        let valid_tokens: Vec<String> = tokens
            .into_iter()
            .map(|t| t.trim().to_string())
            .filter(|t| !t.is_empty())
            .collect();
        let first = valid_tokens.first().cloned();
        Self {
            token: first,
            tokens: valid_tokens,
            current_index: Arc::new(AtomicUsize::new(0)),
            account_id: None,
            is_fedramp_account: false,
        }
    }

    pub fn for_test(token: Option<&str>, account_id: Option<&str>) -> Self {
        let tokens = token
            .map(|t| vec![t.to_string()])
            .unwrap_or_default();
        Self {
            token: token.map(str::to_string),
            tokens,
            current_index: Arc::new(AtomicUsize::new(0)),
            account_id: account_id.map(str::to_string),
            is_fedramp_account: false,
        }
    }

    pub fn current_token(&self) -> Option<String> {
        if !self.tokens.is_empty() {
            let idx = self.current_index.load(Ordering::Relaxed) % self.tokens.len();
            Some(self.tokens[idx].clone())
        } else {
            self.token.clone()
        }
    }

    pub fn rotate_next_token(&self) -> Option<String> {
        if self.tokens.len() <= 1 {
            return self.current_token();
        }
        let next_idx = self.current_index.fetch_add(1, Ordering::SeqCst) + 1;
        let idx = next_idx % self.tokens.len();
        Some(self.tokens[idx].clone())
    }

    pub fn token_count(&self) -> usize {
        if !self.tokens.is_empty() {
            self.tokens.len()
        } else if self.token.is_some() {
            1
        } else {
            0
        }
    }
}

impl AuthProvider for BearerAuthProvider {
    fn add_auth_headers(&self, headers: &mut HeaderMap) {
        if let Some(token) = self.current_token()
            && let Ok(header) = HeaderValue::from_str(&format!("Bearer {token}"))
        {
            let _ = headers.insert(http::header::AUTHORIZATION, header);
        }
        if let Some(account_id) = self.account_id.as_ref()
            && let Ok(header) = HeaderValue::from_str(account_id)
        {
            let _ = headers.insert("ChatGPT-Account-ID", header);
        }
        if self.is_fedramp_account {
            let _ = headers.insert("X-OpenAI-Fedramp", HeaderValue::from_static("true"));
        }
    }

    fn rotate_credentials(&self) -> bool {
        self.tokens.len() > 1 && self.rotate_next_token().is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn bearer_auth_provider_reports_when_auth_header_will_attach() {
        let auth = BearerAuthProvider::new("access-token".to_string());

        assert_eq!(
            ava_api::auth_header_telemetry(&auth),
            ava_api::AuthHeaderTelemetry {
                attached: true,
                name: Some("authorization"),
            }
        );
    }

    #[test]
    fn bearer_auth_provider_multi_token_rotation() {
        let auth = BearerAuthProvider::from_tokens(vec![
            "token_alpha".to_string(),
            "token_beta".to_string(),
            "token_gamma".to_string(),
        ]);

        assert_eq!(auth.token_count(), 3);
        assert_eq!(auth.current_token(), Some("token_alpha".to_string()));

        let next1 = auth.rotate_next_token();
        assert_eq!(next1, Some("token_beta".to_string()));
        assert_eq!(auth.current_token(), Some("token_beta".to_string()));

        let next2 = auth.rotate_next_token();
        assert_eq!(next2, Some("token_gamma".to_string()));
        assert_eq!(auth.current_token(), Some("token_gamma".to_string()));

        let next3 = auth.rotate_next_token();
        assert_eq!(next3, Some("token_alpha".to_string()));
        assert_eq!(auth.current_token(), Some("token_alpha".to_string()));
    }

    #[test]
    fn bearer_auth_provider_adds_auth_headers() {
        let auth = BearerAuthProvider::for_test(Some("access-token"), Some("workspace-123"));
        let mut headers = HeaderMap::new();

        auth.add_auth_headers(&mut headers);

        assert_eq!(
            headers
                .get(http::header::AUTHORIZATION)
                .and_then(|value| value.to_str().ok()),
            Some("Bearer access-token")
        );
        assert_eq!(
            headers
                .get("ChatGPT-Account-ID")
                .and_then(|value| value.to_str().ok()),
            Some("workspace-123")
        );
    }

    #[test]
    fn bearer_auth_provider_adds_fedramp_routing_header_for_fedramp_accounts() {
        let mut auth = BearerAuthProvider::new("access-token".to_string());
        auth.account_id = Some("workspace-123".to_string());
        auth.is_fedramp_account = true;
        let mut headers = HeaderMap::new();

        auth.add_auth_headers(&mut headers);

        assert_eq!(
            headers
                .get("X-OpenAI-Fedramp")
                .and_then(|value| value.to_str().ok()),
            Some("true")
        );
    }
}
