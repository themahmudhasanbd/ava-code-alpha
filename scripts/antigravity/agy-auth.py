#!/usr/bin/env python3
"""Antigravity OAuth for ava-core — fully server-side, phone does nothing.

One-time login:
    python3 agy-auth.py login
    - prints a Google OAuth URL; open it in any browser and approve
    - Google redirects to https://antigravity.google/oauth-callback?code=...
    - paste the code (or the full redirect URL) back into the terminal
    - the script exchanges it for a refresh token and stores it at
      ~/.config/ava/antigravity-auth.json (mode 0600)

Ongoing (wired as model_providers.antigravity.auth.command in ava-core):
    python3 agy-auth.py token
    - prints ONE line to stdout: a fresh access token, nothing else
    - auto-refreshes via the stored refresh token when it expires within
      10 minutes, so the server never needs manual tokens again
"""

import base64
import hashlib
import json
import os
import secrets
import sys
import time
import urllib.parse
import urllib.request

# Baked in on the VPS from the public Antigravity OAuth client
# (same values shipped by open-source Antigravity integrations).
AGY_CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com"
AGY_CLIENT_SECRET = "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"
AGY_REDIRECT_URI = "https://antigravity.google/oauth-callback"
AGY_SCOPES = "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/cclog https://www.googleapis.com/auth/experimentsandconfigs".split(" ")

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://www.googleapis.com/oauth2/v1/userinfo?alt=json"
LOAD_ASSIST_URL = "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist"

AUTH_FILE = os.environ.get(
    "AGY_AUTH_FILE",
    os.path.join(os.path.expanduser("~"), ".config", "ava", "antigravity-auth.json"),
)
REFRESH_SKEW_S = 600  # refresh when < 10 min of life remains
HTTP_TIMEOUT_S = 25
UA = "antigravity/ide/2.5.5 darwin/arm64"


def _post_form(url, fields):
    data = urllib.parse.urlencode(fields).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA},
    )
    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_S) as res:
        return res.status, res.read().decode()


def _get_json(url, access_token):
    req = urllib.request.Request(
        url, headers={"Authorization": "Bearer " + access_token, "User-Agent": UA}
    )
    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_S) as res:
        return json.loads(res.read().decode())


def _post_json(url, access_token, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + access_token,
            "User-Agent": UA,
            "X-Goog-Api-Client": "gl-node/22.21.1",
        },
    )
    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_S) as res:
        return json.loads(res.read().decode())


def _pkce():
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .rstrip(b"=")
        .decode()
    )
    return verifier, challenge


def _save_auth(data):
    os.makedirs(os.path.dirname(AUTH_FILE), exist_ok=True)
    tmp = AUTH_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.chmod(tmp, 0o600)
    os.replace(tmp, AUTH_FILE)


def _load_auth():
    with open(AUTH_FILE) as f:
        return json.load(f)


def _extract_code(user_input):
    text = user_input.strip()
    if not text:
        return None
    if text.startswith("http"):
        qs = urllib.parse.urlparse(text).query
        params = urllib.parse.parse_qs(qs)
        code = params.get("code", [None])[0]
        return code
    if "code=" in text:
        params = urllib.parse.parse_qs(text.lstrip("?"))
        code = params.get("code", [None])[0]
        if code:
            return code
    return text  # assume raw code pasted


def cmd_login():
    verifier, challenge = _pkce()
    state = secrets.token_hex(32)
    params = {
        "client_id": AGY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": AGY_REDIRECT_URI,
        "scope": " ".join(AGY_SCOPES),
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    url = AUTH_URL + "?" + urllib.parse.urlencode(params)

    print("=" * 70)
    print("Antigravity login — one-time, everything stays server-side.")
    print("=" * 70)
    print("\n1. Open this URL in any browser and approve:\n")
    print(url)
    print(
        "\n2. Google will redirect to antigravity.google/oauth-callback?code=..."
        "\n3. Copy the code (or the full redirect URL) and paste it below.\n"
    )
    try:
        user_input = input("code: ")
    except (EOFError, KeyboardInterrupt):
        print("\nCancelled.")
        return 1

    code = _extract_code(user_input)
    if not code:
        print("No code provided.", file=sys.stderr)
        return 1

    status, body = _post_form(
        TOKEN_URL,
        {
            "client_id": AGY_CLIENT_ID,
            "client_secret": AGY_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": AGY_REDIRECT_URI,
            "code_verifier": verifier,
        },
    )
    if status != 200:
        print("Token exchange failed: " + body[:300], file=sys.stderr)
        return 1
    payload = json.loads(body)
    refresh_token = payload.get("refresh_token")
    access_token = payload.get("access_token")
    expires_in = payload.get("expires_in", 3600)
    if not refresh_token or not access_token:
        print("Missing tokens in response.", file=sys.stderr)
        return 1

    email = None
    try:
        email = _get_json(USERINFO_URL, access_token).get("email")
    except Exception as e:
        print("warning: userinfo failed: " + str(e)[:120], file=sys.stderr)

    project_id = None
    try:
        proj = _post_json(
            LOAD_ASSIST_URL, access_token, {"metadata": {"ideType": "ANTIGRAVITY"}}
        )
        project_id = (
            proj.get("cloudaicompanionProject")
            or proj.get("projectId")
            or (proj.get("project") or {}).get("id")
        )
    except Exception as e:
        print("warning: project lookup failed: " + str(e)[:120], file=sys.stderr)

    _save_auth(
        {
            "refresh_token": refresh_token,
            "access_token": access_token,
            "expires_at": int(time.time()) + int(expires_in),
            "email": email,
            "project_id": project_id,
        }
    )
    print("\nSaved to " + AUTH_FILE + " (mode 0600).")
    if email:
        print("Account: " + email)
    if project_id:
        print("Project: " + project_id)
    print("Done — the server will now refresh tokens automatically.")
    return 0


def _refresh(data):
    status, body = _post_form(
        TOKEN_URL,
        {
            "client_id": AGY_CLIENT_ID,
            "client_secret": AGY_CLIENT_SECRET,
            "grant_type": "refresh_token",
            "refresh_token": data["refresh_token"],
        },
    )
    if status != 200:
        raise RuntimeError("refresh failed: " + body[:300])
    payload = json.loads(body)
    data["access_token"] = payload["access_token"]
    data["expires_at"] = int(time.time()) + int(payload.get("expires_in", 3600))
    if payload.get("refresh_token"):
        data["refresh_token"] = payload["refresh_token"]
    _save_auth(data)
    return data["access_token"]


def cmd_token():
    # stdout must contain ONLY the token — ava-core captures it.
    try:
        data = _load_auth()
    except FileNotFoundError:
        print("no auth file; run 'agy-auth.py login' first", file=sys.stderr)
        return 1
    except Exception as e:
        print("cannot read auth file: " + str(e)[:200], file=sys.stderr)
        return 1

    try:
        if data.get("expires_at", 0) - time.time() < REFRESH_SKEW_S:
            access_token = _refresh(data)
        else:
            access_token = data["access_token"]
    except Exception as e:
        print(str(e)[:300], file=sys.stderr)
        return 1

    sys.stdout.write(access_token.strip() + "\n")
    return 0


def main(argv):
    if len(argv) != 2 or argv[1] not in ("login", "token"):
        print("usage: agy-auth.py [login|token]", file=sys.stderr)
        return 2
    if AGY_CLIENT_ID.startswith("__AGY_"):
        print("script not initialized with OAuth client values", file=sys.stderr)
        return 1
    return cmd_login() if argv[1] == "login" else cmd_token()


if __name__ == "__main__":
    sys.exit(main(sys.argv))
