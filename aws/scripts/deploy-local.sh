#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Installing dependencies..."
npm install

echo "==> Building shared package..."
npm run build -w @superplane/shared

echo "==> Building services..."
for svc in storage-service search-service upload-redaction-service payment-service analytics-service; do
  npm run build -w "@superplane/$svc"
done

echo "==> Building frontend..."
npm run build -w @superplane/frontend

echo ""
echo "Local dev options:"
echo "  1. Docker:  docker compose up --build"
echo "  2. Native:  npm run dev -w @superplane/storage-service (etc.) in separate terminals"
echo "     Gateway:  docker compose up gateway (or nginx on :8080)"
echo "     Frontend: npm run dev -w @superplane/frontend  -> http://localhost:5173"
echo ""
echo "Smoke test (with docker compose running):"
echo "  curl http://localhost:8080/api/search"
echo "  curl http://localhost:3001/health"
