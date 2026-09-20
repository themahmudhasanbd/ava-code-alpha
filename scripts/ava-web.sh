#!/bin/bash
export AVA_HOME="${AVA_HOME:-$HOME/.ava}"
export TERM="xterm-256color"
export COLORTERM="truecolor"
export LANG="en_US.UTF-8"
cd /var/www
exec /usr/local/bin/ava "$@"
