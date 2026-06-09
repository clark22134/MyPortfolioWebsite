# Project Working State & Roadmap

> Working/handoff doc for ongoing infra & security work. Keep it current. The
> user's standing global rules still apply (e.g. **never run git commands unless
> explicitly asked** — though for this RDS IAM workflow the user has been
> authorizing PR creation explicitly; re-confirm each time).

## Branch & PR workflow (REQUIRED)

**Do all development work and open all PRs from the `clark-development` branch.**
The goal is to keep `clark-development` always in sync with `main`.

- Do **not** create new feature branches for this work — commit to
  `clark-development` and open PRs from `clark-development` → `main`.
- After a PR merges, **fast-forward `clark-development` back to `main`** so it
  stays current:
  ```
  git fetch origin
  git checkout clark-development
  git merge --ff-only origin/main   # clark-development has no unique commits post-merge
  git push origin clark-development
  ```
- If `clark-development` ever can't fast-forward (it shouldn't, since its commits
  land in `main` via merge), reconcile before continuing — never work on a stale
  branch.
- Deploys still trigger only on merge to `main` (see Deploy below). All the usual
  "explicitly ask before git" etiquette applies; the user has standing approval to
  commit/push/PR **on `clark-development`** for this workflow.

## Architecture (one monorepo, three apps + a chatbot)

- **portfolio** (clarkfoster.com), **ecommerce** (shop.clarkfoster.com), **ats** —
  each = Angular 21 frontend + Spring Boot 3.5.14 / Java 21 backend, deployed as
  an **AWS Lambda (SnapStart)** behind **API Gateway → CloudFront**.
- **portfolio-chatbot-backend** — RAG chatbot, separate Lambda **outside the VPC**
  (so it can reach api.openai.com). The canonical chatbot lives here; the old
  duplicate copy was removed from portfolio-backend this session.
- Shared **Aurora Serverless v2 PostgreSQL** cluster `prod-shared` (one cluster,
  three databases: `portfolio`, `ecommerce`, `ats`).
- **Deploy = push to `main`** → GitHub Actions `deploy-production.yml`: quality
  gates → `terraform apply` (secrets injected as `TF_VAR_*` from GitHub Secrets)
  → build jars → S3 (`prod-lambda-deployments-<acct>`) → `lambda
  update-function-code` → `publish-version` → alias shift. **No local
  `terraform apply`** (secrets only exist in CI). `main` is NOT branch-protected.

## Verified environment facts (us-east-1, account 010438493245, env `prod`)

- Aurora cluster `prod-shared`: Aurora PostgreSQL **15.17**, Serverless v2
  - resource id `cluster-WI6AY6X3CBFXCMUDXZADOOC3BI`
  - endpoint `prod-shared.cluster-c6zq2wwwkp8z.us-east-1.rds.amazonaws.com`
  - cluster ARN `arn:aws:rds:us-east-1:010438493245:cluster:prod-shared`
- Master secret `prod-shared-credentials`
  ARN `arn:aws:secretsmanager:us-east-1:010438493245:secret:prod-shared-credentials-flwd0N`
- Lambdas: `prod-portfolio-backend`, `prod-ecommerce-backend`, `prod-ats-backend`,
  `prod-portfolio-chatbot`. Backends run **in private subnets**.
- **VPC has NO NAT and NO VPC endpoints** → in-VPC Lambdas cannot reach public AWS
  APIs (Secrets Manager is unreachable from them). This is *why* DB auth uses RDS
  IAM (token is signed locally, no API call) instead of Secrets-Manager-at-runtime.
- GitHub Secrets present: `ADMIN_PASSWORD, ATS_JWT_SECRET, AWS_ACCOUNT_ID,
  AWS_ROLE_ARN, ECOMMERCE_JWT_SECRET, OPENAI_API_KEY, PORTFOLIO_JWT_SECRET,
  SES_SMTP_PASSWORD, SES_SMTP_USERNAME, SONAR_TOKEN`. (ats demo-account passwords
  intentionally absent → demo seeding stays off.)
- Local toolchain: Maven runs on **JDK 26** (`JAVA_HOME=/opt/homebrew/Cellar/openjdk/26.0.1/libexec/openjdk.jdk/Contents/Home`);
  tests pass under it via the surefire experimental flags. Terraform **v1.15.5**
  (`fmt`/`validate` work; `validate` needs `init -backend=false`). The user is
  authenticated for **read-only + targeted** AWS CLI use.

## ACTIVE WORKFLOW: RDS IAM database authentication

