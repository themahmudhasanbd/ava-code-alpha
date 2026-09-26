#!/bin/bash
set -e

echo "[1/5] Checking zip integrity..."
unzip -t /tmp/ava-core.zip > /dev/null

echo "[2/5] Extracting zip..."
mkdir -p /tmp/ava-core-extracted
unzip -o /tmp/ava-core.zip -d /tmp/ava-core-extracted/

echo "[3/5] Extracting tar.gz if present..."
cd /tmp/ava-core-extracted
if ls *.tar.gz 1> /dev/null 2>&1; then
    tar -xzvf *.tar.gz
fi

echo "Listing extracted files:"
ls -lh

echo "[4/5] Installing binaries..."
# Look for ava-app-server or codex-app-server
APP_SERVER_BIN=""
if [ -f "ava-app-server" ]; then
    APP_SERVER_BIN="ava-app-server"
elif [ -f "codex-app-server" ]; then
    APP_SERVER_BIN="codex-app-server"
fi

if [ -n "$APP_SERVER_BIN" ]; then
    echo "Found app server binary: $APP_SERVER_BIN"
    chmod +x "$APP_SERVER_BIN"
    cp -f "$APP_SERVER_BIN" /var/www/ava-code/ava-rs/target/debug/codex-app-server
    cp -f "$APP_SERVER_BIN" /var/www/ava-code/ava-rs/target/release/codex-app-server
    mkdir -p /var/www/ava-code/ava-rs/target/release
    cp -f "$APP_SERVER_BIN" /var/www/ava-code/ava-rs/target/release/ava-app-server
fi

# Look for ava-cli or ava
if [ -f "ava-cli" ]; then
    chmod +x ava-cli
    cp -f ava-cli /usr/local/bin/ava-cli
    cp -f ava-cli /usr/local/bin/ava 2>/dev/null || true
elif [ -f "ava" ]; then
    chmod +x ava
    cp -f ava /usr/local/bin/ava
    cp -f ava /usr/local/bin/ava-cli 2>/dev/null || true
fi

echo "[5/5] Restarting PM2 process 13..."
pm2 restart 13

sleep 3
echo "Verifying /healthz..."
curl -s -i -u "ava:SamirisonlyforAdria%2" -H "x-ava-client: mobile" https://ava.mahmudhasan.pro/healthz | head -n 10

echo "ALL DONE!"
