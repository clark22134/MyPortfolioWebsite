# Project Working State & Reference

> Reference/handoff doc for this monorepo's infra & security work. The big security/refactor pass
> and the Dependabot sweep are **complete, deployed, and verified**. What remains here is durable
> context: how to work in the repo, recurring gotchas, intentional design decisions (so they aren't
> "re-fixed"), reusable runbooks, and the open/deferred items.



## Branch & PR workflow (REQUIRED)

- Do all development and open all PRs from **`clark-development` → `main`**. Don't create new feature branches.
- Keep `clark-development` in sync with `main`. After a PR merges, fast-forward it:
  ```
  git fetch origin
  git checkout clark-development
  git merge --ff-only origin/main
  git push origin clark-development
  ```
  If it can't fast-forward, it has un-merged commits — reconcile before continuing; never work on a stale branch.
- **Deploys trigger only on merge to `main`** (`deploy-production.yml`). `main` is NOT branch-protected,
  but an active branch ruleset gates merges (see **Known friction** below).
- The concurrency group `deploy-production` (`cancel-in-progress: false`) **queues** simultaneous
  merges — a second merge won't cancel an in-flight deploy, it runs after.

## ⚠️ Known friction — `main` branch ruleset (`initial-ruleset`) gates merges

Until the ruleset is adjusted, **every PR effectively needs `gh pr merge --admin`**:

- **`code_scanning` rule** blocks merge while ANY open high/critical alert exists, from **both CodeQL
  AND Trivy**, evaluated on the **base branch**. Local-dev Trivy OS-CVEs (Alpine packages in
  local-only Docker images that never ship to prod) perpetually trip this.
- **Copilot review required on the HEAD commit, but `review_on_push:false`** → any fix-commit leaves
  the PR stuck. Re-request:
  `gh api -X POST repos/<owner>/<repo>/pulls/<n>/requested_reviewers -f 'reviewers[]=Copilot'`.
- A **`code_quality` rule** that wouldn't clear even with everything else green.

**Recommended governance fix:** scope `code_scanning` to **CodeQL-only**, set **`review_on_push:true`**,
and/or drop the `code_quality` rule.

Triage notes for code-scanning alerts: alerts on a removed `app/app.jar` build artifact are ghosts (no
jar is committed — confirm with `git ls-files`) → dismiss; the intentional CSRF + mermaid
`js/xss-through-dom` findings are justified false-positives; Alpine OS-CVEs are local-dev-only. A
transient GitHub API 401 storm can fail a CodeQL SARIF *upload* (not the analysis) — re-trigger with an
empty commit.

## 🔑 Lesson: CI-green ≠ deploy-safe

The Lambda **250MB unzipped** limit and workflow-action compatibility are enforced only at **deploy
time**, not in CI. **`ats-backend` is closest to the limit (~240.4MB)** after trimming the AWS SDK's
two unused default HTTP clients (netty-nio-client + apache-client; ats makes no AWS calls — RDS IAM
signs locally — so `url-connection-client` suffices). **Future ats dep bumps must watch jar size**
(`UpdateFunctionCode: Unzipped size must be smaller than 262144000 bytes`).

## Architecture (one monorepo, three apps + a chatbot)

- **portfolio** (clarkfoster.com), **ecommerce** (shop.clarkfoster.com), **ats** — each = Angular 21
  frontend + Spring Boot 3.5.14 / Java 21 backend, deployed as an **AWS Lambda (SnapStart)** behind
  **API Gateway (REST) → CloudFront**.
- **portfolio-chatbot-backend** — RAG chatbot, separate Lambda **outside the VPC** (so it can reach
  api.openai.com). RAG: TOP_K=12 / CONTEXT_PASSAGES=6; embeddings are **precomputed at build time**
  (committed `knowledge-vectors.json`, loaded at init — no startup embedding; see **Intentional design
  decisions**). The OpenAI key is fetched from Secrets Manager **at startup** (`OpenAiKeyResolver` →
  `spring.ai.openai.api-key` system property), not a plaintext env var. ats has JWT + role auth
  (ADMIN/RECRUITER/HIRING_MANAGER; demo accounts off in prod).
- Shared **Aurora Serverless v2 PostgreSQL 15.17** cluster `prod-shared` (three databases:
  `portfolio`, `ecommerce`, `ats`).
- **Deploy = push to `main`** → `deploy-production.yml`: quality gates → `terraform apply` (secrets as
  `TF_VAR_*` from GitHub Secrets) → build jars → S3 (`prod-lambda-deployments-<acct>`) →
  `lambda update-function-code` → `publish-version` → alias shift. **No local `terraform apply`**
  (secrets only exist in CI).
- Terraform: ~2,900 lines / 8 modules (no `route53` module — DNS records live in root `main.tf`).
- Frontends test with **Vitest** (not Karma/Jasmine).

