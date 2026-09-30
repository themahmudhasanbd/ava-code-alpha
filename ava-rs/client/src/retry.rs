use ava_http_client::Request;
use ava_http_client::TransportError;
use rand::Rng;
use std::future::Future;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct RetryPolicy {
    pub max_attempts: u64,
    pub base_delay: Duration,
    pub retry_on: RetryOn,
}

#[derive(Debug, Clone, Default)]
pub struct RetryOn {
    pub retry_429: bool,
    pub retry_5xx: bool,
    pub retry_transport: bool,
    pub retry_auth: bool,
}

impl RetryOn {
    pub fn should_retry(&self, err: &TransportError, attempt: u64, max_attempts: u64) -> bool {
        if attempt >= max_attempts {
            return false;
        }
        match err {
            TransportError::Http { status, .. } => {
                (self.retry_429 && status.as_u16() == 429)
                    || (self.retry_auth && (status.as_u16() == 401 || status.as_u16() == 403))
                    || (self.retry_5xx && status.is_server_error())
            }
            TransportError::Timeout
            | TransportError::Connection(_)
            | TransportError::Network(_) => self.retry_transport,
            TransportError::Build(_)
            | TransportError::RetryLimit
            | TransportError::ResponseTooLarge { .. } => false,
        }
    }
}

pub fn backoff(base: Duration, attempt: u64) -> Duration {
    if attempt == 0 {
        return base;
    }
    let exp = 2u64.saturating_pow(attempt as u32 - 1);
    let millis = base.as_millis() as u64;
    let raw = millis.saturating_mul(exp);
    let jitter: f64 = rand::rng().random_range(0.9..1.1);
    Duration::from_millis((raw as f64 * jitter) as u64)
}

/// Identifies a retry path and its associated trace-event layer.
#[derive(Debug, Clone, Copy)]
pub enum RetryOperation {
    HttpRequest,
    Sampling,
    RemoteCompactionV2,
}

/// Emits retry telemetry at the caller's source location without adding it to normal OTEL logs.
#[macro_export]
macro_rules! record_retry {
    ($attempt:expr, $delay:expr, $operation:expr $(,)?) => {{
        let (layer, operation) = match $operation {
            $crate::RetryOperation::HttpRequest => ("http", "request"),
            $crate::RetryOperation::Sampling => ("stream", "sampling"),
            $crate::RetryOperation::RemoteCompactionV2 => ("stream", "remote_compaction_v2"),
        };

        ::tracing::event!(
            target: "ava_otel.trace_safe",
            ::tracing::Level::TRACE,
            event.name = "ava.retry",
            retry.attempt = $attempt,
            retry.delay_ms = ($delay).as_millis() as u64,
            retry.layer = layer,
            retry.operation = operation,
        );
    }};
}

pub async fn run_with_retry<T, F, Fut>(
    policy: RetryPolicy,
    make_req: impl FnMut() -> Request,
    op: F,
) -> Result<T, TransportError>
where
    F: Fn(Request, u64) -> Fut,
    Fut: Future<Output = Result<T, TransportError>>,
{
    run_with_retry_hook(policy, make_req, op, |_| {}).await
}

pub async fn run_with_retry_hook<T, F, Fut, H>(
    policy: RetryPolicy,
    mut make_req: impl FnMut() -> Request,
    op: F,
    mut on_retry: H,
) -> Result<T, TransportError>
where
    F: Fn(Request, u64) -> Fut,
    Fut: Future<Output = Result<T, TransportError>>,
    H: FnMut(&TransportError),
{
    for attempt in 0..=policy.max_attempts {
        let req = make_req();
        match op(req, attempt).await {
            Ok(resp) => return Ok(resp),
            Err(err)
                if policy
                    .retry_on
                    .should_retry(&err, attempt, policy.max_attempts) =>
            {
                on_retry(&err);
                let retry_attempt = attempt + 1;
                // TODO(anp): Respect Retry-After from HTTP responses before retrying the request.
                let delay = backoff(policy.base_delay, retry_attempt);
                crate::record_retry!(retry_attempt, delay, RetryOperation::HttpRequest);
                tokio::time::sleep(delay).await;
            }
            Err(err) => return Err(err),
        }
    }
    Err(TransportError::RetryLimit)
}

#[cfg(test)]
mod tests {
    use super::*;
    use http::StatusCode;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    #[test]
    fn retry_on_should_retry_auth_errors_when_enabled() {
        let retry_on = RetryOn {
            retry_429: false,
            retry_5xx: false,
            retry_transport: false,
            retry_auth: true,
        };

        let err_401 = TransportError::Http {
            status: StatusCode::UNAUTHORIZED,
            headers: http::HeaderMap::new(),
            body: Some("unauthorized".into()),
        };
        assert!(retry_on.should_retry(&err_401, 0, 3));

        let err_403 = TransportError::Http {
            status: StatusCode::FORBIDDEN,
            headers: http::HeaderMap::new(),
            body: Some("forbidden".into()),
        };
        assert!(retry_on.should_retry(&err_403, 0, 3));

        let err_400 = TransportError::Http {
            status: StatusCode::BAD_REQUEST,
            headers: http::HeaderMap::new(),
            body: Some("bad request".into()),
        };
        assert!(!retry_on.should_retry(&err_400, 0, 3));
    }

    #[tokio::test]
    async fn run_with_retry_hook_invokes_hook_on_retry() {
        let hook_invocations = Arc::new(AtomicUsize::new(0));
        let hook_clone = hook_invocations.clone();

        let policy = RetryPolicy {
            max_attempts: 2,
            base_delay: Duration::from_millis(1),
            retry_on: RetryOn {
                retry_429: true,
                retry_5xx: false,
                retry_transport: false,
                retry_auth: true,
            },
        };

        let call_count = Arc::new(AtomicUsize::new(0));
        let call_clone = call_count.clone();

        let result: Result<String, TransportError> = run_with_retry_hook(
            policy,
            || Request::new(http::Method::GET, "http://localhost/v1".into()),
            move |_, _| {
                let count = call_clone.fetch_add(1, Ordering::SeqCst);
                async move {
                    if count == 0 {
                        Err(TransportError::Http {
                            status: StatusCode::TOO_MANY_REQUESTS,
                            headers: http::HeaderMap::new(),
                            body: None,
                        })
                    } else if count == 1 {
                        Err(TransportError::Http {
                            status: StatusCode::UNAUTHORIZED,
                            headers: http::HeaderMap::new(),
                            body: None,
                        })
                    } else {
                        Ok("success".to_string())
                    }
                }
            },
            move |_| {
                hook_clone.fetch_add(1, Ordering::SeqCst);
            },
        )
        .await;

        assert_eq!(result.unwrap(), "success");
        assert_eq!(call_count.load(Ordering::SeqCst), 3);
        assert_eq!(hook_invocations.load(Ordering::SeqCst), 2);
    }
}
