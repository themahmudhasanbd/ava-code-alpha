mod ws;
mod commands;

use commands::{connect, disconnect, health_check, send_rpc, reconnect};
use ws::WsState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .manage(WsState::new())
        .invoke_handler(tauri::generate_handler![connect, disconnect, health_check, send_rpc, reconnect])
        .run(tauri::generate_context!())
        .expect("error while running AvA Mobile");
}
