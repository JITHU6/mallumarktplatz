#!/usr/bin/env bash
# Runs the database security tests against the local Supabase stack.
set -euo pipefail
DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -At -f "$(dirname "$0")/rls.test.sql"
echo "All database tests passed."
