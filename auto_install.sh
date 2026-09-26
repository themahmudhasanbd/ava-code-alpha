#!/bin/bash
set -e
LOG="/var/www/ava-code/install.log"
exec > >(tee -a "$LOG") 2>&1

echo "[$(date)] Starting auto-install monitor..."

# Wait for curl download (pid 34765 or any curl with ava-core.zip) to complete
while pgrep -f "ava-core.zip" > /dev/null; do
    SIZE=$(ls -lh /tmp/ava-core.zip 2>/dev/null | awk '{print $5}' || echo "0")
    echo "[$(date)] Downloading... current size: $SIZE"
    sleep 10
done

echo "[$(date)] Download finished! Checking file..."
ls -lh /tmp/ava-core.zip

mkdir -p /tmp/ava-extract /tmp/ava-bins
rm -rf /tmp/ava-extract/* /tmp/ava-bins/*

echo "[$(date)] Unzipping /tmp/ava-core.zip..."
unzip -q /tmp/ava-core.zip -d /tmp/ava-extract

echo "[$(date)] Extracted contents:"
ls -la /tmp/ava-extract

# If there is a tar.gz inside, extract it
if ls /tmp/ava-extract/*.tar.gz 1> /dev/null 2>&1; then
    echo "[$(date)] Found tar.gz, extracting..."
    tar -xzf /tmp/ava-extract/*.tar.gz -C /tmp/ava-bins
elif ls /tmp/ava-extract/*.zip 1> /dev/null 2>&1; then
    echo "[$(date)] Found inner zip, extracting..."
    unzip -q /tmp/ava-extract/*.zip -d /tmp/ava-bins
else
    cp -r /tmp/ava-extract/* /tmp/ava-bins/
fi

echo "[$(date)] Binaries found in /tmp/ava-bins:"
ls -la /tmp/ava-bins

# Locate ava-app-server or codex-app-server
APP_SERVER=""
if [ -f "/tmp/ava-bins/ava-app-server" ]; then
    APP_SERVER="/tmp/ava-bins/ava-app-server"
elif [ -f "/tmp/ava-bins/codex-app-server" ]; then
    APP_SERVER="/tmp/ava-bins/codex-app-server"
elif [ -f "/tmp/ava-bins/dist/ava-app-server" ]; then
    APP_SERVER="/tmp/ava-bins/dist/ava-app-server"
elif [ -f "/tmp/ava-bins/dist/codex-app-server" ]; then
    APP_SERVER="/tmp/ava-bins/dist/codex-app-server"
fi

echo "[$(date)] Target app server binary: $APP_SERVER"

if [ -n "$APP_SERVER" ]; then
    chmod +x "$APP_SERVER"
    mkdir -p /var/www/ava-code/ava-rs/target/debug /var/www/ava-code/ava-rs/target/release
    cp "$APP_SERVER" /var/www/ava-code/ava-rs/target/debug/codex-app-server
    cp "$APP_SERVER" /var/www/ava-code/ava-rs/target/debug/ava-app-server
    cp "$APP_SERVER" /var/www/ava-code/ava-rs/target/release/codex-app-server
    cp "$APP_SERVER" /var/www/ava-code/ava-rs/target/release/ava-app-server
    chmod +x /var/www/ava-code/ava-rs/target/debug/* /var/www/ava-code/ava-rs/target/release/*
    echo "[$(date)] Binaries copied to target directories."
fi

# Also copy ava-cli / ava if present
if [ -f "/tmp/ava-bins/ava-cli" ]; then
    cp /tmp/ava-bins/ava-cli /usr/local/bin/ava-cli
    chmod +x /usr/local/bin/ava-cli
fi
if [ -f "/tmp/ava-bins/ava" ]; then
    cp /tmp/ava-bins/ava /usr/local/bin/ava
    chmod +x /usr/local/bin/ava
fi

# Restart PM2 process 13
echo "[$(date)] Restarting PM2 process 13..."
pm2 restart 13

sleep 3

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -u "ava:SamirisonlyforAdria%2" -H "x-ava-client: mobile" http://127.0.0.1:4096/healthz || echo "failed")
echo "[$(date)] Health check result: $HTTP_CODE"

# Clean up temporary downloads to restore disk space
rm -rf /tmp/ava-core.zip /tmp/ava-extract /tmp/ava-bins

echo "[$(date)] Auto-install completed successfully!"