Goal: remove plaintext `DB_PASSWORD` from Lambda env; authenticate to Aurora with
short-lived IAM tokens. (Resolves audit finding "Infra H1".)

### Design — env-driven dual mode (same artifact, zero-downtime cutover)
- App deps: `software.amazon.jdbc:aws-advanced-jdbc-wrapper:2.6.0` +
  `software.amazon.awssdk:rds` (BOM-managed). Prod driver is
  `${DB_DRIVER_CLASS:org.postgresql.Driver}`; url/username/password from env.
- **Password mode (default)**: `jdbc:postgresql://…`, master creds, `DB_PASSWORD` set.
- **IAM mode**: `SPRING_DATASOURCE_URL=jdbc:aws-wrapper:postgresql://HOST:5432/DB?wrapperPlugins=iam&sslmode=require`,
  `DB_DRIVER_CLASS=software.amazon.jdbc.Driver`, `DB_USERNAME=<app>_app`, NO `DB_PASSWORD`.
- Per-app Terraform flag `var.<app>_db_iam_auth` (default **false**); when true the
  lambda module attaches an `rds-db:connect` policy and the env switches to IAM mode.
- Provisioning SQL: `terraform/rds-iam/{portfolio,ecommerce,ats}_app.sql`.
- **Data API** (`var.enable_data_api`, default **false** + `apply_immediately`):
  a public endpoint used only to run provisioning SQL with no bastion; enable
  transiently, then disable. Cluster also has `iam_database_authentication_enabled = true`.
- Full procedure: `terraform/RDS_IAM_AUTH_RUNBOOK.md`.

### Status
- ✅ **PR #262** (merged/deployed): all session fixes + IAM scaffolding (3 backends,
  flags off) + enabled cluster IAM auth & Data API.
- ✅ Cluster IAM auth was *pending* after apply (no `apply_immediately`); flushed via
  `aws rds modify-db-cluster --enable-iam-database-authentication --apply-immediately`.
- ✅ `portfolio_app` role provisioned via Data API (member of `rds_iam`, CONNECT on
  `portfolio`, DML on 16 tables).
- ✅ **PR #266** (merged/deployed): **portfolio cutover** (`TF_VAR_portfolio_db_iam_auth=true`)
  + gated Data API off (`var.enable_data_api` default false) + `apply_immediately`.
- ✅ **PORTFOLIO CUTOVER VERIFIED**: HikariCP opened a wrapper/IAM connection (logs),
  `DB_PASSWORD` removed, Data API off, `GET https://clarkfoster.com/api/projects`
  returns real DB JSON (200). Portfolio now uses IAM tokens, no password.
- ✅ **`ecommerce_app` role provisioned (this session)** via Data API: LOGIN +
  `rds_iam`, CONNECT on `ecommerce`, full DML on all **9** public tables
  (product_category, product, country, state, address, customer, orders,
  order_item, cart_item) + `ALTER DEFAULT PRIVILEGES`. Data API was enabled with
  `aws rds enable-http-endpoint`, used, then **re-disabled** with
  `aws rds disable-http-endpoint` (confirmed off).
- ✅ **PR #269 (merged/deployed): ECOMMERCE CUTOVER VERIFIED** — Lambda env in IAM
  mode (`DB_USERNAME=ecommerce_app`, wrapper URL + `software.amazon.jdbc.Driver`,
  `DB_PASSWORD` removed); CloudWatch shows HikariCP `Added connection
  software.amazon.jdbc.wrapper.ConnectionWrapper` post-deploy (plain `PgConnection`
  pre-deploy), no auth errors; `GET https://shop.clarkfoster.com/api/products`
  returns real DB JSON (200). ecommerce now uses IAM tokens, no password.
- ✅ **`ats_app` role provisioned (this session)** via Data API: LOGIN + `rds_iam`,
  CONNECT on `ats`, USAGE+CREATE on `public`, and **OWNS all 10 tables + 8 sequences**
  (incl. `flyway_schema_history`) via `REASSIGN OWNED` so Flyway can run DDL as
  `ats_app`. No pending Flyway migrations (history v1-baseline..v5 all success).
  Data API enabled → used → re-disabled (confirmed off).
- ✅ **PR #270 (merged/deployed): ATS CUTOVER VERIFIED** — Lambda env in IAM mode
  (`DB_USERNAME=ats_app`, wrapper URL + `software.amazon.jdbc.Driver`, `DB_PASSWORD`
  removed); CloudWatch shows **Flyway ran cleanly as `ats_app`** post-deploy (no
  permission/ownership/DDL errors) + HikariCP `Added connection
  software.amazon.jdbc.wrapper.ConnectionWrapper` (plain `PgConnection` pre-deploy);
  `POST https://ats.clarkfoster.com/api/auth/login` (bad creds) → **401** = live DB
  read via IAM (would be 500 if broken), `/api/health` 200.
