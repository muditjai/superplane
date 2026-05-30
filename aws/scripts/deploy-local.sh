#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Installing dependencies..."
npm install

echo "==> Building mock services..."
for svc in storage-service search-service upload-redaction-service payment-service analytics-service; do
  npm run build -w "@superplane/$svc"
done

echo ""
echo "Local dev:"
echo "  docker compose up --build   -> http://localhost:8080/"
echo ""
echo "Smoke tests (with docker compose running):"
echo "  curl http://localhost:8080/gateway-health.json"
echo "  curl http://localhost:8080/services/storage-service/health"
echo "  curl http://localhost:3001/version"
