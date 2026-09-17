-- Migration: 20260917000002_drop_users_table
-- Purpose: Deprecate legacy user authentication table (Destructive Operation)
-- Type: Destructive DDL (Irreversible Data Deletion)
-- Expected Guardian Verdict: DANGER (Must be blocked with HTTP 403 in production)

DROP TABLE IF EXISTS "users" CASCADE;