## Verified environment facts (us-east-1, account 010438493245, env `prod`)

- Aurora cluster `prod-shared`: Aurora PostgreSQL **15.17**, Serverless v2
  - resource id `cluster-WI6AY6X3CBFXCMUDXZADOOC3BI`
  - endpoint `prod-shared.cluster-c6zq2wwwkp8z.us-east-1.rds.amazonaws.com`
  - cluster ARN `arn:aws:rds:us-east-1:010438493245:cluster:prod-shared`
- Master secret `prod-shared-credentials`
  ARN `arn:aws:secretsmanager:us-east-1:010438493245:secret:prod-shared-credentials-flwd0N`
- Lambdas: `prod-portfolio-backend`, `prod-ecommerce-backend`, `prod-ats-backend`,
  `prod-portfolio-chatbot`. The three backends run **in private subnets**; the chatbot is outside the VPC.
- **VPC has NO NAT.** The only VPC endpoint is an **SES SMTP interface endpoint**
  (`aws_vpc_endpoint.ses_smtp` = `vpce-00b0dd97892f35d02`, Terraform-managed) — the contact form's
  email path (`portfolio-backend` → `email-smtp.us-east-1.amazonaws.com:587` over PrivateLink, private
  DNS). ⚠️ The SES SMTP endpoint service is offered only in **us-east-1b/c/d** (NOT us-east-1a), so the
  endpoint sits only in the us-east-1b private subnet; us-east-1a Lambdas reach it cross-AZ via private DNS.
- In-VPC Lambdas otherwise **cannot reach public AWS APIs** (Secrets Manager is unreachable from them).
  This is *why* the backends use **RDS IAM** (token signed locally via SigV4 — no API call) instead of
  Secrets-Manager-at-runtime.
- GitHub Secrets present: `ADMIN_PASSWORD, ATS_JWT_SECRET, AWS_ACCOUNT_ID, AWS_ROLE_ARN,
  ECOMMERCE_JWT_SECRET, OPENAI_API_KEY, PORTFOLIO_JWT_SECRET, SES_SMTP_PASSWORD, SES_SMTP_USERNAME,
  SONAR_TOKEN`. (ats demo-account passwords intentionally absent → demo seeding stays off.)
- Local toolchain: Maven runs on **JDK 26** (`JAVA_HOME=/opt/homebrew/Cellar/openjdk/26.0.1/libexec/openjdk.jdk/Contents/Home`);
  tests pass under it via the surefire experimental flags. Terraform **v1.15.5** (`fmt`/`validate` work;
  `validate` needs `init -backend=false`). The user is authenticated for **read-only + targeted** AWS CLI use.

## RDS IAM database authentication (live on all 3 backends — kept as template + rollback)

Mechanism + runbook, retained for rollback/operations and as the template for any future DB-auth work.

### Design — env-driven dual mode (same artifact, zero-downtime cutover)
- App deps: `software.amazon.jdbc:aws-advanced-jdbc-wrapper` (**2.6.5** — 2.6.0 had GHSA-7xw4-g7mm-r4hh,
  privilege escalation toward `rds_superuser`) + `software.amazon.awssdk:rds` (BOM-managed). Prod driver
  is `${DB_DRIVER_CLASS:org.postgresql.Driver}`; url/username/password from env.
- **Password mode (default)**: `jdbc:postgresql://…`, master creds, `DB_PASSWORD` set.
- **IAM mode**: `SPRING_DATASOURCE_URL=jdbc:aws-wrapper:postgresql://HOST:5432/DB?wrapperPlugins=iam&sslmode=require`,
  `DB_DRIVER_CLASS=software.amazon.jdbc.Driver`, `DB_USERNAME=<app>_app`, NO `DB_PASSWORD`.
- Per-app Terraform flag `var.<app>_db_iam_auth` (default **false**); when true the lambda module
  attaches an `rds-db:connect` policy and the env switches to IAM mode.
- Provisioning SQL: `terraform/rds-iam/{portfolio,ecommerce,ats}_app.sql`. The cluster has
  `iam_database_authentication_enabled = true`.
- **Data API** (`var.enable_data_api`, default **false** + `apply_immediately`): a public endpoint used
  only to run provisioning SQL with no bastion; enable transiently, then disable.
- Full procedure: `terraform/RDS_IAM_AUTH_RUNBOOK.md`.

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

## Intentional design decisions (do NOT "re-fix" — investigated, correct as-is)

A future audit/review may re-flag these as "inconsistencies." They are deliberate; changing them would
alter live behaviour for zero gain. Point reviewers here.

