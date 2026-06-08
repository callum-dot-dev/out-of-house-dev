#!/usr/bin/env bash
set -euo pipefail
# Local dev stack: Postgres (docker) -> migrate -> seed -> api + jobs + web.
# Requires Docker + a `.env` at the workspace root (copy from .env.example).
# Note: `migrate`/`seed` become real in Phase 1.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Starting Postgres (docker)…"
docker start ooh-postgres 2>/dev/null || docker run -d --name ooh-postgres \
  -e POSTGRES_USER=ooh -e POSTGRES_PASSWORD=ooh -e POSTGRES_DB=ooh \
  -p 5432:5432 postgres:16

echo "==> Waiting for Postgres to accept connections…"
until docker exec ooh-postgres pg_isready -U ooh >/dev/null 2>&1; do sleep 1; done

echo "==> Migrating + seeding…"
npm run migrate
npm run seed

echo "==> Starting api + jobs + web (concurrently)…"
npm run dev
