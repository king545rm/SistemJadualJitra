#!/bin/bash
# ASTS dev server launcher — ensures correct Supabase DATABASE_URL is used
# (overrides any stale shell env var from the SQLite era)

export DATABASE_URL="postgresql://postgres.naojxsvfrnxbodpznbzq:Rmsupa1062%21%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
export SESSION_SECRET="asts-supabase-prod-secret-key-32chars-min!"

exec bun run dev
