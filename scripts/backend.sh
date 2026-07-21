#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"

cd "$BACKEND_DIR"

python3 -m venv "$BACKEND_DIR/venv"

source "$BACKEND_DIR/venv/bin/activate"

pip install --upgrade pip

pip install -r "$REPO_ROOT/requirements.txt"

cat > "$BACKEND_DIR/.env" <<EOF
DATABASE_URL=postgresql://aiops:aiops_dev_password@localhost:5432/aiops_db
REDIS_URL=redis://localhost:6379/0
EOF

echo "Backend installed successfully."