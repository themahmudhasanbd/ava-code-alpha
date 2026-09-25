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
    let ava_code = workspace_dir.join(".ava-code").join("memory");
    if ava_code.exists() {
        return ava_code.join("memory.db");
    }
    let dot_ava = workspace_dir.join(".ava").join("memory");
    if dot_ava.exists() {
        return dot_ava.join("memory.db");
    }
    ava_code.join("memory.db")
}

pub fn resolve_project_session_memory_db(workspace_dir: &Path) -> PathBuf {
    let ava_code = workspace_dir.join(".ava-code").join("memory");
    if ava_code.exists() {
        return ava_code.join("session-memory.db");
    }
    let dot_ava = workspace_dir.join(".ava").join("memory");
    if dot_ava.exists() {
        return dot_ava.join("session-memory.db");
    }
    ava_code.join("session-memory.db")
}

pub fn resolve_global_memory_db() -> PathBuf {
    if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
        let p = PathBuf::from(xdg);
        let ava_code = p.join("ava-code").join("global.db");
        if ava_code.exists() {
            return ava_code;
        }
        let ava = p.join("ava").join("global.db");
        if ava.exists() {
            return ava;
        }
        ava_code
    } else if let Ok(home) = std::env::var("HOME") {
        let p = PathBuf::from(home).join(".local").join("share");
        let ava_code = p.join("ava-code").join("global.db");
        if ava_code.exists() {
            return ava_code;
        }
        let ava = p.join("ava").join("global.db");
        if ava.exists() {
            return ava;
        }
        ava_code
    } else {
        let ava_code = PathBuf::from("/root/.local/share/ava-code/global.db");
        if ava_code.exists() {
            return ava_code;
        }
        let ava = PathBuf::from("/root/.local/share/ava/global.db");
        if ava.exists() {
            return ava;
        }
        ava_code
    }
}

pub fn resolve_global_session_memory_db() -> PathBuf {
    if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
        let p = PathBuf::from(xdg);
        let ava_code = p.join("ava-code").join("session-memory-global.db");
        if ava_code.exists() {
            return ava_code;
        }
        let ava = p.join("ava").join("session-memory-global.db");
        if ava.exists() {
            return ava;
        }
        ava_code
    } else if let Ok(home) = std::env::var("HOME") {
        let p = PathBuf::from(home).join(".local").join("share");
        let ava_code = p.join("ava-code").join("session-memory-global.db");
        if ava_code.exists() {
            return ava_code;
        }
        let ava = p.join("ava").join("session-memory-global.db");
        if ava.exists() {
            return ava;
        }
        ava_code
    } else {
        let ava_code = PathBuf::from("/root/.local/share/ava-code/session-memory-global.db");
        if ava_code.exists() {
            return ava_code;
        }
        let ava = PathBuf::from("/root/.local/share/ava/session-memory-global.db");
        if ava.exists() {
            return ava;
        }
        ava_code
    }
}
