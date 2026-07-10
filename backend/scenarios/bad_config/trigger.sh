#!/bin/bash
# Triggers a crash-loop by mounting a malformed nginx.conf into the container.
# Expected result: container repeatedly restarts / exits with code 1.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

docker rm -f demo-bad-config 2>/dev/null

MSYS_NO_PATHCONV=1 docker run -d \
  --name demo-bad-config \
  -v "$SCRIPT_DIR/bad_nginx.conf:/etc/nginx/nginx.conf:ro" \
  nginx

echo "Started demo-bad-config. Check status with:"
echo "  docker ps -a --filter name=demo-bad-config"
echo "  docker logs demo-bad-config"