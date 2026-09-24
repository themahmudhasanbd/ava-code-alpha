use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::ws::WsState;

#[derive(Deserialize)]
pub struct ConnectArgs {
    #[serde(rename = "serverUrl")]
    pub server_url: String,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[tauri::command]
pub async fn connect(args: ConnectArgs, state: State<'_, WsState>, app_handle: tauri::AppHandle) -> Result<String, String> {
    let username = args.username.unwrap_or_default();
    let password = args.password.unwrap_or_default();
    state.connect(&args.server_url, &username, &password, app_handle).await?;
    Ok("connected".to_string())
}

#[tauri::command]
pub async fn disconnect(state: State<'_, WsState>) -> Result<(), String> {
    state.disconnect().await;
    Ok(())
}

#[tauri::command]
pub async fn health_check(state: State<'_, WsState>) -> Result<bool, String> {
    Ok(state.is_connected().await)
}

#[tauri::command]
pub async fn send_rpc(method: String, params: Value, state: State<'_, WsState>) -> Result<Value, String> {
    state.send_rpc(&method, params).await
}

#[tauri::command]
pub async fn reconnect(state: State<'_, WsState>) -> Result<bool, String> {
    Ok(state.try_reconnect().await)
}
