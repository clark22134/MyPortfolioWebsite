# Project Working State & Roadmap

> Working/handoff doc for ongoing infra & security work. Keep it current. The
> user's standing global rules still apply (e.g. **never run git commands unless
> explicitly asked** — though for this RDS IAM workflow the user has been
> authorizing PR creation explicitly; re-confirm each time).

## CURRENT STATE (read first)

- ✅ **RDS IAM migration COMPLETE** — portfolio + ecommerce + ats all authenticate to
  Aurora with short-lived IAM tokens (no plaintext `DB_PASSWORD`); deployed +
  smoke-verified. Audit finding **Infra H1** resolved. (Mechanism/runbook below.)
- ✅ **Dependency CVE remediation COMPLETE** — PR #271 merged + deployed + smoke-verified
  (Tomcat 10.1.54 in all 4 backends; ats Tika 3.2.2 / POI 5.4.0 / commons-lang3 3.18.0;
  frontends `npm audit` clean). Roadmap **#2** done.
- ✅ **Security hardening + repo cleanup (PR #273) — MERGED** (deploy triggers on merge
  to `main`). `clark-development` has been fast-forwarded to `main` and pushed, so it is
  back in sync (the held docs-only commits all landed in #273). Cleared a first batch of
  roadmap **#3** findings plus both loose ends:
  - **Infra H3** — removed baked-in dev DB passwords from `ats-db`/`ecommerce-db`
    Dockerfiles (compose already injects them via `${…:?}`, so it's fail-closed, not a
    behavior change — no image ships a known default credential).
  - **Backend L1** — `e.printStackTrace()` → SLF4J `log.error(…)` in all 4
    `StreamLambdaHandler`s (chatbot handler gained a logger field).
  - **Backend L2** — bounded the chatbot's per-IP rate-limiter `ConcurrentHashMap`
    (`chatbot.rate-limit.max-tracked-ips`, default 10000): at the cap it evicts expired
    windows, then fails closed for new IPs — closes the `X-Forwarded-For` memory-exhaustion
    vector. New isolated test `PortfolioAssistantControllerRateLimitBoundTest` (chatbot
    baseline **11 → 12**).
  - **Loose end #2 (`.gitignore`)** — DONE: ignored `ats-frontend/coverage/` (+ a new
    Chatbot section for `portfolio-chatbot-backend/target/`) and `git rm --cached`'d the
    154 tracked artifacts (59 coverage + 95 target).
  - **Loose end #1 (held docs commits)** — the 2 held docs-only commits (752d62a, 699691e)
    landed in #273.
