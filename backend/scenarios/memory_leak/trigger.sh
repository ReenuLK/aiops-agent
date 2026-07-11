#!/bin/bash
# Builds and runs the leaky app with a low memory limit so Docker OOM-kills it.
# Expected result: container exits with code 137, OOMKilled=true.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if command -v wslpath > /dev/null 2>&1; then
  DOCKER_CONTEXT="$(wslpath -w "$SCRIPT_DIR" 2>/dev/null || printf '%s' "$SCRIPT_DIR")"
elif command -v cygpath > /dev/null 2>&1; then
  DOCKER_CONTEXT="$(cygpath -w "$SCRIPT_DIR")"
else
  DOCKER_CONTEXT="$SCRIPT_DIR"
fi

export MSYS_NO_PATHCONV=1

docker rm -f demo-oom 2>/dev/null || true

docker build -t demo-leaky-app "$DOCKER_CONTEXT"

docker run -d \
  --name demo-oom \
  --memory=100m \
  --memory-swap=100m \
  demo-leaky-app

echo "Started demo-oom. It will OOM-kill within ~10-20 seconds."
echo "Check status with:"
echo "  docker ps -a --filter name=demo-oom"
echo "  docker inspect demo-oom --format '{{.State.OOMKilled}}'"