#!/usr/bin/env bash
# ==============================================================================
# AvA Code — Automated Git Push, Flutter Web Build & Domain Deployment Script
# ==============================================================================

set -o pipefail

REPO_DIR="/var/www/ava-code"
MOBILE_DIR="/var/www/ava-code/ava-mobile"
WEB_ROOT="/var/www/ava.mahmudhasan.pro"
FLUTTER_BIN="/opt/flutter/bin/flutter"
DOMAIN="ava.mahmudhasan.pro"

# Color formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "\n${CYAN}======================================================${NC}"
echo -e "${CYAN}   🚀 AvA Web & Mobile Auto-Deploy Pipeline Starting   ${NC}"
echo -e "${CYAN}======================================================${NC}\n"

START_TIME=$(date +%s)

# Step 1: Git Auto Add, Commit & Push
echo -e "${BLUE}[1/4] Checking Git Status & Pushing to Remote...${NC}"
cd "$REPO_DIR"

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
COMMIT_MSG="${1:-feat(web): update AvA mobile/web client [$(date +'%Y-%m-%d %H:%M:%S')]}"

# Ensure git credentials
git config user.name "themahmudhasanbd" >/dev/null 2>&1 || true
git config user.email "themahmudhasanbd@gmail.com" >/dev/null 2>&1 || true

# Stage non-ignored files
git add -A . :^.github/workflows :^ava-desktop 2>/dev/null || git add -A

if ! git diff-index --quiet HEAD -- 2>/dev/null || [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}Staging & committing updates...${NC}"
    git commit -m "$COMMIT_MSG" || true
    echo -e "${GREEN}✓ Commit created: ${COMMIT_MSG}${NC}"
else
    echo -e "${GREEN}✓ Working tree clean. Ready for push & build.${NC}"
fi

echo -e "${BLUE}Pushing branch '${BRANCH}' to origin...${NC}"
if git push origin "$BRANCH"; then
    echo -e "${GREEN}✓ Git push succeeded.${NC}\n"
else
    echo -e "${YELLOW}Warning: Git push encountered an issue, proceeding with build...${NC}\n"
fi

# Step 2: Build Flutter Web
echo -e "${BLUE}[2/4] Building Flutter Web Release...${NC}"
cd "$MOBILE_DIR"

if [ ! -x "$FLUTTER_BIN" ]; then
    echo -e "${RED}Error: Flutter binary not found at $FLUTTER_BIN${NC}"
    exit 1
fi

echo -e "${CYAN}Compiling Flutter Web (optimized release mode)...${NC}"
"$FLUTTER_BIN" build web --release --no-wasm-dry-run

if [ ! -d "$MOBILE_DIR/build/web" ]; then
    echo -e "${RED}Error: Build directory $MOBILE_DIR/build/web was not generated!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Flutter Web build succeeded.${NC}\n"

# Step 3: Deploy to Web Domain Root
echo -e "${BLUE}[3/4] Deploying to $WEB_ROOT ($DOMAIN)...${NC}"
mkdir -p "$WEB_ROOT"

# Sync files
rsync -av "$MOBILE_DIR/build/web/" "$WEB_ROOT/"

# Fix permissions
chmod -R 755 "$WEB_ROOT"
chown -R root:root "$WEB_ROOT" 2>/dev/null || true

# Reload Nginx if present
if command -v nginx >/dev/null 2>&1; then
    nginx -t >/dev/null 2>&1 && systemctl reload nginx >/dev/null 2>&1 || true
fi
echo -e "${GREEN}✓ Web files deployed and permissions set.${NC}\n"

# Step 4: Health Check & Verification
echo -e "${BLUE}[4/4] Verifying Live Web Portal...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k "https://${DOMAIN}/" || echo "000")
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 301 ] || [ "$HTTP_CODE" -eq 302 ]; then
    echo -e "${GREEN}✓ Health check OK: HTTP $HTTP_CODE from https://${DOMAIN}/${NC}"
else
    echo -e "${YELLOW}Notice: HTTP Status $HTTP_CODE from https://${DOMAIN}/${NC}"
fi

echo -e "\n${CYAN}======================================================${NC}"
echo -e "${GREEN}   🎉 Deployment Complete in ${DURATION}s!${NC}"
echo -e "${CYAN}   🌐 Live URL: https://${DOMAIN}/${NC}"
echo -e "${CYAN}======================================================${NC}\n"
