#!/bin/bash
# Builds and runs the leaky app with a low memory limit so Docker OOM-kills it.
# Expected result: container exits with code 137, OOMKilled=true.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

docker rm -f demo-oom 2>/dev/null

MSYS_NO_PATHCONV=1 docker build -t demo-leaky-app "$SCRIPT_DIR"

docker run -d \
  --name demo-oom \
  --memory=100m \
  --memory-swap=100m \
  demo-leaky-app

echo "Started demo-oom. It will OOM-kill within ~10-20 seconds."
echo "Check status with:"
echo "  docker ps -a --filter name=demo-oom"
echo "  docker inspect demo-oom --format '{{.State.OOMKilled}}'"