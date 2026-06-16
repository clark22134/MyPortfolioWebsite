# Agent Guide

Operational guidance for Codex CLI and other AI assistants working in this repo. Codex is often run in full-auto mode here, so prefer self-directed execution: inspect first, make small changes, verify locally, and report blockers clearly instead of waiting for permission on routine repo work.

## Codex operating rules

- Treat `AGENTS.md` as the source of truth for future agent guidance. Do not add new assistant-specific instruction files; migrate durable lessons here or into `docs/`.
- Work from **`clark-development` -> `main`** for PRs. Do not create new feature branches unless the user explicitly asks.
- Before starting non-trivial work, confirm the current branch and worktree state. Preserve user changes and do not revert unrelated files.
- Keep `clark-development` current with `main` after merges:
  ```bash
  git fetch origin
  git checkout clark-development
  git merge --ff-only origin/main
  git push origin clark-development
  ```
- In full-auto mode, run the narrowest meaningful verification for each change. If a command needs network, credentials, AWS access, or an unsafe action, surface that requirement and use the available approval/escalation flow.
- Do not run local `terraform apply` for production. Production deploys are GitHub Actions driven on merge to `main`, with secrets supplied by CI.
- Keep changes production-ready: update docs with behavior changes, avoid placeholders, and do not leave TODO-driven partial implementations.

## Repository shape

This is a monorepo with three full-stack applications plus a chatbot sharing one Aurora cluster and one CI/CD pipeline. Everything runs locally with Docker Compose; production runs on AWS Lambda + API Gateway + CloudFront, with static frontends on S3/CloudFront.

```
portfolio-backend/  + portfolio-frontend/  + portfolio-chatbot-backend/
ecommerce-backend/  + ecommerce-frontend/  + ecommerce-db/
ats-backend/        + ats-frontend/        + ats-db/
terraform/   scripts/   docs/
```

| Project | Backend | Frontend | Database | Auth |
|---------|---------|----------|----------|------|
| Portfolio | Spring Boot 3.5 (Java 21), Spring AI 1.0.x | Angular 21 | H2 (local) / Aurora (prod) | JWT in cookies, BCrypt |
| E-Commerce | Spring Boot 3.5 | Angular 21 + Bootstrap | MySQL / Aurora | JWT in cookies |
| **HireFlow ATS** | Spring Boot 3.5, Flyway, JJWT | Angular 21 | PostgreSQL / Aurora | JWT in cookies, 3 roles |
| Portfolio Chatbot | Spring Boot 3.5, Spring AI | n/a | Precomputed vector JSON | OpenAI key from Secrets Manager |

Production notes:

- The three app backends run as SnapStart Lambdas in private subnets. The chatbot Lambda runs outside the VPC so it can reach `api.openai.com`.
- The shared database is Aurora Serverless v2 PostgreSQL 15.17 with three databases: `portfolio`, `ecommerce`, and `ats`.
- In-VPC Lambdas have no NAT and cannot call public AWS APIs at runtime. They use RDS IAM database auth because token signing is local and does not require a Secrets Manager call.
- The portfolio contact form reaches SES SMTP through the Terraform-managed SES SMTP VPC endpoint. Do not replace this with public AWS API calls from an in-VPC Lambda.

## ATS-specific notes (most active area of recent work)

