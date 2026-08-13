#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
APP_ROOT="$REPO_ROOT/apps/unstuck-dashboard"
SERVER_ENTRY="$APP_ROOT/server/dev-server.mjs"
NODE_BIN=${UNSTUCK_NODE_BIN:-node}

child_pid=""
stopping=0

cleanup() {
  stopping=1
  if [ -n "${child_pid:-}" ] && kill -0 "$child_pid" 2>/dev/null; then
    kill "$child_pid" 2>/dev/null || true
    wait "$child_pid" 2>/dev/null || true
  fi
  exit 0
}

trap cleanup INT TERM HUP

cd "$APP_ROOT"

while :; do
  "$NODE_BIN" "$SERVER_ENTRY" &
  child_pid=$!

  wait "$child_pid"
  exit_code=$?

  if [ "$stopping" -eq 1 ] || [ "$exit_code" -eq 0 ]; then
    exit 0
  fi

  printf 'Unstuck dashboard exited with code %s, restarting in 1s\n' "$exit_code" >&2
  sleep 1
done
