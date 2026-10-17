use super::CHANNEL_CAPACITY;
use super::ConnectionOrigin;
use super::TransportEvent;
use super::auth::WebsocketAuthPolicy;
use super::auth::authorize_upgrade;
use super::auth::authorize_upgrade_with_query;
use super::auth::is_unauthenticated_non_loopback_listener;
use super::forward_incoming_message;
use super::next_connection_id;
use super::serialize_outgoing_message;
use crate::outgoing_message::ConnectionId;
use crate::outgoing_message::QueuedOutgoingMessage;
use axum::Router;
use axum::body::Body;
use axum::body::Bytes;
use axum::extract::ConnectInfo;
use axum::extract::RawQuery;
use axum::extract::State;
use axum::extract::ws::Message as AxumWebSocketMessage;
use axum::extract::ws::WebSocketUpgrade;
use axum::http::HeaderMap;
use axum::http::Request;
use axum::http::StatusCode;
use axum::http::header::ORIGIN;
use axum::middleware;
use axum::middleware::Next;
use axum::response::IntoResponse;
use axum::response::Response;
use axum::routing::any;
use axum::routing::get;
use axum::routing::post;
use futures::SinkExt;
use futures::StreamExt;
use owo_colors::OwoColorize;
use owo_colors::Stream;
use owo_colors::Style;
use std::io::Result as IoResult;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tokio_tungstenite::tungstenite::Message as TungsteniteWebSocketMessage;
use tokio_util::sync::CancellationToken;
use tracing::error;
use tracing::info;
use tracing::warn;

/// WebSocket clients can briefly lag behind normal turn output bursts while the
/// writer task is healthy, so give them more headroom than internal channels.
const WEBSOCKET_OUTBOUND_CHANNEL_CAPACITY: usize = 32 * 1024;
const _: () = assert!(WEBSOCKET_OUTBOUND_CHANNEL_CAPACITY > CHANNEL_CAPACITY);

fn colorize(text: &str, style: Style) -> String {
    text.if_supports_color(Stream::Stderr, |value| value.style(style))
        .to_string()
}

#[allow(clippy::print_stderr)]
fn print_websocket_startup_banner(addr: SocketAddr) {
    let title = colorize("ava app-server (WebSockets)", Style::new().bold().cyan());
    let listening_label = colorize("listening on:", Style::new().dimmed());
    let listen_url = colorize(&format!("ws://{addr}"), Style::new().green());
    let ready_label = colorize("readyz:", Style::new().dimmed());
    let ready_url = colorize(&format!("http://{addr}/readyz"), Style::new().green());
    let health_label = colorize("healthz:", Style::new().dimmed());
    let health_url = colorize(&format!("http://{addr}/healthz"), Style::new().green());
    let note_label = colorize("note:", Style::new().dimmed());
    eprintln!("{title}");
    eprintln!("  {listening_label} {listen_url}");
    eprintln!("  {ready_label} {ready_url}");
    eprintln!("  {health_label} {health_url}");
    if addr.ip().is_loopback() {
        eprintln!(
            "  {note_label} binds localhost only (use SSH port-forwarding for remote access)"
        );
    } else {
        eprintln!("  {note_label} websocket auth is required for non-localhost listeners");
    }
}

#[derive(Clone)]
struct WebSocketListenerState {
    transport_event_tx: mpsc::Sender<TransportEvent>,
    auth_policy: Arc<WebsocketAuthPolicy>,
    broadcast_tx: tokio::sync::broadcast::Sender<String>,
}

async fn health_check_handler(
    headers: HeaderMap,
    RawQuery(query): RawQuery,
    State(state): State<WebSocketListenerState>,
) -> impl IntoResponse {
    let mut response_headers = HeaderMap::new();
    if let Ok(v) = "*".parse() {
        response_headers.insert("Access-Control-Allow-Origin", v);
    }
    if let Ok(v) = "GET, POST, OPTIONS".parse() {
        response_headers.insert("Access-Control-Allow-Methods", v);
    }
    if let Ok(v) =
        "Authorization, Content-Type, Accept, Origin, User-Agent, x-ava-client, x-avacode-client"
            .parse()
    {
        response_headers.insert("Access-Control-Allow-Headers", v);
    }

    let server_auth = super::auth::load_server_auth();
    if server_auth
        .as_ref()
        .is_some_and(|cfg| cfg.auth_enabled && !cfg.users.is_empty())
    {
        if headers.contains_key(axum::http::header::AUTHORIZATION) || query.is_some() {
            if let Err(err) =
                authorize_upgrade_with_query(&headers, query.as_deref(), state.auth_policy.as_ref())
            {
                return (err.status_code(), response_headers, err.message()).into_response();
            }
        }
    }

    (StatusCode::OK, response_headers, "OK").into_response()
}

