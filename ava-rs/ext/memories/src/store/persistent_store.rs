use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

use chrono::Utc;
use sqlx::QueryBuilder;
use sqlx::Row;
use sqlx::Sqlite;
use sqlx::SqlitePool;
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::sqlite::SqliteJournalMode;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::sqlite::SqliteSynchronous;

use super::models::MemoryRecord;
use super::models::MemoryStats;

#[derive(Clone)]
pub struct PersistentMemoryStore {
    pool: Arc<SqlitePool>,
}

impl PersistentMemoryStore {
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
            CREATE TABLE IF NOT EXISTS memories (
                id            TEXT PRIMARY KEY,
                scope         TEXT NOT NULL,
                domain        TEXT NOT NULL,
                category      TEXT DEFAULT 'general',
                tags          TEXT NOT NULL,
                content       TEXT NOT NULL,
                evidence      TEXT,
                evidence_source TEXT,
                verified      INTEGER DEFAULT 0,
                source_session TEXT,
                confidence    REAL NOT NULL,
                importance    TEXT NOT NULL,
                related_files TEXT,
                created_at    TEXT NOT NULL,
                last_used_at  TEXT,
                last_verified_at TEXT,
                use_count     INTEGER DEFAULT 0,
                status        TEXT DEFAULT 'active',
                superseded_by TEXT,
                supersedes    TEXT
            );
            "#,
        )
        .execute(&*self.pool)
        .await?;

        for alter in [
            "ALTER TABLE memories ADD COLUMN category TEXT DEFAULT 'general'",
            "ALTER TABLE memories ADD COLUMN superseded_by TEXT",
            "ALTER TABLE memories ADD COLUMN supersedes TEXT",
            "ALTER TABLE memories ADD COLUMN evidence_source TEXT",
            "ALTER TABLE memories ADD COLUMN verified INTEGER DEFAULT 0",
            "ALTER TABLE memories ADD COLUMN last_verified_at TEXT",
        ] {
            let _ = QueryBuilder::<Sqlite>::new(alter)
                .build()
                .execute(&*self.pool)
                .await;
        }

        sqlx::query(
            r#"
            CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
                content, tags, domain, content='memories', content_rowid='rowid'
            );
            "#,
        )
        .execute(&*self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
                INSERT INTO memories_fts(rowid, content, tags, domain)
                VALUES (new.rowid, new.content, new.tags, new.domain);
            END;
            "#,
        )
        .execute(&*self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
                INSERT INTO memories_fts(memories_fts, rowid, content, tags, domain)
                VALUES('delete', old.rowid, old.content, old.tags, old.domain);
            END;
            "#,
        )
        .execute(&*self.pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
                INSERT INTO memories_fts(memories_fts, rowid, content, tags, domain)
                VALUES('delete', old.rowid, old.content, old.tags, old.domain);
                INSERT INTO memories_fts(rowid, content, tags, domain)
                VALUES (new.rowid, new.content, new.tags, new.domain);
            END;
            "#,
        )
        .execute(&*self.pool)
        .await?;

        Ok(())
    }

    pub async fn insert(&self, record: &MemoryRecord) -> Result<(), sqlx::Error> {
        let tags_json = serde_json::to_string(&record.tags).unwrap_or_else(|_| "[]".to_string());
        let files_json =
            serde_json::to_string(&record.related_files).unwrap_or_else(|_| "[]".to_string());
        let verified_int: i64 = match record.verified {
            Some(true) => 1,
            Some(false) => 0,
            None => 0,
        };

        sqlx::query(
            r#"
            INSERT INTO memories (
                id, scope, domain, category, tags, content, evidence, evidence_source, verified,
                source_session, confidence, importance, related_files, created_at, last_used_at,
                last_verified_at, use_count, status, superseded_by, supersedes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&record.id)
        .bind(&record.scope)
        .bind(&record.domain)
        .bind(record.category.as_deref().unwrap_or("general"))
        .bind(&tags_json)
        .bind(&record.content)
        .bind(record.evidence.as_deref())
        .bind(record.evidence_source.as_deref())
        .bind(verified_int)
        .bind(record.source_session.as_deref())
        .bind(record.confidence)
        .bind(&record.importance)
        .bind(&files_json)
        .bind(&record.created_at)
        .bind(record.last_used_at.as_deref())
        .bind(record.last_verified_at.as_deref())
        .bind(record.use_count)
        .bind(&record.status)
        .bind(record.superseded_by.as_deref())
        .bind(record.supersedes.as_deref())
        .execute(&*self.pool)
        .await?;

        Ok(())
    }

    pub async fn update(
        &self,
        id: &str,
        content: Option<&str>,
        domain: Option<&str>,
        category: Option<&str>,
        importance: Option<&str>,
        evidence: Option<&str>,
        evidence_source: Option<&str>,
        verified: Option<bool>,
        related_files: Option<&[String]>,
        tags: Option<&[String]>,
        status: Option<&str>,
    ) -> Result<bool, sqlx::Error> {
        let mut builder = QueryBuilder::<Sqlite>::new("UPDATE memories SET ");
        let mut first = true;

        if let Some(c) = content {
            if !first {
                builder.push(", ");
            }
            builder.push("content = ");
            builder.push_bind(c);
            first = false;
        }
        if let Some(d) = domain {
            if !first {
                builder.push(", ");
            }
            builder.push("domain = ");
            builder.push_bind(d);
            first = false;
        }
        if let Some(cat) = category {
            if !first {
                builder.push(", ");
            }
            builder.push("category = ");
            builder.push_bind(cat);
            first = false;
        }
        if let Some(imp) = importance {
            if !first {
                builder.push(", ");
            }
            builder.push("importance = ");
            builder.push_bind(imp);
            first = false;
        }
        if let Some(ev) = evidence {
            if !first {
                builder.push(", ");
            }
            builder.push("evidence = ");
            builder.push_bind(ev);
            builder.push(", last_verified_at = ");
            builder.push_bind(Utc::now().to_rfc3339());
            first = false;
        }
        if let Some(es) = evidence_source {
            if !first {
                builder.push(", ");
            }
            builder.push("evidence_source = ");
            builder.push_bind(es);
            first = false;
        }
        if let Some(v) = verified {
            if !first {
                builder.push(", ");
            }
            builder.push("verified = ");
            builder.push_bind(if v { 1i64 } else { 0i64 });
            first = false;
        }
        if let Some(rf) = related_files {
            let rf_json = serde_json::to_string(rf).unwrap_or_default();
            if !first {
                builder.push(", ");
            }
            builder.push("related_files = ");
            builder.push_bind(rf_json);
            first = false;
        }
        if let Some(t) = tags {
            let tags_json = serde_json::to_string(t).unwrap_or_default();
            if !first {
                builder.push(", ");
            }
            builder.push("tags = ");
            builder.push_bind(tags_json);
            first = false;
        }
        if let Some(s) = status {
            if !first {
                builder.push(", ");
            }
            builder.push("status = ");
            builder.push_bind(s);
            first = false;
        }

        if first {
            return Ok(false);
        }

        builder.push(" WHERE id = ");
        builder.push_bind(id);

        let result = builder.build().execute(&*self.pool).await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn get(&self, id: &str) -> Result<Option<MemoryRecord>, sqlx::Error> {
        let row = sqlx::query("SELECT * FROM memories WHERE id = ?")
            .bind(id)
            .fetch_optional(&*self.pool)
            .await?;

        Ok(row.as_ref().map(Self::row_to_record))
    }

    pub async fn search(
        &self,
        query_str: &str,
        domain: Option<&str>,
        category: Option<&str>,
        importance: Option<&str>,
        scope: Option<&str>,
        limit: usize,
    ) -> Result<Vec<MemoryRecord>, sqlx::Error> {
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
            FROM memories m
            JOIN memories_fts f ON m.rowid = f.rowid
            WHERE memories_fts MATCH "#,
        );
        builder.push_bind(clean_query);
        builder.push(" AND m.status = 'active'");

        if let Some(s) = scope {
            builder.push(" AND m.scope = ");
            builder.push_bind(s);
        }
        if let Some(d) = domain {
            builder.push(" AND m.domain = ");
            builder.push_bind(d);
        }
        if let Some(c) = category {
            builder.push(" AND m.category = ");
            builder.push_bind(c);
        }
        if let Some(imp) = importance {
            builder.push(" AND m.importance = ");
            builder.push_bind(imp);
        }

        builder.push(
            r#"
            ORDER BY
              (CASE m.importance WHEN 'critical' THEN 3 WHEN 'high' THEN 2 WHEN 'normal' THEN 1 ELSE 0.5 END) * 1.5
              + (m.use_count * 0.1)
              - rank
            DESC
            LIMIT "#,
        );
        builder.push_bind(limit as i64);

        let rows = builder.build().fetch_all(&*self.pool).await?;
        if !rows.is_empty() {
            return Ok(rows.iter().map(Self::row_to_record).collect());
        }

        // Fallback to LIKE matching
        let mut like_builder =
            QueryBuilder::<Sqlite>::new("SELECT * FROM memories WHERE status = 'active' AND (");
        for (i, w) in words.iter().enumerate() {
            if i > 0 {
                like_builder.push(" OR ");
            }
            like_builder.push("(content LIKE ");
            like_builder.push_bind(format!("%{w}%"));
            like_builder.push(" OR domain LIKE ");
            like_builder.push_bind(format!("%{w}%"));
            like_builder.push(" OR tags LIKE ");
            like_builder.push_bind(format!("%{w}%"));
            like_builder.push(")");
        }
        like_builder.push(")");

        if let Some(s) = scope {
            like_builder.push(" AND scope = ");
            like_builder.push_bind(s);
        }
        if let Some(d) = domain {
            like_builder.push(" AND domain = ");
            like_builder.push_bind(d);
        }
        if let Some(c) = category {
            like_builder.push(" AND category = ");
            like_builder.push_bind(c);
        }
        if let Some(imp) = importance {
            like_builder.push(" AND importance = ");
            like_builder.push_bind(imp);
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

    pub async fn list(
        &self,
        domain: Option<&str>,
        scope: Option<&str>,
        limit: usize,
    ) -> Result<Vec<MemoryRecord>, sqlx::Error> {
        let mut builder =
            QueryBuilder::<Sqlite>::new("SELECT * FROM memories WHERE status = 'active'");
        if let Some(d) = domain {
            builder.push(" AND domain = ");
            builder.push_bind(d);
        }
        if let Some(s) = scope {
            builder.push(" AND scope = ");
            builder.push_bind(s);
        }
        builder.push(" ORDER BY created_at DESC LIMIT ");
        builder.push_bind(limit as i64);

        let rows = builder.build().fetch_all(&*self.pool).await?;
        Ok(rows.iter().map(Self::row_to_record).collect())
    }

    pub async fn delete(&self, id: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM memories WHERE id = ?")
            .bind(id)
            .execute(&*self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn delete_batch(&self, ids: &[String]) -> Result<usize, sqlx::Error> {
        if ids.is_empty() {
            return Ok(0);
        }
        let mut builder = QueryBuilder::<Sqlite>::new("DELETE FROM memories WHERE id IN (");
        let mut separated = builder.separated(", ");
        for id in ids {
            separated.push_bind(id);
        }
        separated.push_unseparated(")");
        let result = builder.build().execute(&*self.pool).await?;
        Ok(result.rows_affected() as usize)
    }

    pub async fn delete_by_domain(&self, domain: &str) -> Result<usize, sqlx::Error> {
        let result = sqlx::query("DELETE FROM memories WHERE domain = ?")
            .bind(domain)
            .execute(&*self.pool)
            .await?;
        Ok(result.rows_affected() as usize)
    }

    pub async fn clear(&self) -> Result<(), sqlx::Error> {
        let _ = sqlx::query("DROP TRIGGER IF EXISTS memories_ai")
            .execute(&*self.pool)
            .await;
        let _ = sqlx::query("DROP TRIGGER IF EXISTS memories_ad")
            .execute(&*self.pool)
            .await;
        let _ = sqlx::query("DROP TRIGGER IF EXISTS memories_au")
            .execute(&*self.pool)
            .await;
        let _ = sqlx::query("DELETE FROM memories_fts")
            .execute(&*self.pool)
            .await;
        let _ = sqlx::query("DELETE FROM memories")
            .execute(&*self.pool)
            .await;
        self.init_schema().await?;
        Ok(())
    }

    pub async fn mark_used_batch(&self, ids: &[String]) -> Result<(), sqlx::Error> {
        if ids.is_empty() {
            return Ok(());
        }
        let now = Utc::now().to_rfc3339();
        let mut builder = QueryBuilder::<Sqlite>::new(
            "UPDATE memories SET use_count = use_count + 1, last_used_at = ",
        );
        builder.push_bind(now);
        builder.push(" WHERE id IN (");
        let mut separated = builder.separated(", ");
        for id in ids {
            separated.push_bind(id);
        }
        separated.push_unseparated(")");
        builder.build().execute(&*self.pool).await?;
        Ok(())
    }

    pub async fn stats(&self) -> Result<MemoryStats, sqlx::Error> {
        let total_row =
            sqlx::query("SELECT COUNT(*) as count FROM memories WHERE status = 'active'")
                .fetch_one(&*self.pool)
                .await?;
        let total: i64 = total_row.try_get("count").unwrap_or(0);

        let domain_rows = sqlx::query(
            "SELECT domain, COUNT(*) as count FROM memories WHERE status = 'active' GROUP BY domain",
        )
        .fetch_all(&*self.pool)
        .await?;

        let mut domains = HashMap::new();
        for row in domain_rows {
            let domain: String = row.try_get("domain").unwrap_or_default();
            let count: i64 = row.try_get("count").unwrap_or(0);
            domains.insert(domain, count as usize);
        }

        let conf_row =
            sqlx::query("SELECT AVG(confidence) as avg_conf FROM memories WHERE status = 'active'")
                .fetch_one(&*self.pool)
                .await?;
        let avg_confidence: f64 = conf_row.try_get("avg_conf").unwrap_or(0.0);

        Ok(MemoryStats {
            total: total as usize,
            domains,
            avg_confidence: (avg_confidence * 100.0).round() / 100.0,
        })
    }

    fn row_to_record(row: &sqlx::sqlite::SqliteRow) -> MemoryRecord {
        let id: String = row.try_get("id").unwrap_or_default();
        let scope: String = row
            .try_get("scope")
            .unwrap_or_else(|_| "project".to_string());
        let domain: String = row.try_get("domain").unwrap_or_default();
        let category: Option<String> = row.try_get("category").ok();
        let tags_raw: String = row.try_get("tags").unwrap_or_else(|_| "[]".to_string());
        let tags: Vec<String> = serde_json::from_str(&tags_raw).unwrap_or_default();
        let content: String = row.try_get("content").unwrap_or_default();
        let evidence: Option<String> = row.try_get("evidence").ok();
        let evidence_source: Option<String> = row.try_get("evidence_source").ok();
        let verified_int: Option<i64> = row.try_get("verified").ok();
        let verified = verified_int.map(|v| v == 1);
        let source_session: Option<String> = row.try_get("source_session").ok();
        let confidence: f64 = row.try_get("confidence").unwrap_or(0.6);
        let importance: String = row
            .try_get("importance")
            .unwrap_or_else(|_| "normal".to_string());
        let files_raw: Option<String> = row.try_get("related_files").ok();
        let related_files: Option<Vec<String>> =
            files_raw.and_then(|f| serde_json::from_str(&f).ok());
        let created_at: String = row.try_get("created_at").unwrap_or_default();
        let last_used_at: Option<String> = row.try_get("last_used_at").ok();
        let last_verified_at: Option<String> = row.try_get("last_verified_at").ok();
        let use_count: i64 = row.try_get("use_count").unwrap_or(0);
        let status: String = row
            .try_get("status")
            .unwrap_or_else(|_| "active".to_string());
        let superseded_by: Option<String> = row.try_get("superseded_by").ok();
        let supersedes: Option<String> = row.try_get("supersedes").ok();

        MemoryRecord {
            id,
            scope,
            domain,
            category,
            tags,
            content,
            evidence,
            evidence_source,
            verified,
            source_session,
            confidence,
            importance,
            related_files,
            created_at,
            last_used_at,
            last_verified_at,
            use_count,
            status,
            superseded_by,
            supersedes,
        }
    }
}