- **Schema lives in Flyway migrations**, not in the DB image. Add new tables/columns by creating a new `V{n}__{name}.sql` under `ats-backend/src/main/resources/db/migration/`. Never edit a published migration in place — `spring.flyway.enabled=true` enforces immutability via checksums.
- **Tests use H2 with `MODE=PostgreSQL`** and `ddl-auto=create-drop`, with Flyway disabled (`src/test/resources/application.properties`). If you change an entity, the test schema is auto-generated; if you change a Flyway migration, the prod schema follows on next deploy.
- **Auth is cookie-based**. Two cookies: `ats_access_token` (15 min) and `ats_refresh_token` (7 days), both `HttpOnly`, `SameSite=Lax`. The frontend's `authInterceptor` does one-shot silent refresh on 401, then redirects to `/login`.
- **Roles** are `ADMIN`, `RECRUITER`, `HIRING_MANAGER`. Authorization is path-based in `SecurityConfig`. `@PreAuthorize` only on `UserController` (admin-only).
- **Demo accounts** (`admin`/`recruiter`/`manager`) are seeded on startup by `DemoUserInitializer` unless `app.demo-accounts.enabled=false`. The seeder is idempotent (skips if username exists), so re-runs are safe.
- **Web-MVC tests** that exercise `SecurityConfig` should `@Import({SecurityConfig.class, ControllerTestSupport.class})` — `ControllerTestSupport` provides pass-through security beans so the slice can boot without a full Spring context. Use `@WithMockUser(roles = "RECRUITER")` on test methods that need authentication.
- **Activity logging** is opt-in via `ActivityService.record(...)`. Existing services (`CandidateService`, `JobService`, `NoteService`, `TaskService`, `TagService`) already record relevant events — when you add a new mutation, log it too.

## Commands

```bash
# Tests
make test                                  # all backends + all frontends (CI uses this)
cd ats-backend && mvn test                 # ATS backend only (writes target/site/jacoco/)
cd ats-frontend && npx ng test --watch=false --coverage  # ATS frontend (writes coverage/)

# Builds
mvn -f <module>/pom.xml test               # backend module verification
cd <frontend> && npm run build && npm run test:ci

# Local development
make preview-all                           # full source-based stack on localhost
make preview-all-stop
docker compose up -d                       # containerized stack (uses prod profile in containers)

# Build & deploy
make build                                  # all apps
./scripts/deploy-aws-serverless.sh         # build + upload + invalidate CloudFront
```

## Conventions

- **No new assistant-specific guide files** in this repo. Write project-wide guidance in `AGENTS.md` (this file) or `docs/`.
- **Don't add JS/TS comments that just restate code**. Add them only when the *why* is non-obvious (a workaround, a constraint).
- **Prefer signals for component state** (Angular 21 idiomatic). Use `computed()` for derived values; keep `OnPush` change detection on new components.
- **Backend DTOs are records when read-only**, Lombok-annotated classes when they need a builder/validation.
- **Coverage targets**: backend ≥ 90% via JaCoCo, frontend ≥ 50% statements via V8. Combined ATS coverage is tracked at ≥ 80% statements.
- **Tests should pass without network or files**: H2 only, no real Flyway, no real auth filter, no real OpenAI key.
- **Frontend tests use Vitest**, not Karma/Jasmine. Vitest globals are enabled; shared helpers live in each frontend's test setup/helpers.
- **Use literal dependency versions when security scanners require them**. Trivy parses `pom.xml` statically and may not resolve Spring-managed or property-managed versions.

## Deployment and CI lessons

- CI green does not guarantee deploy safety. The Lambda 250 MB unzipped package limit is enforced during deploy. `ats-backend` has historically been close to the limit, so dependency bumps there must include jar size awareness.
- Deploys trigger only after merge to `main` through `deploy-production.yml`. The workflow queues deploys with the `deploy-production` concurrency group; it does not cancel an in-flight deploy.
- The active `main` ruleset has caused merge friction: code scanning is evaluated on the base branch, Copilot review may need to be re-requested after fix commits, and some code quality gates may not clear. Do not assume a blocked merge means the PR branch is broken; inspect the specific rule.
- Local-dev Docker image CVEs can appear in Trivy even though production uses Lambda jars and S3/CloudFront. Triage local-only findings separately from production runtime findings.
- If updating workflow actions, Lambda packaging, or backend dependencies, verify both CI behavior and deploy-time constraints where possible.

## Where things live

