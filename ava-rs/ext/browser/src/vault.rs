use std::path::{Path, PathBuf};
use std::sync::Arc;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
    Row, SqlitePool,
};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecryptedCredential {
    pub id: String,
    pub site_url: String,
    pub domain: String,
    pub auth_type: String,
    pub username: String,
    pub secret: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaskedCredential {
    pub id: String,
    pub site_url: String,
    pub domain: String,
    pub auth_type: String,
    pub username: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone)]
pub struct BrowserCredentialVault {
    pool: Arc<SqlitePool>,
    master_key: [u8; 32],
}

impl BrowserCredentialVault {
    pub fn default_vault_path() -> PathBuf {
        if let Ok(ava_home) = std::env::var("AVA_CODE_HOME").or_else(|_| std::env::var("AVA_HOME")) {
            return PathBuf::from(ava_home).join("browser_credentials.sqlite");
        }
        if let Some(home) = dirs_home() {
            return home.join(".ava-code").join("browser_credentials.sqlite");
        }
        PathBuf::from("/root/.ava-code/browser_credentials.sqlite")
    }

    fn get_or_create_master_key(dir: &Path) -> [u8; 32] {
        let key_path = dir.join(".vault_master_key");
        if let Ok(bytes) = std::fs::read(&key_path) {
            if bytes.len() >= 32 {
                let mut k = [0u8; 32];
                k.copy_from_slice(&bytes[..32]);
                return k;
            }
        }
        let mut k = [0u8; 32];
        for b in &mut k {
            *b = rand_u8();
        }
        let _ = std::fs::write(&key_path, k);
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&key_path, std::fs::Permissions::from_mode(0o600));
        }
        k
    }

    pub async fn open(db_path: &Path) -> Result<Self, String> {
        if let Some(parent) = db_path.parent() {
            let _ = tokio::fs::create_dir_all(parent).await;
        }

        let base_dir = db_path.parent().unwrap_or_else(|| Path::new("/root/.ava-code"));
        let master_key = Self::get_or_create_master_key(base_dir);

        let options = SqliteConnectOptions::new()
            .filename(db_path)
            .create_if_missing(true)
            .journal_mode(SqliteJournalMode::Wal)
            .synchronous(SqliteSynchronous::Normal)
            .busy_timeout(std::time::Duration::from_secs(5));

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await
            .map_err(|e| format!("Failed to open browser credentials db: {e}"))?;

        let vault = Self {
            pool: Arc::new(pool),
            master_key,
        };
        vault.init_schema().await?;
        Ok(vault)
    }

    pub async fn open_default() -> Result<Self, String> {
        let p = Self::default_vault_path();
        Self::open(&p).await
    }

    async fn init_schema(&self) -> Result<(), String> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS browser_credentials (
                id TEXT PRIMARY KEY,
                site_url TEXT NOT NULL,
                domain TEXT NOT NULL,
                auth_type TEXT NOT NULL,
                username TEXT NOT NULL,
                encrypted_secret TEXT NOT NULL,
                iv TEXT NOT NULL,
                auth_tag TEXT NOT NULL,
                notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_browser_cred_domain ON browser_credentials(domain);
            "#,
        )
        .execute(&*self.pool)
        .await
        .map_err(|e| format!("Failed to init credential vault schema: {e}"))?;
        Ok(())
    }

    fn encrypt(&self, plaintext: &str) -> Result<(String, String, String), String> {
        let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&self.master_key);
        let cipher = Aes256Gcm::new(key);
        let mut nonce_bytes = [0u8; 12];
        for b in &mut nonce_bytes {
            *b = rand_u8();
        }
        let nonce = Nonce::from_slice(&nonce_bytes);
        let ct_with_tag = cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| format!("AES-256-GCM encryption error: {e}"))?;

        if ct_with_tag.len() < 16 {
            return Err("Invalid ciphertext length".to_string());
        }

        let split_at = ct_with_tag.len() - 16;
        let ct = &ct_with_tag[..split_at];
        let tag = &ct_with_tag[split_at..];

        Ok((hex_encode(ct), hex_encode(&nonce_bytes), hex_encode(tag)))
    }

    fn decrypt(&self, ct_hex: &str, iv_hex: &str, tag_hex: &str) -> Result<String, String> {
        let ct = hex_decode(ct_hex).map_err(|e| format!("Invalid ct hex: {e}"))?;
        let iv = hex_decode(iv_hex).map_err(|e| format!("Invalid iv hex: {e}"))?;
        let tag = hex_decode(tag_hex).map_err(|e| format!("Invalid tag hex: {e}"))?;

        if iv.len() != 12 {
            return Err("Invalid nonce length for GCM".to_string());
        }

        let mut ct_with_tag = ct;
        ct_with_tag.extend_from_slice(&tag);

        let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&self.master_key);
        let cipher = Aes256Gcm::new(key);
        let nonce = Nonce::from_slice(&iv);

        let pt_bytes = cipher
            .decrypt(nonce, ct_with_tag.as_ref())
            .map_err(|e| format!("AES-256-GCM decryption failed (auth tag mismatch): {e}"))?;

        String::from_utf8(pt_bytes).map_err(|e| format!("Invalid utf8 in decrypted secret: {e}"))
    }

    pub async fn save(
        &self,
        site_url: &str,
        username: &str,
        secret: &str,
        auth_type: &str,
        domain: Option<&str>,
        notes: Option<&str>,
    ) -> Result<DecryptedCredential, String> {
        let dom = domain
            .map(|s| s.to_string())
            .unwrap_or_else(|| extract_domain(site_url));
        let now_iso = Utc::now().to_rfc3339();

        let (ct_hex, iv_hex, tag_hex) = self.encrypt(secret)?;

        let existing: Option<String> = sqlx::query_scalar(
            "SELECT id FROM browser_credentials WHERE domain = ? AND username = ? LIMIT 1",
        )
        .bind(&dom)
        .bind(username)
        .fetch_optional(&*self.pool)
        .await
        .map_err(|e| format!("Database query error: {e}"))?;

        let id = match existing {
            Some(existing_id) => {
                sqlx::query(
                    r#"
                    UPDATE browser_credentials
                    SET site_url = ?, auth_type = ?, encrypted_secret = ?, iv = ?, auth_tag = ?, notes = ?, updated_at = ?
                    WHERE id = ?
                    "#,
                )
                .bind(site_url)
                .bind(auth_type)
                .bind(&ct_hex)
                .bind(&iv_hex)
                .bind(&tag_hex)
                .bind(notes)
                .bind(&now_iso)
                .bind(&existing_id)
                .execute(&*self.pool)
                .await
                .map_err(|e| format!("Failed to update credential: {e}"))?;
                existing_id
            }
            None => {
                let new_id = format!("cred_{}", &Uuid::new_v4().to_string().replace('-', "")[..16]);
                sqlx::query(
                    r#"
                    INSERT INTO browser_credentials (id, site_url, domain, auth_type, username, encrypted_secret, iv, auth_tag, notes, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    "#,
                )
                .bind(&new_id)
                .bind(site_url)
                .bind(&dom)
                .bind(auth_type)
                .bind(username)
                .bind(&ct_hex)
                .bind(&iv_hex)
                .bind(&tag_hex)
                .bind(notes)
                .bind(&now_iso)
                .bind(&now_iso)
                .execute(&*self.pool)
                .await
                .map_err(|e| format!("Failed to insert credential: {e}"))?;
                new_id
            }
        };

        Ok(DecryptedCredential {
            id,
            site_url: site_url.to_string(),
            domain: dom,
            auth_type: auth_type.to_string(),
            username: username.to_string(),
            secret: secret.to_string(),
            notes: notes.map(|s| s.to_string()),
            created_at: now_iso.clone(),
            updated_at: now_iso,
        })
    }

    pub async fn lookup(&self, target: &str) -> Result<Option<DecryptedCredential>, String> {
        let dom = extract_domain(target);
        let like_pat = format!("%{dom}%");

        let row = sqlx::query(
            r#"
            SELECT id, site_url, domain, auth_type, username, encrypted_secret, iv, auth_tag, notes, created_at, updated_at
            FROM browser_credentials
            WHERE domain = ? OR domain = ? OR site_url LIKE ?
            ORDER BY updated_at DESC LIMIT 1
            "#,
        )
        .bind(&dom)
        .bind(target)
        .bind(&like_pat)
        .fetch_optional(&*self.pool)
        .await
        .map_err(|e| format!("Database lookup error: {e}"))?;

        let Some(r) = row else {
            return Ok(None);
        };

        let ct: String = r.get("encrypted_secret");
        let iv: String = r.get("iv");
        let tag: String = r.get("auth_tag");

        let secret = self.decrypt(&ct, &iv, &tag)?;

        Ok(Some(DecryptedCredential {
            id: r.get("id"),
            site_url: r.get("site_url"),
            domain: r.get("domain"),
            auth_type: r.get("auth_type"),
            username: r.get("username"),
            secret,
            notes: r.get("notes"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        }))
    }

    pub async fn list(&self) -> Result<Vec<MaskedCredential>, String> {
        let rows = sqlx::query(
            "SELECT id, site_url, domain, auth_type, username, notes, created_at, updated_at FROM browser_credentials ORDER BY updated_at DESC",
        )
        .fetch_all(&*self.pool)
        .await
        .map_err(|e| format!("Database list error: {e}"))?;

        let list = rows
            .into_iter()
            .map(|r| MaskedCredential {
                id: r.get("id"),
                site_url: r.get("site_url"),
                domain: r.get("domain"),
                auth_type: r.get("auth_type"),
                username: r.get("username"),
                notes: r.get("notes"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            })
            .collect();

        Ok(list)
    }

    pub async fn delete(&self, id: &str) -> Result<bool, String> {
        let res = sqlx::query("DELETE FROM browser_credentials WHERE id = ?")
            .bind(id)
            .execute(&*self.pool)
            .await
            .map_err(|e| format!("Database delete error: {e}"))?;

        Ok(res.rows_affected() > 0)
    }
}

fn extract_domain(url: &str) -> String {
    let s = url.trim_start_matches("https://").trim_start_matches("http://");
    s.split('/').next().unwrap_or(url).split(':').next().unwrap_or(url).to_lowercase()
}

fn hex_encode(data: &[u8]) -> String {
    let mut s = String::with_capacity(data.len() * 2);
    for b in data {
        use std::fmt::Write;
        let _ = write!(s, "{:02x}", b);
    }
    s
}

fn hex_decode(s: &str) -> Result<Vec<u8>, String> {
    if s.len() % 2 != 0 {
        return Err("Odd length hex string".to_string());
    }
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16).map_err(|e| e.to_string()))
        .collect()
}

fn dirs_home() -> Option<PathBuf> {
    std::env::var_os("HOME").map(PathBuf::from)
}

fn rand_u8() -> u8 {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let pid = std::process::id();
    let mut h = now ^ (pid as u128);
    h ^= h >> 13;
    h ^= h << 7;
    (h & 0xff) as u8
}