- **Per-app CSRF differs by design.** All 3 backends auth via an HTTP-only JWT cookie (Bearer-header
  *fallback* for non-browser clients), so the cookie's cross-site behaviour *is* the CSRF control.
  **CORS does NOT prevent CSRF.** Each app already has a valid defense:

  | App | Config / filter / util | CSRF mechanism |
  |-----|------------------------|----------------|
  | portfolio | `config/SecurityConfig` · `JwtRequestFilter` · `JwtUtil` | **enabled** — double-submit token (`CookieCsrfTokenRepository.withHttpOnlyFalse()`, `X-XSRF-TOKEN`) |
  | ats | `config/SecurityConfig` · `JwtRequestFilter` · `JwtUtil` | `csrf.disable()` + cookie **`SameSite=Lax`** (not sent on cross-site mutations) |
  | ecommerce | `security/SecurityConfiguration` · `security/jwt/JwtAuthenticationFilter` · `JwtUtils` | `csrf.disable()` + cookie **`SameSite=Strict`** (never sent cross-site — strongest) |

  The SameSite attributes (in each `CookieUtil`) are the proof the `csrf.disable()` calls are safe;
  the `csrf.disable()` lines carry "why" comments saying so.
- **`JwtUtil`/`JwtUtils`, `SecurityConfig`/`SecurityConfiguration`, `JwtRequestFilter`/`JwtAuthenticationFilter`
  naming differs** across the three — they're separate deployables, each internally consistent. A
  cross-app rename is pure churn (no dedup possible without a shared library).
- **Auth guards differ by design.** portfolio's `AuthService` is RxJS with an async `/me` bootstrap →
  its guard uses `whenReady()` to avoid a refresh race; ecommerce's uses Angular **signals** and
  restores auth **synchronously** from `localStorage` → its synchronous `isAuthenticated()` guard is
  correct. True dedup needs a shared lib across two npm apps — disproportionate.
- **Docker: the 3 backend images run non-root `app`; the 3 nginx frontends + 2 DB images stay root by
  design.** These are **local-dev-only** images (prod is Lambda jars + CloudFront/S3) — non-root nginx
  would force a `:80→:8080` listener move across compose + every `nginx.*.conf`, and the postgres/mysql
  entrypoints chown the data volume as root then drop privileges (adding `USER` breaks init). All base
  images are **digest-pinned** (`image:tag@sha256:…`; tag kept so Dependabot still bumps both).
