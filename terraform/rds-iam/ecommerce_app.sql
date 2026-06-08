-- ===========================================================================
-- RDS IAM auth provisioning for ecommerce-backend
-- ===========================================================================
-- Run ONCE against the `ecommerce` database on the prod-shared Aurora cluster,
-- connected as the master user (`postgres`, password in Secrets Manager
-- `prod-shared-credentials`). The cluster is in-VPC only — run from a bastion,
-- an SSM port-forward, or a one-off in-VPC task.
--
-- ecommerce-backend runs Hibernate with ddl-auto=validate (no DDL at runtime),
-- so this role needs DML only — not schema ownership.
-- ===========================================================================

-- 1. Login role (no password — IAM only).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ecommerce_app') THEN
    CREATE ROLE ecommerce_app WITH LOGIN;
  END IF;
END
$$;

-- 2. Allow IAM token authentication.
GRANT rds_iam TO ecommerce_app;

-- 3. Database + schema access.
GRANT CONNECT ON DATABASE ecommerce TO ecommerce_app;
GRANT USAGE ON SCHEMA public TO ecommerce_app;

-- 4. DML on existing + future objects.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ecommerce_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ecommerce_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ecommerce_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ecommerce_app;

-- 5. Verify.
--   \du ecommerce_app
--   SELECT has_database_privilege('ecommerce_app', 'ecommerce', 'CONNECT');
