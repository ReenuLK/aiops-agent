#!/bin/bash
# Starts two containers bound to the same host port.
# Expected result: the second container fails to start with
# "Bind for 0.0.0.0:8080 failed: port is already allocated"

docker rm -f demo-port-a demo-port-b 2>/dev/null

echo "Starting first container on port 8080..."
docker run -d --name demo-port-a -p 8080:80 nginx

echo "Attempting to start second container on the same port 8080 (expected to fail)..."
docker run -d --name demo-port-b -p 8080:80 nginx

echo ""
echo "Check the error with:"
echo "  docker ps -a --filter name=demo-port-b"
echo "  docker logs demo-port-b 2>&1 || echo '(container never started, check terminal output above)'"