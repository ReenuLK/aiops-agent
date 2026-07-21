#!/bin/bash

set -e

cd ~/aiops-agent/frontend

cat > .env <<EOF
VITE_API_BASE_URL=http://14.139.187.130:8000
EOF

npm install

npm run build

echo "Frontend build completed."