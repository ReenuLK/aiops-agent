#!/bin/bash
# Removes all demo containers so you can re-run scenarios cleanly.

echo "Removing all demo-* containers..."

docker rm -f \
  demo-bad-config \
  demo-oom \
  demo-port-a \
  demo-port-b \
  demo-missing-env \
  2>/dev/null

echo "Done. All demo containers removed."
echo ""
echo "Current containers:"
docker ps -a