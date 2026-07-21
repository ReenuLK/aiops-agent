#!/bin/bash

set -e

cd ~/aiops-agent/backend

python3 -m venv venv

source venv/bin/activate

pip install --upgrade pip

pip install -r requirements.txt

cat > .env <<EOF
DATABASE_URL=postgresql://aiops:aiops_dev_password@localhost:5432/aiops_db
REDIS_URL=redis://localhost:6379/0
EOF

echo "Backend installed successfully."