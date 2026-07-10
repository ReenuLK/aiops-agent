#!/bin/bash
# Runs the app WITHOUT setting DATABASE_URL, so it crashes immediately.
# Expected result: container exits with code 1, logs show KeyError: 'DATABASE_URL'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -W)"

docker rm -f demo-missing-env 2>/dev/null

MSYS_NO_PATHCONV=1 docker build -t demo-missing-env-app "$SCRIPT_DIR"

docker run -d \
  --name demo-missing-env \
  demo-missing-env-app

echo "Started demo-missing-env (no DATABASE_URL set, expected to crash)."
echo "Check status with:"
echo "  docker ps -a --filter name=demo-missing-env"
echo "  docker logs demo-missing-env"