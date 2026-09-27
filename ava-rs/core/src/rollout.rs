use crate::config::Config;
pub use ava_rollout::ARCHIVED_SESSIONS_SUBDIR;
pub use ava_rollout::Cursor;
pub use ava_rollout::INTERACTIVE_SESSION_SOURCES;
pub use ava_rollout::RolloutRecorder;
pub use ava_rollout::RolloutRecorderParams;
pub use ava_rollout::SESSIONS_SUBDIR;
pub use ava_rollout::SessionMeta;
pub use ava_rollout::SortDirection;
pub use ava_rollout::ThreadItem;
pub use ava_rollout::ThreadSortKey;
pub use ava_rollout::ThreadsPage;
pub use ava_rollout::append_thread_name;
pub use ava_rollout::find_archived_thread_path_by_id_str;
#[deprecated(note = "use find_thread_path_by_id_str")]
pub use ava_rollout::find_conversation_path_by_id_str;
pub use ava_rollout::find_thread_meta_by_name_str;
pub use ava_rollout::find_thread_name_by_id;
pub use ava_rollout::find_thread_names_by_ids;
pub use ava_rollout::find_thread_path_by_id_str;
pub use ava_rollout::parse_cursor;
pub use ava_rollout::read_head_for_summary;
pub use ava_rollout::read_session_meta_line;
pub use ava_rollout::rollout_date_parts;

impl ava_rollout::RolloutConfigView for Config {
    fn ava_home(&self) -> &std::path::Path {
        self.ava_home.as_path()
    }

    fn sqlite_config(&self) -> &ava_state::SqliteConfig {
        self.sqlite_config()
    }

    fn cwd(&self) -> &std::path::Path {
        self.cwd.as_path()
    }

    fn model_provider_id(&self) -> &str {
        self.model_provider_id.as_str()
    }

    fn generate_memories(&self) -> bool {
        self.memories.generate_memories
    }
}

pub(crate) mod list {
    pub use ava_rollout::find_thread_path_by_id_str;
}

#[cfg(test)]
pub(crate) mod recorder {
    pub use ava_rollout::RolloutRecorder;
}

pub(crate) use crate::session_rollout_init_error::map_session_init_error;

pub(crate) mod truncation {
    pub(crate) use crate::thread_rollout_truncation::*;
}
