#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-node}"

if [ ! -f .env.local ]; then
  echo "❌ Missing .env.local. Copy .env.production.example or .env.demo first."
  exit 1
fi

case "$MODE" in
  node)
    npm install --legacy-peer-deps --no-audit --no-fund
    npm run type-check
    npm run build
    npm run start
    ;;
  docker)
    docker compose up --build
    ;;
  check)
    npm install --legacy-peer-deps --no-audit --no-fund
    npm run final:verify
    ;;
  *)
    echo "Usage: ./scripts/deploy-local.sh [node|docker|check]"
    exit 1
    ;;
esac
