#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v docker >/dev/null || { echo 'Docker is required'; exit 1; }
[ -f .env ] || { umask 077; printf 'DB_PASSWORD=%s\nSECRET_KEY=%s\n' "$(openssl rand -hex 32)" "$(openssl rand -hex 48)" > .env; }
docker compose -f compose.yml config --quiet
docker compose -f compose.yml up -d --build
docker compose -f compose.yml ps
curl --fail --retry 10 --retry-delay 2 http://127.0.0.1:8000/health
