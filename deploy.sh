#!/bin/bash
# Deploy MCP v0 server to the GCP VM
set -e

HOST="${1:-mcp.bridgestack.systems}"
DEPLOY_DIR="/opt/mcp-v0-server"

echo "Deploying to $HOST..."

# Sync code
rsync -avz --exclude='node_modules' --exclude='dist' --exclude='.env' \
  ./ "nayana@${HOST}:${DEPLOY_DIR}/"

# Install deps + build on remote
ssh "nayana@${HOST}" "cd ${DEPLOY_DIR} && npm install && npm run build && \
  cd v0-bridge && npm install && \
  echo 'Build complete'"

# Install systemd services
ssh "nayana@${HOST}" "sudo cp ${DEPLOY_DIR}/systemd/*.service /etc/systemd/system/ && \
  sudo systemctl daemon-reload && \
  sudo systemctl enable v0-bridge mcp-v0-server && \
  sudo systemctl restart v0-bridge && \
  sleep 2 && \
  echo 'Services installed and started'"

echo "Done. v0-bridge: http://${HOST}:3100/health"
