-- ===========================================================================
-- RDS IAM auth provisioning for ats-backend  (FLYWAY — read the warning)
-- ===========================================================================
-- Run ONCE against the `ats` database on the prod-shared Aurora cluster,
-- connected as the master user (`postgres`, password in Secrets Manager
-- `prod-shared-credentials`). The cluster is in-VPC only — run from a bastion,
-- an SSM port-forward, or a one-off in-VPC task.
--
-- ats-backend runs **Flyway at startup as the datasource user**. Flyway creates
-- its flyway_schema_history table and may ALTER existing tables, so ats_app
-- needs CREATE on the schema AND ownership of the existing objects (only the
-- owner can ALTER/DROP a table). This is why ats is the trickiest of the three
-- and should be migrated last and deliberately.
--
-- IMPORTANT: You MUST be connected to the `ats` database (not `postgres`) when
-- running this — REASSIGN OWNED acts on the current database only.
-- ===========================================================================

-- 1. Login role (no password — IAM only).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ats_app') THEN
    CREATE ROLE ats_app WITH LOGIN;
  END IF;
END
$$;

-- 2. Allow IAM token authentication.
GRANT rds_iam TO ats_app;

-- 3. Database + schema access. CREATE is required for Flyway DDL + history table.
GRANT CONNECT ON DATABASE ats TO ats_app;
GRANT USAGE, CREATE ON SCHEMA public TO ats_app;

-- 4. Hand ownership of the existing app objects to ats_app so Flyway migrations
--    can ALTER/DROP them. This reassigns every object currently owned by the
--    master user IN THE ats DATABASE to ats_app. Review what postgres owns here
--    first if you are unsure:
--      SELECT relname, relkind FROM pg_class c
--      JOIN pg_roles r ON r.oid = c.relowner
--      WHERE r.rolname = 'postgres' AND relkind IN ('r','S','v','m');
--
--    AURORA GOTCHA: the master user is `rds_superuser`, NOT a real superuser, so
--    REASSIGN OWNED requires it to hold the privileges of BOTH the old and new
--    roles. Without the line below it fails with
--    "permission denied to reassign objects" (SQLState 42501). Grant ats_app to
--    postgres for the reassign, then revoke it afterward to keep the role graph clean.
GRANT ats_app TO postgres;
REASSIGN OWNED BY postgres TO ats_app;
REVOKE ats_app FROM postgres;

-- 5. Belt-and-suspenders DML grants (redundant for owned objects, but cover any
--    objects not owned by postgres, and future ones).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ats_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ats_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ats_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ats_app;

-- 6. Verify.
--   \du ats_app
--   SELECT tableowner FROM pg_tables WHERE schemaname = 'public' LIMIT 5;  -- -> ats_app
-- ===========================================================================
-- Rollback note: reverting ats to password auth (flag false) keeps working —
-- the master user retains superuser access regardless of object ownership.
-- ===========================================================================
