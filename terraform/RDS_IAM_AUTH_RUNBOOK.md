# RDS IAM Database Authentication — Migration Runbook

Replaces the plaintext `DB_PASSWORD` Lambda environment variable with **RDS IAM
database authentication**. The app obtains a short-lived auth token by
SigV4-signing **locally** (no network call), so this works from inside the VPC
where the Secrets Manager API is unreachable (no NAT, no VPC endpoint).

This rolls out as a **canary on `portfolio-backend` first**. Once verified, the
same pattern is replicated to `ecommerce-backend` and `ats-backend`.

## How it works (zero-downtime, env-driven dual mode)

The prod artifact is identical in both modes — auth is selected entirely by
environment variables, so cutover and rollback are **Terraform-only env flips**
with no code redeploy and no broken window:

| Env (set by Terraform) | Password mode (`portfolio_db_iam_auth = false`) | IAM mode (`= true`) |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://…/portfolio` | `jdbc:aws-wrapper:postgresql://…/portfolio?wrapperPlugins=iam&sslmode=require` |
| `DB_DRIVER_CLASS` | (unset → `org.postgresql.Driver`) | `software.amazon.jdbc.Driver` |
| `DB_USERNAME` | `postgres` (master) | `portfolio_app` (IAM role) |
| `DB_PASSWORD` | master password | (absent) |

The `aws-advanced-jdbc-wrapper` (added to the classpath) only activates for the
`jdbc:aws-wrapper:` URL scheme; otherwise the plain PostgreSQL driver is used.

## Verified environment facts (read-only, 2026-06)

- Account `010438493245`, region `us-east-1`, env `prod`
- Cluster `prod-shared`, Aurora PostgreSQL 15.17, resource id
  `cluster-WI6AY6X3CBFXCMUDXZADOOC3BI`, endpoint
  `prod-shared.cluster-c6zq2wwwkp8z.us-east-1.rds.amazonaws.com`
- Lambda `prod-portfolio-backend`, role `prod-portfolio-backend-lambda-role`,
  currently connecting as `postgres` with a password
- IAM DB auth on the cluster: **currently disabled** (Step 1 enables it)
- Resulting connect ARN:
  `arn:aws:rds-db:us-east-1:010438493245:dbuser:cluster-WI6AY6X3CBFXCMUDXZADOOC3BI/portfolio_app`

## What's already in this change set

- App: `aws-advanced-jdbc-wrapper` + `software.amazon.awssdk:rds` added;
  `application-prod.properties` driver is now `${DB_DRIVER_CLASS:org.postgresql.Driver}`.
  **Default (password) behavior is unchanged** — verified by the full test suite.
- Terraform: cluster `iam_database_authentication_enabled = true` (additive);
  `cluster_resource_id` output; lambda-module conditional `rds-db:connect`
  policy; `portfolio_db_iam_auth` / `portfolio_db_iam_user` variables (default
  off). With the flag **off, `terraform apply` only enables cluster IAM auth and
  changes nothing about how the apps authenticate.**

## Deploy procedure

### Step 0 — Ship the code (no behavior change)
Merge & deploy the new jar. With `portfolio_db_iam_auth = false` (default) the
Lambda still uses password auth. The wrapper sits inert on the classpath.

### Step 1 — Enable cluster IAM auth (additive, no impact)
```
terraform apply   # picks up iam_database_authentication_enabled = true
```
Enabling IAM auth on Aurora PostgreSQL is applied without downtime and does not
affect existing password connections. Confirm:
```
aws rds describe-db-clusters --region us-east-1 \
  --query "DBClusters[?DBClusterIdentifier=='prod-shared'].IAMDatabaseAuthenticationEnabled"
# -> [ true ]
```

### Step 2 — Create the IAM DB role (one-time, via RDS Data API)
The cluster has the **RDS Data API** enabled (`enable_http_endpoint = true`),
whose endpoint is a public AWS API — so the provisioning SQL runs with no
bastion or in-VPC compute. Run each statement in `terraform/rds-iam/portfolio_app.sql`
with:
```
CLUSTER_ARN=arn:aws:rds:us-east-1:010438493245:cluster:prod-shared
SECRET_ARN=arn:aws:secretsmanager:us-east-1:010438493245:secret:prod-shared-credentials-flwd0N

aws rds-data execute-statement --region us-east-1 \
  --resource-arn "$CLUSTER_ARN" --secret-arn "$SECRET_ARN" \
  --database portfolio \
  --sql "CREATE ROLE portfolio_app WITH LOGIN;"
# ...then GRANT rds_iam, GRANT CONNECT/USAGE, the DML grants, and ALTER DEFAULT
# PRIVILEGES — one --sql per statement (Data API runs one statement per call).
```
The caller (your IAM principal) needs `rds-data:ExecuteStatement` and
`secretsmanager:GetSecretValue` on the secret. This creates `portfolio_app`
with `rds_iam` + DML privileges. (The Data API can be disabled again after all
apps are provisioned.)

