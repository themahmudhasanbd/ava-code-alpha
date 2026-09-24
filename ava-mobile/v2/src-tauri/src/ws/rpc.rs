use serde::{Deserialize, Serialize};
use serde_json::Value;

/// JSON-RPC request (no "jsonrpc": "2.0" on wire per AvA protocol)
#[derive(Debug, Serialize)]
pub struct RpcRequest {
    pub id: u64,
    pub method: String,
    pub params: Value,
}

/// JSON-RPC response
#[derive(Debug, Deserialize)]
pub struct RpcResponse {
    pub id: Option<u64>,
    pub result: Option<Value>,
    pub error: Option<RpcError>,
    /// Server notification (no id)
    pub method: Option<String>,
    pub params: Option<Value>,
}

#[derive(Debug, Deserialize)]
pub struct RpcError {
    pub code: i64,
    pub message: String,
    pub data: Option<Value>,
}

impl std::fmt::Display for RpcError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "RPC error {}: {}", self.code, self.message)
    }
}
