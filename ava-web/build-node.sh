#!/bin/bash
# Build web-v2 for Node.js server (instead of default Cloudflare worker target)
set -e
cd /var/www/ava-code/ava-web
export NITRO_PRESET=node-server
npm run build
