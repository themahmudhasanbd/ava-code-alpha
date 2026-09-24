use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use tokio::net::TcpStream;
use tokio::sync::{Mutex, oneshot};
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream, connect_async, tungstenite::{Message, client::IntoClientRequest}};

use super::rpc::{RpcRequest, RpcResponse, RpcError};
use tauri::Emitter;

type WsStream = WebSocketStream<MaybeTlsStream<TcpStream>>;
type PendingMap = HashMap<u64, oneshot::Sender<Result<Value, RpcError>>>;

pub struct WsState {
    inner: Mutex<Option<WsInner>>,
    rpc_counter: AtomicU64,
    server_url: Mutex<String>,
    username: Mutex<String>,
    password: Mutex<String>,
    app_handle: Mutex<Option<tauri::AppHandle>>,
    reconnecting: AtomicBool,
}

struct WsInner {
    write_tx: futures_util::stream::SplitSink<WsStream, Message>,
    pending: Arc<Mutex<PendingMap>>,
}

impl WsState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
            rpc_counter: AtomicU64::new(1),
            server_url: Mutex::new(String::new()),
            username: Mutex::new(String::new()),
            password: Mutex::new(String::new()),
            app_handle: Mutex::new(None),
            reconnecting: AtomicBool::new(false),
        }
    }

    pub async fn connect(
        &self,
        server_url: &str,
        username: &str,
        password: &str,
        app_handle: tauri::AppHandle,
    ) -> Result<(), String> {
        // Store credentials for reconnection
        *self.server_url.lock().await = server_url.to_string();
        *self.username.lock().await = username.to_string();
        *self.password.lock().await = password.to_string();
        *self.app_handle.lock().await = Some(app_handle.clone());

        self.do_connect(&app_handle).await
    }

    async fn do_connect(&self, app_handle: &tauri::AppHandle) -> Result<(), String> {
        let server_url = self.server_url.lock().await.clone();
        let username = self.username.lock().await.clone();
        let password = self.password.lock().await.clone();

        // Clean up old connection
        {
            let mut inner = self.inner.lock().await;
            if let Some(mut ws) = inner.take() {
                // Fail all pending RPCs
                let mut pending = ws.pending.lock().await;
                for (_, tx) in pending.drain() {
                    let _ = tx.send(Err(RpcError { code: -1, message: "Connection closed".to_string(), data: None }));
                }
            }
        }

        // Emit connecting status
        let _ = app_handle.emit("connection-status", serde_json::json!({"status": "connecting"}));

        let ws_url = build_ws_url(&server_url);
        log::info!("Connecting to WebSocket: {ws_url}");

        let mut request = ws_url.into_client_request().map_err(|e| format!("Request error: {e}"))?;
        if !username.is_empty() {
            use base64::Engine;
            let credentials = base64::engine::general_purpose::STANDARD.encode(format!("{username}:{password}"));
            let headers = request.headers_mut();
            headers.insert("Authorization", format!("Basic {credentials}").parse().unwrap());
            headers.insert("x-ava-client", "mobile-v2".parse().unwrap());
        }

        let (ws_stream, _) = connect_async(request)
            .await
            .map_err(|e| format!("WebSocket connect failed: {e}"))?;

        let (write, mut read) = ws_stream.split();
        let pending: Arc<Mutex<PendingMap>> = Arc::new(Mutex::new(HashMap::new()));
        let pending_clone = pending.clone();
        let app_handle_clone = app_handle.clone();
        let self_arc = Arc::new(WsState {
            inner: Mutex::new(None),
            rpc_counter: AtomicU64::new(self.rpc_counter.load(Ordering::SeqCst)),
            server_url: Mutex::new(server_url.clone()),
            username: Mutex::new(username.clone()),
            password: Mutex::new(password.clone()),
            app_handle: Mutex::new(Some(app_handle.clone())),
            reconnecting: AtomicBool::new(false),
        });

        // Spawn reader task — detects disconnection
        let app_for_reader = app_handle.clone();
        tokio::spawn(async move {
            while let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(resp) = serde_json::from_str::<RpcResponse>(&text) {
                            if let Some(id) = resp.id {
                                let mut map = pending_clone.lock().await;
                                if let Some(tx) = map.remove(&id) {
                                    if let Some(err) = resp.error {
                                        let _ = tx.send(Err(err));
                                    } else {
                                        let _ = tx.send(Ok(resp.result.unwrap_or(Value::Null)));
                                    }
                                    continue;
                                }
                            }
                            if let Some(method) = &resp.method {
                                let payload = serde_json::json!({
                                    "method": method,
                                    "params": resp.params,
                                });
                                let _ = app_for_reader.emit("rpc-notification", payload);
                            }
                        }
                    }
                    Ok(Message::Close(_)) => break,
                    Err(e) => {
                        log::warn!("WebSocket error: {e}");
                        break;
                    }
                    _ => {}
                }
            }

            // Connection lost — fail pending RPCs and emit disconnected status
            log::warn!("WebSocket connection lost");
            let mut map = pending_clone.lock().await;
            for (_, tx) in map.drain() {
                let _ = tx.send(Err(RpcError { code: -1, message: "Connection lost".to_string(), data: None }));
            }
            let _ = app_for_reader.emit("connection-status", serde_json::json!({"status": "disconnected"}));
        });

        // Send initialize handshake
        let id = self.rpc_counter.fetch_add(1, Ordering::SeqCst);
        let init_msg = serde_json::to_string(&RpcRequest {
            id,
            method: "initialize".to_string(),
            params: serde_json::json!({
                "clientInfo": { "name": "ava-mobile-v2", "version": "0.1.0", "client": "mobile-v2" },
                "capabilities": {}
            }),
        })
        .map_err(|e| format!("Serialize error: {e}"))?;

        let (tx, rx) = oneshot::channel();
        pending.lock().await.insert(id, tx);

        let mut ws_inner = WsInner {
            write_tx: write,
            pending: pending.clone(),
        };

        ws_inner.write_tx.send(Message::Text(init_msg.into())).await
            .map_err(|e| format!("Send error: {e}"))?;

        let result = tokio::time::timeout(std::time::Duration::from_secs(8), rx)
            .await
            .map_err(|_| "Initialize timed out".to_string())?
            .map_err(|_| "Initialize channel error".to_string())?;

        result.map_err(|e| format!("Initialize failed: {e}"))?;

        let mut state = self.inner.lock().await;
        *state = Some(ws_inner);

        // Emit connected status
        let _ = app_handle.emit("connection-status", serde_json::json!({"status": "connected"}));
        log::info!("WebSocket connected successfully");

        Ok(())
    }

    pub async fn send_rpc(&self, method: &str, params: Value) -> Result<Value, String> {
        let mut inner = self.inner.lock().await;
        let inner = inner.as_mut().ok_or("Not connected")?;

        let id = self.rpc_counter.fetch_add(1, Ordering::SeqCst);
        let msg = serde_json::to_string(&RpcRequest {
            id,
            method: method.to_string(),
            params,
        })
        .map_err(|e| format!("Serialize error: {e}"))?;

        let (tx, rx) = oneshot::channel();
        inner.pending.lock().await.insert(id, tx);

        inner.write_tx.send(Message::Text(msg.into())).await
            .map_err(|e| format!("Send error: {e}"))?;

        let result = tokio::time::timeout(std::time::Duration::from_secs(45), rx)
            .await
            .map_err(|_| format!("RPC {method} timed out"))?
            .map_err(|_| "Connection lost".to_string())?;

        result.map_err(|e| format!("{e}"))
    }

    pub async fn disconnect(&self) {
        let mut inner = self.inner.lock().await;
        if let Some(mut ws) = inner.take() {
            // Fail all pending RPCs
            let mut pending = ws.pending.lock().await;
            for (_, tx) in pending.drain() {
                let _ = tx.send(Err(RpcError { code: -1, message: "Disconnected".to_string(), data: None }));
            }
            let _ = ws.write_tx.send(Message::Close(None)).await;
        }
        if let Some(app) = self.app_handle.lock().await.as_ref() {
            let _ = app.emit("connection-status", serde_json::json!({"status": "disconnected"}));
        }
    }

    pub async fn is_connected(&self) -> bool {
        self.inner.lock().await.is_some()
    }

    pub async fn try_reconnect(&self) -> bool {
        if self.reconnecting.load(Ordering::SeqCst) {
            return false;
        }
        self.reconnecting.store(true, Ordering::SeqCst);

        let app = self.app_handle.lock().await.clone();
        if let Some(app) = app {
            let _ = app.emit("connection-status", serde_json::json!({"status": "reconnecting"}));
            let result = self.do_connect(&app).await;
            self.reconnecting.store(false, Ordering::SeqCst);
            result.is_ok()
        } else {
            self.reconnecting.store(false, Ordering::SeqCst);
            false
        }
    }
}

fn build_ws_url(base_url: &str) -> String {
    let mut url = base_url.trim().trim_end_matches('/').to_string();
    if url.ends_with("/api") {
        url.truncate(url.len() - 4);
    }
    url = url.trim_end_matches('/').to_string();

    if url.starts_with("https://") {
        format!("wss://{}/ws?client=mobile-v2", &url[8..])
    } else if url.starts_with("http://") {
        format!("ws://{}/ws?client=mobile-v2", &url[7..])
    } else if url.starts_with("wss://") || url.starts_with("ws://") {
        if url.ends_with("/ws") { format!("{url}?client=mobile-v2") } else { format!("{url}/ws?client=mobile-v2") }
    } else {
        format!("wss://{url}/ws?client=mobile-v2")
    }
}
