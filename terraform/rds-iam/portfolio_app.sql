-- ===========================================================================
-- RDS IAM auth provisioning for portfolio-backend
-- ===========================================================================
-- Run ONCE against the `portfolio` database on the prod-shared Aurora cluster,
-- connected as the master user (`postgres`). This creates the IAM-authenticated
-- role the Lambda assumes. It is idempotent where practical.
--
-- The Lambda is in the VPC with no public egress, so run this from somewhere
-- with network reach to the cluster (a bastion/jump host in the VPC, an SSM
-- port-forward session, or a one-off in-VPC task). Connection target:
--   host: prod-shared.cluster-c6zq2wwwkp8z.us-east-1.rds.amazonaws.com
--   port: 5432   db: portfolio   user: postgres (master password from
--         Secrets Manager: prod-shared-credentials)
--
-- A member of the rds_iam role can ONLY authenticate via IAM tokens (never a
-- password), so this role is safe to expose by name.
-- ===========================================================================

-- 1. Create the login role (no password — IAM only).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'portfolio_app') THEN
    CREATE ROLE portfolio_app WITH LOGIN;
  END IF;
END
$$;

-- 2. Allow IAM token authentication for this role (AWS-managed role on RDS/Aurora).
GRANT rds_iam TO portfolio_app;

-- 3. Database + schema access.
GRANT CONNECT ON DATABASE portfolio TO portfolio_app;
GRANT USAGE ON SCHEMA public TO portfolio_app;

-- 4. DML on existing objects. The app runs Hibernate with ddl-auto=validate,
--    so it needs read/write on data but NOT DDL ownership.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO portfolio_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO portfolio_app;

-- 5. Same privileges on objects created in the future (e.g. a later migration).
--    Applies to objects created by the master user.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO portfolio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO portfolio_app;

-- 6. Verify.
--   \du portfolio_app            -- should list "rds_iam" among member-of roles
--   SELECT has_database_privilege('portfolio_app', 'portfolio', 'CONNECT');
