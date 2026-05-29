# Agent Guide

Operational guidance for AI assistants (Claude, Copilot, Cursor, etc.) working in this repo. Read this before making changes so your suggestions land cleanly.

## Repository shape

This is a monorepo with three full-stack applications sharing one Aurora cluster and one CI/CD pipeline. Everything runs locally with Docker Compose; production runs on AWS Lambda + S3 + CloudFront.

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

# Local development
make preview-all                           # full source-based stack on localhost
make preview-all-stop
docker compose up -d                       # containerized stack (uses prod profile in containers)

# Build & deploy
make build                                  # all apps
./scripts/deploy-aws-serverless.sh         # build + upload + invalidate CloudFront
```

## Conventions

- **No CLAUDE.md files** in this repo — write project-wide guidance in `AGENTS.md` (this file) or `docs/`.
- **Don't add JS/TS comments that just restate code**. Add them only when the *why* is non-obvious (a workaround, a constraint).
- **Prefer signals for component state** (Angular 21 idiomatic). Use `computed()` for derived values; keep `OnPush` change detection on new components.
- **Backend DTOs are records when read-only**, Lombok-annotated classes when they need a builder/validation.
- **Coverage targets**: backend ≥ 90% via JaCoCo, frontend ≥ 50% statements via V8. Combined ATS coverage is tracked at ≥ 80% statements.
- **Tests should pass without network or files**: H2 only, no real Flyway, no real auth filter, no real OpenAI key.

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

## Recent ATS migration to JWT + roles

The ATS used to be a fully-open public demo (`anyRequest().permitAll()`). It now requires authentication and ships with three demo accounts. The auth pattern intentionally mirrors `portfolio-backend` so we have one mental model. If you're migrating something else (e.g. e-commerce), copy from the ATS — it's the most recent.
