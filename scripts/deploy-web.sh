#!/usr/bin/env bash
# ==============================================================================
# AvA Code — Automated Expo Web Build & Domain Deployment Script
# ==============================================================================

set -eo pipefail

REPO_DIR="/var/www/ava-code"
MOBILE_DIR="/var/www/ava-code/ava-mobile"
WEB_ROOT="/var/www/ava.mahmudhasan.pro"
DOMAIN="ava.mahmudhasan.pro"

# Color formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "\n${CYAN}======================================================${NC}"
echo -e "${CYAN}   🚀 AvA Web (Expo) Auto-Deploy Pipeline Starting    ${NC}"
echo -e "${CYAN}======================================================${NC}\n"

START_TIME=$(date +%s)

# Step 1: Export Expo Web
echo -e "${BLUE}[1/3] Building Expo Web Bundle...${NC}"
cd "$MOBILE_DIR"
npx expo export -p web

if [ ! -d "$MOBILE_DIR/dist" ]; then
    echo -e "${RED}Error: Build directory $MOBILE_DIR/dist was not generated!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Expo Web build succeeded.${NC}\n"

# Step 2: Deploy to Web Domain Root
echo -e "${BLUE}[2/3] Deploying to $WEB_ROOT ($DOMAIN)...${NC}"
mkdir -p "$WEB_ROOT"

# Sync files
rsync -av --delete "$MOBILE_DIR/dist/" "$WEB_ROOT/"

# Fix permissions
chmod -R 755 "$WEB_ROOT"
chown -R root:root "$WEB_ROOT" 2>/dev/null || true

# Reload Nginx if present
if command -v nginx >/dev/null 2>&1; then
    nginx -t >/dev/null 2>&1 && systemctl reload nginx >/dev/null 2>&1 || true
fi
echo -e "${GREEN}✓ Web files deployed and permissions set.${NC}\n"

# Step 3: Health Check & Verification
echo -e "${BLUE}[3/3] Verifying Live Web Portal...${NC}"
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