- 🎉 **ALL THREE APPS MIGRATED** — portfolio + ecommerce + ats all use RDS IAM
  tokens; **zero plaintext DB passwords** in any Lambda env. **Audit finding Infra
  H1 fully resolved.**

### Remaining IAM work
1. **Soak portfolio + ecommerce + ats** (cold starts / token refresh over real traffic).
   Benign log noise: HikariCP `connection has been closed` / `thread starvation` =
   normal Lambda freeze/thaw; wrapper mints a fresh token on the next connection.
2. **Optional: rotate the Aurora master password** — now safe; no app depends on it
   at runtime. Still used as break-glass + for Data API provisioning. (`DB_PASSWORD`
   plumbing remains in Terraform's password-mode branch for instant rollback.)

### Repeatable cutover procedure (per app)
```bash
CLUSTER_ARN=arn:aws:rds:us-east-1:010438493245:cluster:prod-shared
SECRET_ARN=arn:aws:secretsmanager:us-east-1:010438493245:secret:prod-shared-credentials-flwd0N
# 1) Transiently enable the Data API DIRECTLY via CLI (no deploy needed). NOTE:
#    `modify-db-cluster --enable-http-endpoint` is a SILENT NO-OP on Aurora
#    Serverless v2/provisioned — use the dedicated endpoint commands instead:
aws rds enable-http-endpoint --region us-east-1 --resource-arn "$CLUSTER_ARN"
#    (or, the GitOps way: set TF_VAR_enable_data_api=true and merge a deploy.)
# 2) Provision the role (Data API; public endpoint, no VPC needed), one stmt/call:
aws rds-data execute-statement --region us-east-1 --resource-arn "$CLUSTER_ARN" \
  --secret-arn "$SECRET_ARN" --database <DB> --sql "<one statement>"
# 3) Disable the Data API again (mirror of step 1) and confirm it's off:
aws rds disable-http-endpoint --region us-east-1 --resource-arn "$CLUSTER_ARN"
# 4) Cutover: add TF_VAR_<app>_db_iam_auth: "true" to deploy-production.yml env, merge.
# 5) Verify: Lambda env has no DB_PASSWORD; CloudWatch shows
#    "HikariPool-1 - Added connection software.amazon.jdbc.wrapper.ConnectionWrapper";
#    hit a DB-backed endpoint (portfolio: /api/projects -> JSON 200).
# Rollback: remove/false TF_VAR_<app>_db_iam_auth, merge -> password mode, same artifact.
```

## FULL ROADMAP (priority order)

1. **IAM migration — ✅ COMPLETE** (portfolio + ecommerce + ats all on IAM tokens;
   Infra H1 resolved). Only optional follow-ups remain: soak + master password rotation.
2. **Dependency CVE remediation PR** (separate; Trivy-surfaced, mostly pre-existing
   on main — NOT introduced by our work):
   - `tomcat-embed-core` HIGH **CVE-2026-34487 / 34483** → override `tomcat.version`
     to **10.1.54** (Spring Boot 3.5.14 ships 10.1.53) in the backends.
   - ats `commons-lang3` **CVE-2025-48924** → 3.18.0; ats criticals **CVE-2025-66516**
     (fix 3.2.2) and **CVE-2025-31672** (fix 5.4.0) — identify the libs.
   - Frontends: ecommerce lockfile **CVE-2026-33671** (HIGH), portfolio `uuid` → 14,
     ats-frontend base image → `npm audit fix` / base image bump.
   - Note: a Trivy scan saw a **stale `app.jar` on Spring Boot 3.4.4 / Tomcat
     10.1.39** (CRITICALs) — current source is 3.5.14; confirm what's actually
     deployed vs source.
3. **Remaining audit findings** (from this session's audit; none yet done):
   - Infra **H2/M3**: CI deploy-role IAM wildcards (`terraform/main.tf` ~771-821) — scope down.
   - Infra **H3**: hardcoded dev creds in `ats-db` / `ecommerce-db` Dockerfiles.
   - Infra **M1**: containers run as root (all Dockerfiles); **M2**: unpinned base tags.
   - Infra **M4**: OpenAI key plaintext in chatbot Lambda env — chatbot is *outside*
     the VPC, so Secrets-Manager-at-runtime IS feasible there.
   - Backend **M2**: inconsistent security config (CORS/CSRF, `JwtUtil` vs `JwtUtils`)
     across modules — standardize.
   - Backend **L1**: `printStackTrace` in `StreamLambdaHandler`s; **L2**: unbounded
     in-memory rate-limiter map in portfolio-chatbot-backend.
   - Frontend **M3**: duplicated auth guard (ecommerce/portfolio); **M4**: portfolio
     missing specs for ~12 components (interactive projects, a11y service).

## Completed this session (merged in PR #262 unless noted)

- **Security**: removed committed ecommerce JWT secret + `keystore.p12` (local dev →
  HTTP); checkout **server-side re-pricing** (`InvalidPurchaseException` → 400) so
  tampered orders are rejected; cart `@Valid` + `ConstraintViolation` → 400; ats
  catch-all exception handler; **portfolio auth-guard race fix** (`whenReady()`);
  ecommerce checkout UX (submit guard + inline error, no `alert()`); ecommerce
  product-list error state + `takeUntilDestroyed`; ecommerce CSP dropped
  `script-src 'unsafe-inline'`.
- **Currency/cleanup**: AWS SDK v2 `2.20.162 → 2.34.0` (BOM); `postgresql 42.7.11`
  (CVE-2026-42198); **removed dead duplicate chatbot from portfolio-backend** (canonical
  in portfolio-chatbot-backend; dropped Spring AI + webflux → smaller/faster Lambda);
  `npm install → npm ci` (portfolio-frontend); removed obsolete compose `version`.
- Local test baselines (JDK 26): portfolio-backend 171, ats-backend 222,
  ecommerce-backend 84, portfolio-frontend 246, ecommerce-frontend 199 — all green.

## Gotchas / operational notes

- Cluster setting changes go to `PendingModifiedValues` unless `apply_immediately =
  true` (now set on the cluster). Flush a stuck pending change with
  `aws rds modify-db-cluster … --apply-immediately`.
- **Data API toggle gotcha**: on this Aurora **Serverless v2/provisioned** cluster,
  `aws rds modify-db-cluster --enable-http-endpoint` is a **silent no-op** (returns
  exit 0, `HttpEndpointEnabled` stays false, no error — that param is Serverless
  **v1** only). Use the dedicated `aws rds enable-http-endpoint` /
  `disable-http-endpoint --resource-arn <cluster-arn>` instead. (Terraform's
  `enable_http_endpoint` works because the provider routes to the right API.) The
  newer `VPCNetworkingEnabled: true` / `serverlessV2PlatformVersion: "4"` cluster
  attributes are unrelated red herrings.
- **Data API warm-up flakiness**: for ~60-90s after `enable-http-endpoint`,
  `rds-data execute-statement` calls intermittently throw
  `HttpEndpointNotEnabledException` even though the toggle is on. Wrap provisioning
  calls in a retry-with-backoff loop (re-poll on that exception). Also: the Data API
  can't serialize a bare `char` column (`relkind`) — cast it (`relkind::text`) or
  avoid selecting it (`UnsupportedResultException: unsupported data type "CHAR"`).
- **`REASSIGN OWNED` on Aurora**: the master user is `rds_superuser`, **not** a real
  superuser, so `REASSIGN OWNED BY postgres TO <role>` fails with `permission denied
  to reassign objects` (42501). Fix: `GRANT <role> TO postgres;` first (so postgres
  holds both roles' privileges), run the REASSIGN, then `REVOKE <role> FROM postgres;`.
  `ats_app.sql` now encodes this. The PG15 `public` schema is owned by
  `pg_database_owner` (not postgres), so REASSIGN leaves the schema itself alone.
- Trivy (GitHub Advanced Security) parses `pom.xml` statically and does **not**
  resolve Spring-managed/property versions — use **literal** `<version>` to satisfy
  it (we pinned postgresql literally for this reason).
- The IAM token is generated by the wrapper via **local SigV4 signing** — no network
  call — which is the whole reason it works from the egress-less VPC.
- Cost: the IAM-auth work adds **$0 recurring**; the Data API is the only public-path
  expansion and is gated off by default.
- Branching: all work & PRs go on **`clark-development`** (see "Branch & PR
  workflow" at top); fast-forward it to `main` after each merge. (History note:
  PR #262 was `clark-development`; #266/#267 used a temporary
  `clark-rds-iam-cutover-portfolio` branch — going forward, use `clark-development`.)