fn read_current_model_config() -> (String, String) {
    let auth_paths = [
        std::path::PathBuf::from("/root/.ava-code/auth.json"),
        std::path::PathBuf::from("/var/www/ava-code/.ava-code/auth.json"),
    ];
    for path in &auth_paths {
        if let Ok(content) = std::fs::read_to_string(path) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                let p = val
                    .get("provider")
                    .and_then(|v| v.as_str())
                    .unwrap_or("custom")
                    .to_string();
                let m = val
                    .get("model")
                    .and_then(|v| v.as_str())
                    .unwrap_or("default")
                    .to_string();
                return (p, m);
            }
        }
    }
    ("custom".into(), "default".into())
}

async fn reload_handler(
    headers: HeaderMap,
    RawQuery(query): RawQuery,
    State(state): State<WebSocketListenerState>,
) -> impl IntoResponse {
    let mut response_headers = HeaderMap::new();
    if let Ok(v) = "*".parse() {
        response_headers.insert("Access-Control-Allow-Origin", v);
    }
    if let Ok(v) = "GET, POST, OPTIONS".parse() {
        response_headers.insert("Access-Control-Allow-Methods", v);
    }
    if let Ok(v) =
        "Authorization, Content-Type, Accept, Origin, User-Agent, x-ava-client, x-avacode-client"
            .parse()
    {
        response_headers.insert("Access-Control-Allow-Headers", v);
    }
    if let Ok(v) = "application/json".parse() {
        response_headers.insert("Content-Type", v);
    }

    let server_auth = super::auth::load_server_auth();
    if server_auth
        .as_ref()
        .is_some_and(|cfg| cfg.auth_enabled && !cfg.users.is_empty())
    {
        if let Err(err) =
            authorize_upgrade_with_query(&headers, query.as_deref(), state.auth_policy.as_ref())
        {
            let err_body = serde_json::json!({
                "ok": false,
                "error": err.message(),
                "status": "unauthorized"
            })
            .to_string();
            return (err.status_code(), response_headers, err_body).into_response();
        }
    }

    let (provider, model) = read_current_model_config();
    let users_count = server_auth.as_ref().map(|s| s.users.len()).unwrap_or(0);
    let now_ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    // Broadcast reload notifications to all connected clients
    let server_reloaded_ev = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "server/reloaded",
        "params": {
            "reloaded_at": now_ts,
            "provider": provider,
            "defaultModel": model,
            "users_count": users_count
        }
    })
    .to_string();

    let catalog_updated_ev = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "catalog/updated",
        "params": {
            "defaultModel": model
        }
    })
    .to_string();

    let _ = state.broadcast_tx.send(server_reloaded_ev);
    let _ = state.broadcast_tx.send(catalog_updated_ev);
    let receiver_count = state.broadcast_tx.receiver_count();

    info!(
        default_model = %model,
        provider = %provider,
        clients_notified = receiver_count,
        "Configuration hot-reloaded successfully without restarting server"
    );

    let resp_body = serde_json::json!({
        "ok": true,
        "status": "reloaded",
        "message": "Configuration reloaded successfully without restarting server",
        "reloaded_at": now_ts,
        "provider": provider,
        "default_model": model,
        "active_users": users_count,
        "clients_notified": receiver_count
    })
    .to_string();

    (StatusCode::OK, response_headers, resp_body).into_response()
}

async fn reject_requests_with_origin_header(
    request: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    Ok(next.run(request).await)
}

async fn websocket_upgrade_handler(
    websocket: WebSocketUpgrade,
    ConnectInfo(peer_addr): ConnectInfo<SocketAddr>,
    State(state): State<WebSocketListenerState>,
    RawQuery(query): RawQuery,
    headers: HeaderMap,
) -> impl IntoResponse {
    if let Err(err) =
        authorize_upgrade_with_query(&headers, query.as_deref(), state.auth_policy.as_ref())
    {
        warn!(
            %peer_addr,
            message = err.message(),
            "rejecting websocket client during upgrade"
        );
        return (err.status_code(), err.message()).into_response();
    }
    info!(%peer_addr, "websocket client connected");
    let broadcast_tx = state.broadcast_tx.clone();
    websocket
        .max_message_size(64 * 1024 * 1024)
        .max_frame_size(64 * 1024 * 1024)
        .on_upgrade(move |stream| async move {
            let (websocket_writer, websocket_reader) = stream.split();
            run_websocket_connection_with_broadcast(
                websocket_writer,
                websocket_reader,
                state.transport_event_tx,
                Some(broadcast_tx),
            )
            .await;
        })
        .into_response()
}

