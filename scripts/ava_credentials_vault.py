#!/usr/bin/env python3
"""
AvA Native Encrypted Browser Credential Vault
Stores encrypted website credentials (URL, domain, username/email, password/bearer token)
in SQLite with authenticated AES-256-GCM encryption.
Database: /root/.ava-code/browser_credentials.sqlite
"""

import os
import sys
import json
import sqlite3
import hashlib
import secrets
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
from urllib.parse import urlparse
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def get_ava_dir() -> Path:
    env_home = os.environ.get("AVA_CODE_HOME") or os.environ.get("AVA_HOME")
    if env_home:
        return Path(env_home)
    return Path.home() / ".ava-code"

VAULT_DIR = get_ava_dir()
VAULT_DB_PATH = VAULT_DIR / "browser_credentials.sqlite"
MASTER_SECRET_PATH = VAULT_DIR / ".vault_master_key"

def get_or_create_master_key() -> bytes:
    VAULT_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if MASTER_SECRET_PATH.exists():
        try:
            return MASTER_SECRET_PATH.read_bytes()[:32]
        except Exception:
            pass
    # Generate 32-byte secure key
    key = secrets.token_bytes(32)
    MASTER_SECRET_PATH.write_bytes(key)
    try:
        os.chmod(MASTER_SECRET_PATH, 0o600)
    except Exception:
        pass
    return key

MASTER_KEY = get_or_create_master_key()

def get_db():
    conn = sqlite3.connect(str(VAULT_DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("""
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
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_browser_cred_domain ON browser_credentials(domain);")
    conn.commit()
    return conn

def extract_domain(url: str) -> str:
    clean = url if url.startswith(("http://", "https://")) else f"https://{url}"
    try:
        parsed = urlparse(clean)
        host = parsed.netloc.split(":")[0]
        return host.lower()
    except Exception:
        return url.replace("https://", "").replace("http://", "").split("/")[0].split(":")[0].lower()

def encrypt_secret(plaintext: str) -> tuple[str, str, str]:
    """Encrypt secret with AES-256-GCM and return (ciphertext_hex, nonce_hex, tag_hex)."""
    nonce = secrets.token_bytes(12)
    aesgcm = AESGCM(MASTER_KEY)
    ct_with_tag = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    # In cryptography AESGCM, the last 16 bytes are the auth tag
    ciphertext = ct_with_tag[:-16]
    tag = ct_with_tag[-16:]
    return ciphertext.hex(), nonce.hex(), tag.hex()

def decrypt_secret(ciphertext_hex: str, nonce_hex: str, tag_hex: str) -> str:
    """Decrypt AES-256-GCM ciphertext verifying authentication tag."""
    nonce = bytes.fromhex(nonce_hex)
    ciphertext = bytes.fromhex(ciphertext_hex)
    tag = bytes.fromhex(tag_hex)
    aesgcm = AESGCM(MASTER_KEY)
    decrypted = aesgcm.decrypt(nonce, ciphertext + tag, None)
    return decrypted.decode("utf-8")

def save_credential(
    site_url: str,
    username: str,
    secret: str,
    auth_type: str = "password",
    domain: Optional[str] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    dom = (domain or extract_domain(site_url)).lower()
    now_iso = datetime.utcnow().isoformat() + "Z"
    
    with get_db() as conn:
        # Check if credential already exists for domain + username
        cursor = conn.execute(
            "SELECT id FROM browser_credentials WHERE domain = ? AND username = ?",
            (dom, username)
        )
        row = cursor.fetchone()
        
        ct_hex, iv_hex, tag_hex = encrypt_secret(secret)
        
        if row:
            cred_id = row["id"]
            conn.execute("""
                UPDATE browser_credentials
                SET site_url = ?, auth_type = ?, encrypted_secret = ?, iv = ?, auth_tag = ?, notes = ?, updated_at = ?
                WHERE id = ?
            """, (site_url, auth_type, ct_hex, iv_hex, tag_hex, notes or "", now_iso, cred_id))
        else:
            cred_id = f"cred_{secrets.token_hex(8)}"
            conn.execute("""
                INSERT INTO browser_credentials (id, site_url, domain, auth_type, username, encrypted_secret, iv, auth_tag, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (cred_id, site_url, dom, auth_type, username, ct_hex, iv_hex, tag_hex, notes or "", now_iso, now_iso))
            
        conn.commit()
        return {
            "id": cred_id,
            "site_url": site_url,
            "domain": dom,
            "username": username,
            "auth_type": auth_type,
            "notes": notes,
            "created_at": now_iso,
            "updated_at": now_iso
        }

def list_credentials() -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.execute("SELECT id, site_url, domain, auth_type, username, notes, created_at, updated_at FROM browser_credentials ORDER BY updated_at DESC")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

def lookup_credential(target: str) -> Optional[Dict[str, Any]]:
    dom = extract_domain(target)
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT * FROM browser_credentials WHERE domain = ? OR domain = ? OR site_url LIKE ? ORDER BY updated_at DESC LIMIT 1",
            (dom, target.lower(), f"%{dom}%")
        )
        row = cursor.fetchone()
        if not row:
            return None
        
        try:
            secret = decrypt_secret(row["encrypted_secret"], row["iv"], row["auth_tag"])
        except Exception as e:
            return None
            
        auth_type = row["auth_type"]
        is_token = auth_type in ("bearer_token", "api_key")
        return {
            "id": row["id"],
            "site_url": row["site_url"],
            "domain": row["domain"],
            "auth_type": auth_type,
            "username": row["username"],
            "secret": secret,
            "password": None if is_token else secret,
            "token": secret if is_token else None,
            "notes": row["notes"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }

def delete_credential(cred_id: str) -> bool:
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM browser_credentials WHERE id = ?", (cred_id,))
        conn.commit()
        return cursor.rowcount > 0
