pub mod evidence;
pub mod models;
pub mod persistent_store;
pub mod session_store;

use std::path::Path;
use std::path::PathBuf;

pub use evidence::infer_evidence_provenance;
pub use models::MemoryRecord;
pub use models::MemoryStats;
pub use models::SessionMemoryRecord;
pub use persistent_store::PersistentMemoryStore;
pub use session_store::SessionMemoryStore;

pub fn resolve_project_memory_db(workspace_dir: &Path) -> PathBuf {
    workspace_dir.join(".ava-code").join("memory").join("memory.db")
}

pub fn resolve_project_session_memory_db(workspace_dir: &Path) -> PathBuf {
    workspace_dir
        .join(".ava-code")
        .join("memory")
        .join("session-memory.db")
}

pub fn resolve_global_memory_db() -> PathBuf {
    if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
        PathBuf::from(xdg).join("ava-code").join("global.db")
    } else if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home)
            .join(".local")
            .join("share")
            .join("ava-code")
            .join("global.db")
    } else {
        PathBuf::from("/root/.local/share/ava-code/global.db")
    }
}

pub fn resolve_global_session_memory_db() -> PathBuf {
    if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
        PathBuf::from(xdg).join("ava-code").join("session-memory-global.db")
    } else if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home)
            .join(".local")
            .join("share")
            .join("ava-code")
            .join("session-memory-global.db")
    } else {
        PathBuf::from("/root/.local/share/ava-code/session-memory-global.db")
    }
}