pub async fn start_websocket_acceptor(
    bind_address: SocketAddr,
    transport_event_tx: mpsc::Sender<TransportEvent>,
    shutdown_token: CancellationToken,
    auth_policy: WebsocketAuthPolicy,
) -> IoResult<JoinHandle<()>> {
    if is_unauthenticated_non_loopback_listener(bind_address, &auth_policy) {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!(
                "refusing to start non-loopback websocket listener {bind_address} without auth; configure `--ws-auth capability-token` or `--ws-auth signed-bearer-token`"
            ),
        ));
    }
    let listener = TcpListener::bind(bind_address).await?;
    let local_addr = listener.local_addr()?;
    print_websocket_startup_banner(local_addr);
    info!("app-server websocket listening on ws://{local_addr}");

    let (broadcast_tx, _) = tokio::sync::broadcast::channel::<String>(256);

    let router = Router::new()
        .route("/readyz", get(health_check_handler))
        .route("/healthz", get(health_check_handler))
        .route("/reload", get(reload_handler).post(reload_handler))
        .route("/api/reload", get(reload_handler).post(reload_handler))
        .route("/api/v1/reload", get(reload_handler).post(reload_handler))
        .fallback(any(websocket_upgrade_handler))
        .layer(middleware::from_fn(reject_requests_with_origin_header))
        .with_state(WebSocketListenerState {
            transport_event_tx,
            auth_policy: Arc::new(auth_policy),
            broadcast_tx: broadcast_tx.clone(),
        });

    // Background file watcher for instant live apply on config changes
    let broadcast_tx_for_watcher = broadcast_tx.clone();
    tokio::spawn(async move {
        let mut last_mtime: std::collections::HashMap<
            std::path::PathBuf,
            Option<std::time::SystemTime>,
        > = std::collections::HashMap::new();
        let watch_files = [
            std::path::PathBuf::from("/root/.ava-code/auth.json"),
            std::path::PathBuf::from("/root/.ava-code/config.toml"),
            std::path::PathBuf::from("/root/.ava-code/server-auth.json"),
            std::path::PathBuf::from("/var/www/ava-code/.ava-code/auth.json"),
            std::path::PathBuf::from("/var/www/ava-code/.ava-code/server-auth.json"),
        ];

        for p in &watch_files {
            let m = std::fs::metadata(p)
                .ok()
                .and_then(|meta| meta.modified().ok());
            last_mtime.insert(p.clone(), m);
        }

        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;
            let mut changed = false;
            for p in &watch_files {
                let m = std::fs::metadata(p)
                    .ok()
                    .and_then(|meta| meta.modified().ok());
                if let Some(prev) = last_mtime.get(p) {
                    if prev != &m {
                        last_mtime.insert(p.clone(), m);
                        changed = true;
                    }
                } else if m.is_some() {
                    last_mtime.insert(p.clone(), m);
                    changed = true;
                }
            }

            if changed {
                let (provider, model) = read_current_model_config();
                info!(%provider, %model, "Config change detected on disk, hot-broadcasting to clients");
                let now_ts = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
                let server_reloaded_ev = serde_json::json!({
                    "jsonrpc": "2.0",
                    "method": "server/reloaded",
                    "params": {
                        "provider": provider,
                        "defaultModel": model,
                        "reloaded_at": now_ts
                    }
                })
                .to_string();
                let catalog_updated_ev = serde_json::json!({
                    "jsonrpc": "2.0",
                    "method": "catalog/updated",
                    "params": {
                        "defaultModel": model
                    }
                })
                .to_string();
                let _ = broadcast_tx_for_watcher.send(server_reloaded_ev);
                let _ = broadcast_tx_for_watcher.send(catalog_updated_ev);
            }
        }
    });

    let server = axum::serve(
        listener,
        router.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(async move {
        shutdown_token.cancelled().await;
    });
    Ok(tokio::spawn(async move {
        if let Err(err) = server.await {
            error!("websocket acceptor failed: {err}");
        }
        info!("websocket acceptor shutting down");
    }))
}