### Step 3 — Cutover (canary)
Deploys are CI-only (`terraform apply` runs inside `deploy-production.yml` with
the secrets injected as `TF_VAR_*`), so flip the flag by adding one line to that
workflow's `env:` block, then merge to `main`:
```yaml
# .github/workflows/deploy-production.yml, in the terraform job's env:
TF_VAR_portfolio_db_iam_auth: "true"
```
(This is a plain literal, not a GitHub secret.) The resulting `terraform apply`
swaps the URL to the wrapper scheme, sets `DB_DRIVER_CLASS`, switches
`DB_USERNAME` to `portfolio_app`, **removes `DB_PASSWORD`**, and attaches the
`rds-db:connect` policy. New Lambda execution environments pick it up immediately.

### Step 4 — Verify
```
# Plaintext DB password is gone from the function config:
aws lambda get-function-configuration --function-name prod-portfolio-backend \
  --region us-east-1 --query "Environment.Variables.DB_PASSWORD"   # -> null

# App health + a DB-backed endpoint:
curl -fsS https://clarkfoster.com/api/health
```
Also check CloudWatch logs for a clean HikariCP start (no auth errors). A first
cold start may be slightly slower while the token is generated and cached.

### Rollback (instant, no redeploy)
Remove the `TF_VAR_portfolio_db_iam_auth` line (or set it to `"false"`) and merge
— the next apply restores password auth on the same artifact. For an emergency
rollback without waiting for CI, set the env directly:
```
aws lambda update-function-configuration --function-name prod-portfolio-backend \
  --region us-east-1 --environment "Variables={...,DB_PASSWORD=<master>,...}"
# then reconcile Terraform afterwards.
```
(Optionally drop the role later:
`DROP ROLE portfolio_app;` and revert the cluster flag once all apps are migrated.)

## Hardening follow-ups (optional)
- **`sslmode=verify-full`**: stronger than `require` (validates the server cert).
  Requires bundling the RDS global CA (`global-bundle.pem`) into the image and
  pointing `sslrootcert` at it. `require` already encrypts in transit.
- After all three apps migrate, remove `DB_PASSWORD` plumbing entirely and
  consider rotating the master password (kept only for break-glass/admin).

## All three apps are wired (default off)

The same env-driven mechanism is now in place for **portfolio**, **ecommerce**,
and **ats**, each gated by its own flag (`portfolio_db_iam_auth`,
`ecommerce_db_iam_auth`, `ats_db_iam_auth` — all default `false`) and its own IAM
role (`portfolio_app`, `ecommerce_app`, `ats_app`). The cluster IAM-auth flag
(Step 1) and the `aws-advanced-jdbc-wrapper` dependency are shared/done.

To migrate an app, run its cutover independently:

| App | Provisioning SQL | DB | Cutover (add to deploy-production.yml env, then merge) |
|---|---|---|---|
| portfolio | `terraform/rds-iam/portfolio_app.sql` | `portfolio` | `TF_VAR_portfolio_db_iam_auth: "true"` |
| ecommerce | `terraform/rds-iam/ecommerce_app.sql` | `ecommerce` | `TF_VAR_ecommerce_db_iam_auth: "true"` |
| ats | `terraform/rds-iam/ats_app.sql` | `ats` | `TF_VAR_ats_db_iam_auth: "true"` |

Verify each the same way as Step 4, against the matching function
(`prod-ecommerce-backend`, `prod-ats-backend`) and a DB-backed endpoint.

> **Migrate ats LAST and deliberately.** It runs Flyway at startup *as the
> datasource user*, so `ats_app` needs `CREATE` on `public` and **ownership** of
> the existing tables (only the owner can ALTER/DROP). `ats_app.sql` uses
> `REASSIGN OWNED BY postgres TO ats_app` to hand the schema over — review what
> `postgres` owns in the `ats` database before running it. portfolio and
> ecommerce use `ddl-auto=validate` (no runtime DDL) and need DML only, so they
> are lower-risk — do those first.
