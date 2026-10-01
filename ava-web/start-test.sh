#!/bin/bash
# Start web-v2 node server for test.thundernexus.com
cd /var/www/ava-code/ava-web/.output/server
export PORT=3102
export HOST=127.0.0.1
exec node index.mjs