pub(crate) async fn run_websocket_connection<M, SinkError, StreamError>(
    websocket_writer: impl futures::sink::Sink<M, Error = SinkError> + Send + 'static,
    websocket_reader: impl futures::stream::Stream<Item = Result<M, StreamError>> + Send + 'static,
    transport_event_tx: mpsc::Sender<TransportEvent>,
) where
    M: AppServerWebSocketMessage + Send + 'static,
    SinkError: Send + 'static,
    StreamError: std::fmt::Display + Send + 'static,
{
    run_websocket_connection_with_broadcast(
        websocket_writer,
        websocket_reader,
        transport_event_tx,
        None,
    )
    .await;
}

pub(crate) async fn run_websocket_connection_with_broadcast<M, SinkError, StreamError>(
    websocket_writer: impl futures::sink::Sink<M, Error = SinkError> + Send + 'static,
    websocket_reader: impl futures::stream::Stream<Item = Result<M, StreamError>> + Send + 'static,
    transport_event_tx: mpsc::Sender<TransportEvent>,
    broadcast_tx: Option<tokio::sync::broadcast::Sender<String>>,
) where
    M: AppServerWebSocketMessage + Send + 'static,
    SinkError: Send + 'static,
    StreamError: std::fmt::Display + Send + 'static,
{
    let connection_id = next_connection_id();
    let (writer_tx, writer_rx) =
        mpsc::channel::<QueuedOutgoingMessage>(WEBSOCKET_OUTBOUND_CHANNEL_CAPACITY);
    let writer_tx_for_reader = writer_tx.clone();
    let disconnect_token = CancellationToken::new();
    if transport_event_tx
        .send(TransportEvent::ConnectionOpened {
            connection_id,
            origin: ConnectionOrigin::WebSocket,
            auth: None,
            writer: writer_tx,
            disconnect_sender: Some(disconnect_token.clone()),
        })
        .await
        .is_err()
    {
        return;
    }

    let (writer_control_tx, writer_control_rx) = mpsc::channel::<M>(CHANNEL_CAPACITY);
    let broadcast_task = broadcast_tx.map(|tx| {
        let writer_control_tx_for_broadcast = writer_control_tx.clone();
        let mut broadcast_rx = tx.subscribe();
        tokio::spawn(async move {
            while let Ok(msg) = broadcast_rx.recv().await {
                if writer_control_tx_for_broadcast
                    .send(M::text(msg))
                    .await
                    .is_err()
                {
                    break;
                }
            }
        })
    });

    let mut outbound_task = tokio::spawn(run_websocket_outbound_loop(
        websocket_writer,
        writer_rx,
        writer_control_rx,
        disconnect_token.clone(),
    ));
    let mut inbound_task = tokio::spawn(run_websocket_inbound_loop(
        websocket_reader,
        transport_event_tx.clone(),
        writer_tx_for_reader,
        writer_control_tx,
        connection_id,
        disconnect_token.clone(),
    ));

    tokio::select! {
        _ = &mut outbound_task => {
            disconnect_token.cancel();
            inbound_task.abort();
            if let Some(task) = broadcast_task {
                task.abort();
            }
        }
        _ = &mut inbound_task => {
            disconnect_token.cancel();
            outbound_task.abort();
            if let Some(task) = broadcast_task {
                task.abort();
            }
        }
    }

    let _ = transport_event_tx
        .send(TransportEvent::ConnectionClosed { connection_id })
        .await;
}

pub(crate) enum IncomingWebSocketMessage {
    Text(String),
    Binary,
    Ping(Bytes),
    Pong,
    Close,
}

/// Converts concrete WebSocket message types into the small message surface the
/// app-server transport needs, and constructs the only outbound frames it
/// sends directly.
pub(crate) trait AppServerWebSocketMessage: Sized {
    fn text(text: String) -> Self;
    fn pong(payload: Bytes) -> Self;
    fn into_incoming(self) -> Option<IncomingWebSocketMessage>;
}

impl AppServerWebSocketMessage for AxumWebSocketMessage {
    fn text(text: String) -> Self {
        Self::Text(text.into())
    }

    fn pong(payload: Bytes) -> Self {
        Self::Pong(payload)
    }

