#!/bin/bash

# Set "chatgpt.cliExecutable": "/Users/<USERNAME>/code/ava/scripts/debug-ava.sh" in VSCode settings to always get the 
# latest ava-rs binary when debugging Ava Extension.


set -euo pipefail

AVA_RS_DIR=$(realpath "$(dirname "$0")/../ava-rs")
(cd "$AVA_RS_DIR" && cargo run --quiet --bin ava -- "$@")