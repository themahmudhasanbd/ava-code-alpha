use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use futures::sink::SinkExt;
use futures::stream::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tokio::net::TcpStream;
use tokio::process::{Child, Command};
use tokio::sync::{Mutex, RwLock, oneshot};
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsoleLog {
    pub text: String,
    pub message_type: String,
    pub url: Option<String>,
    pub line: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CdpRequest {
    pub id: u64,
    pub method: String,
    pub params: Value,
    #[serde(rename = "sessionId", skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CdpResponse {
    pub id: Option<u64>,
    pub result: Option<Value>,
    pub error: Option<CdpError>,
    pub method: Option<String>,
    pub params: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CdpError {
    pub code: i64,
    pub message: String,
    pub data: Option<String>,
}

pub struct ChromeProcess {
    pub child: Child,
    pub user_data_dir: PathBuf,
    pub ws_url: String,
}

impl ChromeProcess {
    pub async fn launch(custom_bin: Option<&str>, headless: bool) -> Result<Self, String> {
        let user_data_dir =
            std::env::temp_dir().join(format!("ava_chrome_profile_{}", uuid::Uuid::new_v4()));
        let _ = tokio::fs::create_dir_all(&user_data_dir).await;

        let chrome_bin = if let Some(path) = custom_bin {
            path.to_string()
        } else {
            find_chrome_binary()?
        };

        let mut cmd = Command::new(&chrome_bin);
        cmd.arg("--remote-debugging-port=0")
            .arg(format!("--user-data-dir={}", user_data_dir.display()))
            .arg("--no-first-run")
            .arg("--no-default-browser-check")
            .arg("--disable-background-networking")
            .arg("--disable-background-timer-throttling")
            .arg("--disable-backgrounding-occluded-windows")
            .arg("--disable-breakpad")
            .arg("--disable-component-update")
            .arg("--disable-domain-reliability")
            .arg("--disable-extensions")
            .arg("--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process")
            .arg("--disable-ipc-flooding-protection")
            .arg("--disable-popup-blocking")
            .arg("--disable-prompt-on-repost")
            .arg("--disable-renderer-backgrounding")
            .arg("--disable-sync")
            .arg("--force-color-profile=srgb")
            .arg("--metrics-recording-only")
            .arg("--no-sandbox")
            .arg("--disable-setuid-sandbox")
            .arg("--disable-dev-shm-usage")
            .arg("--disable-gpu")
            .arg("--window-size=1920,1080")
            .arg("about:blank");

        if headless {
            cmd.arg("--headless=new");
        }

        cmd.stderr(std::process::Stdio::piped());
        cmd.stdout(std::process::Stdio::null());

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn Chrome process ({chrome_bin}): {e}"))?;

        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| "Failed to capture Chrome stderr for WS discovery".to_string())?;

        let ws_url = extract_ws_url(stderr).await?;

        Ok(Self {
            child,
            user_data_dir,
            ws_url,
        })
    }
}

impl Drop for ChromeProcess {
    fn drop(&mut self) {
        let _ = self.child.start_kill();
        let dir = self.user_data_dir.clone();
        tokio::spawn(async move {
            let _ = tokio::fs::remove_dir_all(&dir).await;
        });
    }
}

type WsSink = futures::stream::SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>;

pub struct CdpClient {
    next_id: AtomicU64,
    sink: Mutex<WsSink>,
    pending: Mutex<HashMap<u64, oneshot::Sender<Result<Value, String>>>>,
    session_id: RwLock<Option<String>>,
    console_logs: Arc<Mutex<Vec<ConsoleLog>>>,
}

impl CdpClient {
    pub async fn connect(ws_url: &str) -> Result<Arc<Self>, String> {
        let (ws_stream, _) = tokio_tungstenite::connect_async(ws_url)
            .await
            .map_err(|e| format!("Failed to connect CDP WebSocket at {ws_url}: {e}"))?;

        let (sink, mut stream) = ws_stream.split();
        let pending = Mutex::new(HashMap::new());
        let console_logs = Arc::new(Mutex::new(Vec::new()));

        let client = Arc::new(Self {
            next_id: AtomicU64::new(1),
            sink: Mutex::new(sink),
            pending,
            session_id: RwLock::new(None),
            console_logs: console_logs.clone(),
        });

        // Background reader loop
        let client_clone = client.clone();
        let console_logs_clone = console_logs.clone();
        tokio::spawn(async move {
            while let Some(msg) = stream.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        let text_str = text.as_str();
                        if let Ok(resp) = serde_json::from_str::<CdpResponse>(text_str) {
                            if let Some(id) = resp.id {
                                let mut map = client_clone.pending.lock().await;
                                if let Some(tx) = map.remove(&id) {
                                    if let Some(err) = resp.error {
                                        let _ = tx.send(Err(format!(
                                            "CDP Error {}: {}",
                                            err.code, err.message
                                        )));
                                    } else {
                                        let _ = tx.send(Ok(resp.result.unwrap_or(Value::Null)));
                                    }
                                }
                            } else if let Some(method) = resp.method {
                                if method == "Runtime.consoleAPICalled" {
                                    if let Some(params) = resp.params {
                                        let type_str = params
                                            .get("type")
                                            .and_then(Value::as_str)
                                            .unwrap_or("log");
                                        let args = params.get("args").and_then(Value::as_array);
                                        let text = args
                                            .map(|arr| {
                                                arr.iter()
                                                    .filter_map(|a| {
                                                        a.get("value").and_then(Value::as_str)
                                                    })
                                                    .collect::<Vec<_>>()
                                                    .join(" ")
                                            })
                                            .unwrap_or_default();

                                        let mut cl = console_logs_clone.lock().await;
                                        cl.push(ConsoleLog {
                                            text,
                                            message_type: type_str.to_string(),
                                            url: None,
                                            line: None,
                                        });
                                    }
                                } else if method == "Runtime.exceptionThrown" {
                                    if let Some(params) = resp.params {
                                        if let Some(details) = params.get("exceptionDetails") {
                                            let text = details
                                                .get("text")
                                                .and_then(Value::as_str)
                                                .unwrap_or("Uncaught exception")
                                                .to_string();
                                            let url = details
                                                .get("url")
                                                .and_then(Value::as_str)
                                                .map(ToString::to_string);
                                            let line =
                                                details.get("lineNumber").and_then(Value::as_u64);

                                            let mut cl = console_logs_clone.lock().await;
                                            cl.push(ConsoleLog {
                                                text,
                                                message_type: "error".to_string(),
                                                url,
                                                line,
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Ok(Message::Close(_)) => break,
                    Err(_) => break,
                    _ => {}
                }
            }
        });

        // Initialize target page and enable domains
        client.init_target_page().await?;

        Ok(client)
    }

    async fn init_target_page(&self) -> Result<(), String> {
        let targets_val = self.call_browser("Target.getTargets", None).await?;
        let targets = targets_val
            .get("targetInfos")
            .and_then(Value::as_array)
            .ok_or_else(|| "No targetInfos found".to_string())?;

        let page_target = targets
            .iter()
            .find(|t| t.get("type").and_then(Value::as_str) == Some("page"))
            .ok_or_else(|| "No page target available in Chrome".to_string())?;

        let target_id = page_target
            .get("targetId")
            .and_then(Value::as_str)
            .ok_or_else(|| "Missing targetId".to_string())?;

        let attach_res = self
            .call_browser(
                "Target.attachToTarget",
                Some(json!({
                    "targetId": target_id,
                    "flatten": true
                })),
            )
            .await?;

        let session_id = attach_res
            .get("sessionId")
            .and_then(Value::as_str)
            .ok_or_else(|| "Missing sessionId".to_string())?;
        {
            let mut s = self.session_id.write().await;
            *s = Some(session_id.to_string());
        }

        self.call("Page.enable", None).await?;
        self.call("Runtime.enable", None).await?;
        self.call("DOM.enable", None).await?;
        self.call("CSS.enable", None).await?;
        self.call("Network.enable", None).await?;

        Ok(())
    }

    pub async fn call(&self, method: &str, params: Option<Value>) -> Result<Value, String> {
        let sid = {
            let s = self.session_id.read().await;
            s.clone()
        };
        self.call_internal(method, params.unwrap_or_else(|| json!({})), sid)
            .await
    }

    pub async fn call_browser(&self, method: &str, params: Option<Value>) -> Result<Value, String> {
        self.call_internal(method, params.unwrap_or_else(|| json!({})), None)
            .await
    }

    async fn call_internal(
        &self,
        method: &str,
        params: Value,
        session_id: Option<String>,
    ) -> Result<Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let req = CdpRequest {
            id,
            method: method.to_string(),
            params,
            session_id,
        };

        let req_json = serde_json::to_string(&req).map_err(|e| e.to_string())?;

        let (tx, rx) = oneshot::channel();
        {
            let mut map = self.pending.lock().await;
            map.insert(id, tx);
        }

        {
            let mut sink = self.sink.lock().await;
            sink.send(Message::Text(req_json.into()))
                .await
                .map_err(|e| format!("Failed to send CDP message: {e}"))?;
        }

        tokio::select! {
            res = rx => {
                match res {
                    Ok(val) => val,
                    Err(_) => Err("CDP request channel cancelled".to_string()),
                }
            }
            _ = tokio::time::sleep(Duration::from_secs(30)) => {
                let mut map = self.pending.lock().await;
                map.remove(&id);
                Err(format!("CDP command '{method}' timed out after 30s"))
            }
        }
    }

    pub async fn get_console_logs(&self) -> Vec<ConsoleLog> {
        let logs = self.console_logs.lock().await;
        logs.clone()
    }

    pub async fn clear_console_logs(&self) {
        let mut logs = self.console_logs.lock().await;
        logs.clear();
    }
}

fn find_chrome_binary() -> Result<String, String> {
    let candidates = [
        "google-chrome",
        "google-chrome-stable",
        "chromium",
        "chromium-browser",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ];

    for c in candidates {
        if let Ok(output) = std::process::Command::new(c).arg("--version").output() {
            if output.status.success() {
                return Ok(c.to_string());
            }
        }
    }

    Err("No Chrome or Chromium binary found on system. Please install google-chrome-stable or chromium.".to_string())
}

async fn extract_ws_url(stderr: tokio::process::ChildStderr) -> Result<String, String> {
    use tokio::io::{AsyncBufReadExt, BufReader};

    let mut reader = BufReader::new(stderr).lines();
    let start_time = std::time::Instant::now();

    while let Ok(line_res) = tokio::time::timeout(Duration::from_secs(10), reader.next_line()).await
    {
        let line = match line_res {
            Ok(Some(l)) => l,
            _ => break,
        };

        if line.contains("DevTools listening on ws://") {
            if let Some(idx) = line.find("ws://") {
                let ws_url = line[idx..].trim().to_string();
                return Ok(ws_url);
            }
        }

        if start_time.elapsed() > Duration::from_secs(10) {
            break;
        }
    }

    Err("Timed out waiting for Chrome DevTools WebSocket endpoint on stderr".to_string())
}