    fn into_incoming(self) -> Option<IncomingWebSocketMessage> {
        Some(match self {
            Self::Text(text) => IncomingWebSocketMessage::Text(text.to_string()),
            Self::Binary(_) => IncomingWebSocketMessage::Binary,
            Self::Ping(payload) => IncomingWebSocketMessage::Ping(payload),
            Self::Pong(_) => IncomingWebSocketMessage::Pong,
            Self::Close(_) => IncomingWebSocketMessage::Close,
        })
    }
}

impl AppServerWebSocketMessage for TungsteniteWebSocketMessage {
    fn text(text: String) -> Self {
        Self::Text(text.into())
    }

    fn pong(payload: Bytes) -> Self {
        Self::Pong(payload)
    }

    fn into_incoming(self) -> Option<IncomingWebSocketMessage> {
        Some(match self {
            Self::Text(text) => IncomingWebSocketMessage::Text(text.to_string()),
            Self::Binary(_) => IncomingWebSocketMessage::Binary,
            Self::Ping(payload) => IncomingWebSocketMessage::Ping(payload),
            Self::Pong(_) => IncomingWebSocketMessage::Pong,
            Self::Close(_) => IncomingWebSocketMessage::Close,
            Self::Frame(_) => return None,
        })
    }
}

async fn run_websocket_outbound_loop<M, SinkError>(
    websocket_writer: impl futures::sink::Sink<M, Error = SinkError> + Send + 'static,
    mut writer_rx: mpsc::Receiver<QueuedOutgoingMessage>,
    mut writer_control_rx: mpsc::Receiver<M>,
    disconnect_token: CancellationToken,
) where
    M: AppServerWebSocketMessage + Send + 'static,
    SinkError: Send + 'static,
{
    tokio::pin!(websocket_writer);
    loop {
        tokio::select! {
            _ = disconnect_token.cancelled() => {
                break;
            }
            message = writer_control_rx.recv() => {
                let Some(message) = message else {
                    break;
                };
                if websocket_writer.send(message).await.is_err() {
                    break;
                }
            }
            queued_message = writer_rx.recv() => {
                let Some(queued_message) = queued_message else {
                    break;
                };
                let Some(json) = serialize_outgoing_message(queued_message.message) else {
                    continue;
                };
                if websocket_writer.send(M::text(json)).await.is_err() {
                    break;
                }
                if let Some(write_complete_tx) = queued_message.write_complete_tx {
                    let _ = write_complete_tx.send(());
                }
            }
        }
    }
}

async fn run_websocket_inbound_loop<M, StreamError>(
    websocket_reader: impl futures::stream::Stream<Item = Result<M, StreamError>> + Send + 'static,
    transport_event_tx: mpsc::Sender<TransportEvent>,
    writer_tx_for_reader: mpsc::Sender<QueuedOutgoingMessage>,
    writer_control_tx: mpsc::Sender<M>,
    connection_id: ConnectionId,
    disconnect_token: CancellationToken,
) where
    M: AppServerWebSocketMessage + Send + 'static,
    StreamError: std::fmt::Display + Send + 'static,
{
    tokio::pin!(websocket_reader);
    loop {
        tokio::select! {
            _ = disconnect_token.cancelled() => {
                break;
            }
            incoming_message = websocket_reader.next() => {
                match incoming_message {
                    Some(Ok(message)) => match message.into_incoming() {
                        Some(IncomingWebSocketMessage::Text(text))
                            if !forward_incoming_message(
                                &transport_event_tx,
                                &writer_tx_for_reader,
                                connection_id,
                                &text,
                            )
                            .await
                        => {
                            break;
                        }
                        Some(IncomingWebSocketMessage::Text(_)) => {}
                        Some(IncomingWebSocketMessage::Ping(payload)) => {
                            match writer_control_tx.try_send(M::pong(payload)) {
                                Ok(()) => {}
                                Err(tokio::sync::mpsc::error::TrySendError::Closed(_)) => break,
                                Err(tokio::sync::mpsc::error::TrySendError::Full(_)) => {
                                    warn!("websocket control queue full while replying to ping; closing connection");
                                    break;
                                }
                            }
                        }
                        Some(IncomingWebSocketMessage::Pong) => {}
                        Some(IncomingWebSocketMessage::Close) => break,
                        Some(IncomingWebSocketMessage::Binary) => {
                            warn!("dropping unsupported binary websocket message");
                        }
                        None => {}
                    },
                    None => break,
                    Some(Err(err)) => {
                        warn!("websocket receive error: {err}");
                        break;
                    }
                }
            }
        }
    }
}