- ✅ **Infra M4 — chatbot OpenAI key → Secrets Manager at runtime (PR #__M4__) — built +
  tested locally** (awaiting merge/deploy at time of writing). The chatbot Lambda now
  fetches the OpenAI key from Secrets Manager **at startup** instead of receiving it as a
  plaintext `OPENAI_API_KEY` env var, so the key no longer appears in
  `lambda:GetFunctionConfiguration` output. Most of the infra already existed (secret
  `prod/portfolio/openai-api-key`, the `GetSecretValue` grant via `extra_secret_arns`, and
  the `OPENAI_SECRET_ARN` env var); the only gap was that Terraform *also* injected the
  plaintext value. Details in the new **"Infra M4 — chatbot OpenAI key in Secrets Manager"**
  section below. Chatbot test baseline **12 → 20**.
- ▶️ **NEXT WORK**: remaining roadmap **#3** findings (H2/M3 IAM wildcards, M1 non-root,
  M2 pin base tags, Backend M2 security-config standardization, Frontend M3/M4 — see FULL
  ROADMAP). H2/M3 is the highest-value item left but is **risky to do blind** (a wrong IAM
  scope breaks *all* future deploys and can't be deploy-tested locally). M1/M2 are lower
  priority: **Dependabot already tracks base-image bumps** (many `dependabot/docker/*`
  branches open), and Docker images are **local-dev only** (prod runs as Lambda jars), so
  they ship no prod attack surface.
- Optional IAM follow-ups (not blocking): soak; rotate the Aurora master password.

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
- If `clark-development` can't fast-forward, it has un-merged commits — reconcile
  before continuing, never work on a stale branch. (As of the M4 PR, `clark-development`
  **is** in sync with `main` — the previously-held docs commits all merged in #273. Next
  session: after the M4 PR merges, `git fetch && git merge --ff-only origin/main` as above.)
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

## RDS IAM database authentication (✅ COMPLETE — kept as reference)

All three apps migrated, deployed, and verified this session (see CURRENT STATE).
Below is the mechanism + runbook, retained for rollback/operations and as the
template for any future DB-auth work. Goal was: remove plaintext `DB_PASSWORD` from
Lambda env; authenticate to Aurora with short-lived IAM tokens. (Resolved Infra H1.)

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

## Infra M4 — chatbot OpenAI key in Secrets Manager (✅ built + tested locally; PR #__M4__)

**Goal:** stop shipping the OpenAI API key as a plaintext `OPENAI_API_KEY` Lambda env var
(readable via `lambda:GetFunctionConfiguration`); have the chatbot fetch it from Secrets
Manager at startup. The chatbot Lambda is **outside the VPC**, so Secrets Manager is
reachable (unlike the in-VPC backends, which is why *those* use RDS IAM instead).

### What already existed (so the change was small)
- Secret `prod/portfolio/openai-api-key` (`aws_secretsmanager_secret.openai_api_key`,
  populated from `var.openai_api_key` → GitHub secret `OPENAI_API_KEY`). **Unchanged.**
- The chatbot Lambda role already had `secretsmanager:GetSecretValue`+`DescribeSecret`
  on that ARN via the lambda module's `extra_secret_arns`. **Unchanged.**
- The Lambda env already had `OPENAI_SECRET_ARN`. **Kept.**
- The gap: Terraform *also* read the secret value at plan time and injected it as the
  plaintext `OPENAI_API_KEY` env var, and the app read `spring.ai.openai.api-key=${OPENAI_API_KEY:}`
  from it.

### The change (files)
- **`OpenAiKeyResolver`** (new, `portfolio-chatbot-backend`): reads `OPENAI_SECRET_ARN` from
  the env; if set, fetches the secret (AWS SDK v2 `SecretsManagerClient` over the
  dependency-light `url-connection-client`) and publishes it as the
  **`spring.ai.openai.api-key` system property**. System properties out-rank
  `application.properties`, so the existing `${OPENAI_API_KEY:}` line and the
  `@ConditionalOnExpression` on `ChatbotConfig`/`KnowledgeIngestionService` keep working
  unchanged. **Fail-soft**: no ARN → no-op/no AWS call (preserves local `export
  OPENAI_API_KEY=…` and CI/test behaviour); fetch fails/empty → log + chatbot auto-disables
  (Lambda still boots, `/api/chatbot/health` reports unavailable). Idempotent (won't
  overwrite a pre-set property).
- **Called from** `StreamLambdaHandler` static init (before `buildAndInitialize()`, so the
  property is set before context refresh / conditional evaluation) **and** `main()`.
- **`pom.xml`**: AWS SDK BOM `2.34.0` imported **before** `spring-ai-bom` (spring-ai-bom
  also manages `software.amazon.awssdk:*` at an older 2.20.x and first-BOM-wins, so ours
  must lead to keep every awssdk submodule on 2.34.0). Added `secretsmanager` (excluding
  both default HTTP clients — `apache-client` sync + `netty-nio-client` async, unused and a
  CVE source) + `url-connection-client`.
- **`terraform/main.tf`**: dropped the plaintext `OPENAI_API_KEY` env var and the now-unused
  `data "aws_secretsmanager_secret_version" "openai_api_key"`. Secret resource + version +
  IAM grant + `OPENAI_SECRET_ARN` all remain.

### Why this is SnapStart-safe
The secret fetch runs once during init (snapshot time, in CI publish), not per-invocation →
~$0, no cold-start hit. The key (shared, not per-instance) lives only in the snapshot, not
in `GetFunctionConfiguration`. `url-connection-client` opens no pooled socket, so nothing
stale is snapshotted (a pooled Apache/Netty client could be — another reason for url-connection).

### Local verification done (JDK 26, sandbox off for network)
- `mvn clean package` green; chatbot tests **20/0/0** (was 12; +8 `OpenAiKeyResolverTest`).
- `dependency:tree` → all `software.amazon.awssdk:*` = **2.34.0**; spring-ai still 1.0.8.
- Shaded jar: contains `SecretsManagerClient` + `UrlConnectionHttpClient` + the
  url-connection `SdkHttpService` SPI file; **0** `io/netty/*`, **0** `org/apache/http/*`.
- `terraform fmt` + `validate` clean.
- NOTE: maven-shade-plugin 3.6.0 chokes on a `<ServicesResourceTransformer/>` block
  (`Cannot find 'resource'`); **not needed here** because the client sets its HTTP client
  explicitly (no SPI auto-discovery) and url-connection's SPI file is the only one of its
  name. Don't re-add that transformer.

### Post-deploy verification (do after merge → deploy)
1. `aws lambda get-function-configuration --function-name prod-portfolio-chatbot --query
   'Environment.Variables'` → **no `OPENAI_API_KEY`** key; `OPENAI_SECRET_ARN` present.
2. Chatbot CloudWatch log at init: `Loaded OpenAI API key from Secrets Manager; not stored
   in the Lambda environment.`
3. `GET https://clarkfoster.com/api/chatbot/health` → chatbot reports available; a real
   chat request returns a grounded answer (confirms the key resolved + Spring AI beans wired).
- **Rollback** (if needed): restore the `OPENAI_API_KEY` env line (+ the data source) in
  `terraform/main.tf` and merge — the app still honours `${OPENAI_API_KEY:}`, so it reverts
  to env-var mode with the same artifact.

## FULL ROADMAP (priority order)

1. **IAM migration — ✅ COMPLETE** (portfolio + ecommerce + ats all on IAM tokens;
   Infra H1 resolved). Only optional follow-ups remain: soak + master password rotation.
2. **Dependency CVE remediation — ✅ DONE — PR #271 (merged + deployed + smoke-verified)**. All verified
   against NVD/advisories and locally built+tested before committing:
   - **Backends — `<tomcat.version>10.1.54</tomcat.version>` in all 4 poms** (portfolio,
     ecommerce [pulls Tomcat transitively via `starter-data-rest`], ats, chatbot):
     CVE-2026-34487 / CVE-2026-34483 (Spring Boot 3.5.14 ships 10.1.53). `dependency:tree`
     confirms 10.1.54; all backend test baselines hold (portfolio 171, ecommerce 84,
     ats 222, chatbot 11).
   - **ats-backend libs**: `tika-core` 3.0.0→**3.2.2** (CVE-2025-66516, critical XXE in
     tika-core), `poi-ooxml` 5.3.0→**5.4.0** (CVE-2025-31672), pinned `commons-lang3`
     **3.18.0** (CVE-2025-48924, transitive via POI). ResumeParserServiceTest green.
   - **Frontends**: `npm audit fix` (non-force, lockfile-only — no `package.json` change)
     cleared **all** vulns to **0** in all three. The real HIGHs were **fast-uri** ≤3.1.1
     (path traversal / host confusion — the "CVE-2026-33671" in all 3) and **path-to-regexp**
     ReDoS (ecommerce). `uuid`→14 was stale (not a direct dep; audit clean). Builds +
     tests pass (portfolio 246, ecommerce 199, ats 148). ⚠️ Gotcha: sandboxed `npm audit`
     silently reports "0 vulnerabilities" — must run with network to get real results.
   - **Stale `app.jar` (SB 3.4.4 / Tomcat 10.1.39)** was a scan artifact, not source
     (source is 3.5.14); the next deploy rebuilds from patched source → resolves itself.
   - Docker base-image bumps deferred to roadmap #3 (Infra M1/M2), not CVE-scope.
3. **Remaining audit findings** (from this session's audit):
   - ✅ **Infra H3** (DONE, PR #273): hardcoded dev creds removed from `ats-db` /
     `ecommerce-db` Dockerfiles — now injected at runtime via compose `${…:?}` (fail-closed).
   - ✅ **Backend L1** (DONE, PR #273): `printStackTrace` → `log.error` in all 4
     `StreamLambdaHandler`s.
   - ✅ **Backend L2** (DONE, PR #273): chatbot rate-limiter map bounded
     (`chatbot.rate-limit.max-tracked-ips`, default 10000) + test.
   - Infra **H2/M3**: CI deploy-role IAM wildcards (`terraform/main.tf` ~771-821) — scope down.
     *(Highest-value item left; risky — needs careful live-deploy testing.)*
   - Infra **M1**: containers run as root (all Dockerfiles); **M2**: unpinned base tags.
     *(Low priority — Docker images are local-dev only [prod is Lambda jars], and Dependabot
     already tracks base-image bumps via `dependabot/docker/*` branches.)*
   - ✅ **Infra M4** (DONE, PR #__M4__): chatbot OpenAI key fetched from Secrets Manager at
     runtime instead of a plaintext `OPENAI_API_KEY` Lambda env var. See the **"Infra M4"**
     section below.
   - Backend **M2**: inconsistent security config (CORS/CSRF, `JwtUtil` vs `JwtUtils`)
     across modules — standardize. *(Locally testable, but it changes live auth behaviour
     on all 3 apps and is largely cosmetic — modest security value.)*
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
  ecommerce-backend 84, portfolio-chatbot-backend **20** (was 12; +8 `OpenAiKeyResolverTest`
  in the M4 PR — 7 resolve-logic cases + 1 real-client-construction guard), portfolio-frontend
  246, ecommerce-frontend 199, ats-frontend 148 — all green.

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
- **`spring-ai-bom` silently manages `software.amazon.awssdk:*`** at an older 2.20.x (for
  its Bedrock support). If you add an AWS SDK dep to a spring-ai module, import the AWS SDK
  BOM **before** `spring-ai-bom` (first-declared `<dependencyManagement>` BOM wins), or your
  awssdk artifacts silently resolve to 2.20.x. Verify with `dependency:tree -Dincludes=software.amazon.awssdk`.
  (Hit during Infra M4 — the chatbot's `secretsmanager` first resolved to 2.20.162.)
- **Local build/test in the Claude Code sandbox**: the Bash sandbox blocks network,
  so `curl`/`wget` report "command not found" and `npm audit`/`npm install`/`mvn`
  (downloading) fail — notably `npm audit` **silently reports "0 vulnerabilities"**.
  Run network-touching commands with the sandbox disabled. And macOS has **no
  `timeout` command** (`timeout 300 mvn …` exits 127 and runs nothing) — use the
  Bash tool's own timeout param, not a `timeout` prefix.
- **Build/test commands**: backends `export JAVA_HOME=<jdk26>; mvn -f <mod>/pom.xml test`;
  frontends `npm run build` + `npm run test:ci` (`ng test --watch=false`, Vitest — no Karma).
- **Build artifacts are now all gitignored** (fixed in PR #273): `ats-frontend/coverage/`
  and `portfolio-chatbot-backend/target/` were previously tracked and dirtied by builds;
  they're now ignored like every other module's, so builds no longer leak into PRs.
- The IAM token is generated by the wrapper via **local SigV4 signing** — no network
  call — which is the whole reason it works from the egress-less VPC.
- Cost: the IAM-auth work adds **$0 recurring**; the Data API is the only public-path
  expansion and is gated off by default.
- Branching: all work & PRs go on **`clark-development`** (see "Branch & PR
  workflow" at top); fast-forward it to `main` after each merge. As of the M4 PR,
  `clark-development` is in sync with `main` (the held docs commits merged in #273). PR
  history: #262 (scaffolding), #266/#267 (portfolio cutover, temp branch), **#269**
  (ecommerce cutover), **#270** (ats cutover), **#271** (CVE remediation), **#273** (security
  hardening + repo cleanup: Infra H3, Backend L1/L2, `.gitignore`), **#__M4__** (Infra M4:
  chatbot OpenAI key → Secrets Manager at runtime). Going forward, always `clark-development`.