- **Chatbot RAG embeddings are precomputed at build time, not at startup.** `KnowledgeVectorGenerator`
  (`@Profile("generate-kb")`, run via `scripts/generate-chatbot-kb.sh`) embeds the KB once and writes the
  committed `portfolio-chatbot-backend/src/main/resources/knowledge-vectors.json` (~6.5MB,
  `SimpleVectorStore.save()`, ~288 chunks); at init `KnowledgeIngestionService` just
  `SimpleVectorStore.load()`s it — **zero OpenAI calls on the SnapStart Init path**. Live embedding is a
  local-dev-only fallback when the file is absent. **Why:** startup embedding (288 sequential OpenAI calls)
  ran 94–130s+ inside the ~130s SnapStart **Init** cap, so version publishes were a coin-flip and
  intermittently failed (`State=Failed`, deploy aborts at the `publish-version` waiter — this killed the
  #288/#289 deploys). **Regenerate the committed file when the KB markdown changes**
  (`portfolio-backend/…/knowledge/*.md` or repo `/docs/*.md`); the keyless `KnowledgeVectorsFreshnessTest`
  fails CI if the committed vectors drift from the markdown, so stale embeddings can't ship.

## Test baselines (JDK 26 / Vitest; all green)

portfolio-backend **171** · ats-backend **222** · ecommerce-backend **84** · portfolio-chatbot-backend
**31** · portfolio-frontend **317** · ecommerce-frontend **199** · ats-frontend **148**.


## Gotchas / operational notes

- **`apply_immediately`**: cluster setting changes go to `PendingModifiedValues` unless
  `apply_immediately = true` (now set). Flush a stuck pending change with
  `aws rds modify-db-cluster … --apply-immediately`.
- **Data API toggle**: on this Aurora **Serverless v2/provisioned** cluster,
  `aws rds modify-db-cluster --enable-http-endpoint` is a **silent no-op** (that param is Serverless v1
  only). Use the dedicated `aws rds enable-http-endpoint` / `disable-http-endpoint --resource-arn
  <cluster-arn>`. (Terraform's `enable_http_endpoint` works — the provider routes to the right API.)
- **Data API warm-up**: for ~60–90s after `enable-http-endpoint`, `rds-data execute-statement`
  intermittently throws `HttpEndpointNotEnabledException` even though the toggle is on — wrap
  provisioning in retry-with-backoff. The Data API also can't serialize a bare `char` column — cast it
  (`relkind::text`) (`UnsupportedResultException: unsupported data type "CHAR"`).
- **`REASSIGN OWNED` on Aurora**: the master user is `rds_superuser`, not a real superuser, so
  `REASSIGN OWNED BY postgres TO <role>` fails (42501). Fix: `GRANT <role> TO postgres;` first, run the
  REASSIGN, then `REVOKE <role> FROM postgres;` (`ats_app.sql` encodes this). The PG15 `public` schema
  is owned by `pg_database_owner`, so REASSIGN leaves the schema itself alone.
- **Trivy** (GitHub Advanced Security) parses `pom.xml` statically and does **not** resolve
  Spring-managed/property versions — use a **literal** `<version>` to satisfy it (postgresql is pinned
  literally for this reason).
- **`spring-ai-bom` silently manages `software.amazon.awssdk:*`** at an older 2.20.x. If you add an AWS
  SDK dep to a spring-ai module, import the AWS SDK BOM **before** `spring-ai-bom` (first-declared
  `<dependencyManagement>` BOM wins), or your awssdk artifacts silently resolve to 2.20.x. Verify with
  `dependency:tree -Dincludes=software.amazon.awssdk`.
- **maven-shade-plugin in the chatbot**: do **not** add a `<ServicesResourceTransformer/>` — 3.6.x
  chokes on it (`Cannot find 'resource'`) and it isn't needed (the SecretsManager client sets its HTTP
  client explicitly; url-connection's SPI file is unique).
- **Regenerating the chatbot KB vectors** (`scripts/generate-chatbot-kb.sh`): needs `OPENAI_API_KEY`
  exported, or `OPENAI_SECRET_ARN=arn:…:secret:prod/portfolio/openai-api-key-…` to pull from Secrets
  Manager (`OpenAiKeyResolver` resolves it in `main()`). Do **NOT** pass
  `--spring.main.web-application-type=none`: the `spring-cloud-function-serverless-web` autoconfig
  registers a web-context-only `ServerlessServletWebServerFactory`, so a non-web context throws
  `ClassCastException` at startup — boot in normal servlet mode (the serverless factory is a no-op proxy,
  no port binding) and the generator `System.exit(0)`s when done. The generator shares the vector-store
  bean with `KnowledgeIngestionService`'s `@PostConstruct`, so the KB embeds twice per run (harmless —
  deterministic ids overwrite by id; only the generator's vectors are saved).
- **zsh scripting**: `status` is a read-only builtin variable — don't use it as a variable name in
  `gh`/jq poll loops (use `run_status` etc.). And `echo "$json" | jq` mangles backslashes in some AWS
  JSON (e.g. CloudTrail) — write the payload to a file and `jq` the file.
- **Build/test commands**: backends `export JAVA_HOME=<jdk26>; mvn -f <mod>/pom.xml test`; frontends
  `npm run build` + `npm run test:ci` (`ng test --watch=false`, Vitest). Build artifacts
  (`*/coverage/`, `*/target/`) are all gitignored.
- **CloudTrail recipe** (read-only, reusable — e.g. to derive the deploy role's real action set): the
  CI deploy role's session name is **`GitHubActions`**;
  `aws cloudtrail lookup-events --lookup-attributes AttributeKey=Username,AttributeValue=GitHubActions`,
  then aggregate `Events[].EventName`/`EventSource` (write the page to a file first, then `jq`).

## Testing notes (portfolio-frontend = `@angular/build:unit-test` + Vitest 4 / jsdom)

For writing more frontend specs — these are environment quirks that bite:
- **`localStorage` is `undefined`** in the runner; code guarded by `typeof localStorage === 'undefined'`
  takes the no-op branch. To test persistence, `vi.stubGlobal('localStorage', <in-memory mock>)` before
  constructing the service.
- **`window.speechSynthesis` / global `SpeechSynthesisUtterance` are absent** → stub before constructing
  to exercise TTS paths.
- **`window.matchMedia` is stubbed in `src/test-setup.ts`** (returns `matches:false`); use
  `vi.spyOn(window,'matchMedia').mockReturnValue({matches:true} as MediaQueryList)` for the
  prefers-reduced-motion branch.
- **`vi.mock('<bare-module>', () => ({ default: ... }))` works** (used to stub the heavy `mermaid` ESM
  import) — provide a `default` key for default imports.
- **`fakeAsync` + `setInterval`/`setTimeout` started in `ngOnInit`**: call `component.ngOnInit()`
  **directly** (NOT `fixture.detectChanges()`) so the timer is scheduled inside the fakeAsync zone and
  `tick()` advances it.
- Conventions: Vitest globals are on (`globals:true`); `createSpyObj`/`SpyObj` come from
  `src/test-helpers.ts`; standalone components use `imports:[Component, RouterTestingModule]`;
  `UserInfo` = `{ username, email, fullName }` (no `role`).