| If you need to… | Edit… |
|-----------------|-------|
| Add a new ATS database table | `ats-backend/src/main/resources/db/migration/V{n}__{name}.sql` |
| Add an ATS endpoint | `ats-backend/.../controller/` + add path rule to `SecurityConfig` |
| Change ATS auth/roles | `ats-backend/.../config/SecurityConfig.java` |
| Add a frontend page | `ats-frontend/src/app/pages/{name}/` + `app.routes.ts` |
| Add a navigation item | `ats-frontend/src/app/components/app-shell.component.ts` `navItems` |
| Update demo passwords | `.env` (`ATS_ADMIN_PASSWORD=…`) or `application.properties` |
| Update bot's knowledge of ATS | `portfolio-backend/src/main/resources/knowledge/projects.md` (bundled into chatbot at build) |
| Update chatbot knowledge vectors | `scripts/generate-chatbot-kb.sh` + committed `portfolio-chatbot-backend/src/main/resources/knowledge-vectors.json` |

## Recent ATS migration to JWT + roles

The ATS used to be a fully-open public demo (`anyRequest().permitAll()`). It now requires authentication and ships with three demo accounts. The auth pattern intentionally mirrors `portfolio-backend` so we have one mental model. If you're migrating something else (e.g. e-commerce), copy from the ATS — it's the most recent.

## Intentional security and architecture decisions

Do not "normalize" these without a user-approved design change:

- CSRF differs per app by design. Portfolio uses a double-submit CSRF token. ATS disables CSRF but uses `SameSite=Lax` auth cookies. E-commerce disables CSRF but uses `SameSite=Strict` auth cookies. The cookie SameSite setting is the browser CSRF control for the apps that disable Spring CSRF.
- JWT/security class names differ across apps (`JwtUtil` vs `JwtUtils`, `SecurityConfig` vs `SecurityConfiguration`, etc.). They are separate deployables and are internally consistent; cross-app renames are churn unless a shared library is being introduced.
- Auth guards differ by frontend. Portfolio bootstraps auth asynchronously through `/me`; e-commerce restores auth synchronously from `localStorage`; do not deduplicate unless the underlying auth model changes.
- Local Docker images are not the production runtime. Backend images run as non-root `app`; nginx frontend and DB images stay root for local-dev simplicity.
- Chatbot RAG embeddings are precomputed at build time and committed as `knowledge-vectors.json`. Regenerate that file when source knowledge markdown changes. Do not move embedding back to Lambda startup; it previously made SnapStart version publishes unreliable.

## Operational gotchas

- `spring-ai-bom` can manage `software.amazon.awssdk:*` to older 2.20.x versions. If adding AWS SDK dependencies to a Spring AI module, import the AWS SDK BOM before `spring-ai-bom` and verify with `dependency:tree -Dincludes=software.amazon.awssdk`.
- Do not add `<ServicesResourceTransformer/>` to the chatbot `maven-shade-plugin`; the current shade plugin version does not need it and has failed with that transformer.
- The chatbot KB generator needs `OPENAI_API_KEY` or `OPENAI_SECRET_ARN`. Do not pass `--spring.main.web-application-type=none`; the serverless web autoconfiguration expects a servlet web context.
- On Aurora Serverless v2/provisioned, use `aws rds enable-http-endpoint` / `disable-http-endpoint` for the Data API. `modify-db-cluster --enable-http-endpoint` is a silent no-op.
- After enabling the Data API, `rds-data execute-statement` may fail for roughly 60-90 seconds while the endpoint warms up. Use retry with backoff.
- In zsh scripts, `status` is a read-only builtin variable. Use names like `run_status`. When processing AWS or CloudTrail JSON, prefer writing JSON to a file and running `jq` on the file rather than piping through `echo`.
- macOS does not provide GNU `timeout` by default. Use the command runner's timeout support or another repo-approved approach instead of assuming `timeout 300 ...` exists.
