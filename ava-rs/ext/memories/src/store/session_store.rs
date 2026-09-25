use std::path::Path;
use std::sync::Arc;

use sqlx::QueryBuilder;
use sqlx::Row;
use sqlx::Sqlite;
use sqlx::SqlitePool;
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::sqlite::SqliteJournalMode;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::sqlite::SqliteSynchronous;

use super::models::SessionMemoryRecord;

#[derive(Clone)]
pub struct SessionMemoryStore {
    pool: Arc<SqlitePool>,
}

impl SessionMemoryStore {
    pub async fn open(db_path: &Path) -> Result<Self, sqlx::Error> {
        if let Some(parent) = db_path.parent() {
            tokio::fs::create_dir_all(parent).await.ok();
        }

        let options = SqliteConnectOptions::new()
            .filename(db_path)
            .create_if_missing(true)
            .journal_mode(SqliteJournalMode::Wal)
            .synchronous(SqliteSynchronous::Normal)
            .busy_timeout(std::time::Duration::from_secs(5));

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await?;

        let store = Self {
            pool: Arc::new(pool),
        };
        store.init_schema().await?;
        Ok(store)
    }

    async fn init_schema(&self) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS session_memories (
                id            TEXT PRIMARY KEY,
                session_id    TEXT NOT NULL,
                message_id    TEXT NOT NULL,
                content       TEXT NOT NULL,
                message_type  TEXT NOT NULL,
                created_at    TEXT NOT NULL
            );
            "#,
        )
        .execute(&*self.pool)
        .await?;

        let _ = sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_session_memories_session ON session_memories(session_id, created_at DESC)",
        )
        .execute(&*self.pool)
        .await;

        sqlx::query(
            r#"
            CREATE VIRTUAL TABLE IF NOT EXISTS session_memories_fts USING fts5(
                content, message_type, session_id, content='session_memories', content_rowid='rowid'
            );
            "#,
        )
        .execute(&*self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TRIGGER IF NOT EXISTS session_memories_ai AFTER INSERT ON session_memories BEGIN
                INSERT INTO session_memories_fts(rowid, content, message_type, session_id)
                VALUES (new.rowid, new.content, new.message_type, new.session_id);
            END;
            "#,
        )
        .execute(&*self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TRIGGER IF NOT EXISTS session_memories_ad AFTER DELETE ON session_memories BEGIN
                INSERT INTO session_memories_fts(session_memories_fts, rowid, content, message_type, session_id)
                VALUES('delete', old.rowid, old.content, old.message_type, old.session_id);
            END;
            "#,
        )
        .execute(&*self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TRIGGER IF NOT EXISTS session_memories_au AFTER UPDATE ON session_memories BEGIN
                INSERT INTO session_memories_fts(session_memories_fts, rowid, content, message_type, session_id)
                VALUES('delete', old.rowid, old.content, old.message_type, old.session_id);
                INSERT INTO session_memories_fts(rowid, content, message_type, session_id)
                VALUES (new.rowid, new.content, new.message_type, new.session_id);
            END;
            "#,
        )
        .execute(&*self.pool)
        .await?;

        Ok(())
    }

    pub async fn insert(&self, record: &SessionMemoryRecord) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT OR REPLACE INTO session_memories (
                id, session_id, message_id, content, message_type, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&record.id)
        .bind(&record.session_id)
        .bind(&record.message_id)
        .bind(&record.content)
        .bind(&record.message_type)
        .bind(&record.created_at)
        .execute(&*self.pool)
        .await?;

        Ok(())
    }

    pub async fn get(&self, id: &str) -> Result<Option<SessionMemoryRecord>, sqlx::Error> {
        let row = sqlx::query("SELECT * FROM session_memories WHERE id = ?")
            .bind(id)
            .fetch_optional(&*self.pool)
            .await?;

        Ok(row.as_ref().map(Self::row_to_record))
    }

    pub async fn search(
        &self,
        query_str: &str,
        session_id: Option<&str>,
        limit: usize,
    ) -> Result<Vec<SessionMemoryRecord>, sqlx::Error> {
        let words: Vec<&str> = query_str
            .split_whitespace()
            .filter(|w| w.len() > 1)
            .collect();

        if words.is_empty() {
            return Ok(Vec::new());
        }

        let clean_query = words
            .iter()
            .map(|w| format!("\"{}\"", w.replace('"', "\"\"")))
            .collect::<Vec<_>>()
            .join(" OR ");

        let mut builder = QueryBuilder::<Sqlite>::new(
            r#"
            SELECT m.*, rank
            FROM session_memories m
            JOIN session_memories_fts f ON m.rowid = f.rowid
            WHERE session_memories_fts MATCH "#,
        );
        builder.push_bind(clean_query);

        if let Some(sid) = session_id {
            builder.push(" AND m.session_id = ");
            builder.push_bind(sid);
        }

        builder.push(" ORDER BY rank LIMIT ");
        builder.push_bind(limit as i64);

        let rows = builder.build().fetch_all(&*self.pool).await?;
        if !rows.is_empty() {
            return Ok(rows.iter().map(Self::row_to_record).collect());
        }

        // Fallback LIKE matching
        let mut like_builder =
            QueryBuilder::<Sqlite>::new("SELECT * FROM session_memories WHERE (");
        for (i, w) in words.iter().enumerate() {
            if i > 0 {
                like_builder.push(" OR ");
            }
            like_builder.push("content LIKE ");
            like_builder.push_bind(format!("%{w}%"));
        }
        like_builder.push(")");

        if let Some(sid) = session_id {
            like_builder.push(" AND session_id = ");
            like_builder.push_bind(sid);
        }
        like_builder.push(" ORDER BY created_at DESC LIMIT ");
        like_builder.push_bind(limit as i64);

        let fallback_rows = like_builder
            .build()
            .fetch_all(&*self.pool)
            .await
            .unwrap_or_default();
        Ok(fallback_rows.iter().map(Self::row_to_record).collect())
    }

    pub async fn list_recent(
        &self,
        session_id: Option<&str>,
        limit: usize,
    ) -> Result<Vec<SessionMemoryRecord>, sqlx::Error> {
        let mut builder = QueryBuilder::<Sqlite>::new("SELECT * FROM session_memories");
        if let Some(sid) = session_id {
            builder.push(" WHERE session_id = ");
            builder.push_bind(sid);
        }
        builder.push(" ORDER BY created_at DESC LIMIT ");
        builder.push_bind(limit as i64);

        let rows = builder.build().fetch_all(&*self.pool).await?;
        Ok(rows.iter().map(Self::row_to_record).collect())
    }

    pub async fn delete(&self, id: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM session_memories WHERE id = ?")
            .bind(id)
            .execute(&*self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn count(&self, session_id: Option<&str>) -> Result<usize, sqlx::Error> {
        let mut builder =
            QueryBuilder::<Sqlite>::new("SELECT COUNT(*) as count FROM session_memories");
        if let Some(sid) = session_id {
            builder.push(" WHERE session_id = ");
            builder.push_bind(sid);
        }

        let row = builder.build().fetch_one(&*self.pool).await?;
        let count: i64 = row.try_get("count").unwrap_or(0);
        Ok(count as usize)
    }

    pub async fn clear(&self) -> Result<(), sqlx::Error> {
        let _ = sqlx::query("DROP TRIGGER IF EXISTS session_memories_ai")
            .execute(&*self.pool)
            .await;
        let _ = sqlx::query("DROP TRIGGER IF EXISTS session_memories_ad")
            .execute(&*self.pool)
            .await;
        let _ = sqlx::query("DROP TRIGGER IF EXISTS session_memories_au")
            .execute(&*self.pool)
            .await;
        let _ = sqlx::query("DELETE FROM session_memories_fts")
            .execute(&*self.pool)
            .await;
        let _ = sqlx::query("DELETE FROM session_memories")
            .execute(&*self.pool)
            .await;
        self.init_schema().await?;
        Ok(())
    }

    fn row_to_record(row: &sqlx::sqlite::SqliteRow) -> SessionMemoryRecord {
        let id: String = row.try_get("id").unwrap_or_default();
        let session_id: String = row.try_get("session_id").unwrap_or_default();
        let message_id: String = row.try_get("message_id").unwrap_or_default();
        let content: String = row.try_get("content").unwrap_or_default();
        let message_type: String = row
            .try_get("message_type")
            .unwrap_or_else(|_| "user".to_string());
        let created_at: String = row.try_get("created_at").unwrap_or_default();

        SessionMemoryRecord {
            id,
            session_id,
            message_id,
            content,
            message_type,
            created_at,
        }
    }
}
