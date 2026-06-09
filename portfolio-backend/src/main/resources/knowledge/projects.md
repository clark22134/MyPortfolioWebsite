---
title: Full-Stack Projects
category: projects
source: projects-page
---

# Full-Stack Projects

Live, production-grade applications hosted on this portfolio site. All three
share the same DevSecOps pipeline (GitHub Actions → Lambda/S3 → AWS) and the same
WCAG 2.1 AA accessibility baseline.

## 1. Applicant Tracking System (HireFlow)

A purpose-built ATS — Kanban pipeline, resume parsing, candidate scoring, notes,
activity log, follow-up tasks, tags, and role-based access. The frontend is built
on a refined custom design system tuned for non-technical recruiters and hiring
managers.

- **Frontend**: Angular 21, drag-and-drop boards (Angular CDK), optimistic UI,
  dedicated **Candidate Detail** page (`/candidates/:id`) with activity timeline,
  threaded notes, per-candidate tasks, and tag toggles. **Tasks** page (`/tasks`)
  for the "Mine / Open / Overdue / Done" follow-up queue. **Users** admin page.
- **Backend**: Spring Boot 3.5 (Java 21) with **JWT auth via HTTP-only cookies**
  (`AuthService`, `JwtUtil`, `CookieUtil`, `JwtRequestFilter`), three roles
  (`ADMIN` / `RECRUITER` / `HIRING_MANAGER`), role-aware path authorization, and
  refresh-token rotation. Append-only `Activity` log captures every stage move,
  note, tag change, and task completion.
- **Database**: PostgreSQL with **Flyway migrations** in
  `ats-backend/src/main/resources/db/migration/` (`V1__initial_schema`,
  `V2__auth_users`, `V3__notes_activities_tasks_tags`, `V4__catchup_idempotent`,
  `V5__ensure_activity_table_exists`). Tests use H2 with `MODE=PostgreSQL` and
  Flyway disabled.
- **Demo accounts**: `admin`, `recruiter`, and `manager` users for local
  development only. **Disabled in production** (`ATS_DEMO_ACCOUNTS_ENABLED=false`);
  seeded locally only when explicitly enabled with strong `ATS_*_PASSWORD` values
  (the initializer refuses to seed any account whose password is blank).
- **URL on this site**: `/ats/`
- **Source**: `ats-backend/`, `ats-frontend/`, `ats-db/`

## 2. E-Commerce Platform

A full-featured online store with product catalog, shopping cart, secure
checkout, and order management.

- **Frontend**: Angular 21 with reactive forms, lazy-loaded routes,
  test-setup.ts for Vitest unit tests.
- **Backend**: Spring Boot 3.5 + Spring Data JPA. Country/state and order
  schemas live in `ecommerce-backend/sql_scripts/`.
- **Database**: MySQL (Docker Compose locally); PostgreSQL-compatible Aurora Serverless v2 in production, seeded with
  100 sample products.
- **URL on this site**: `/ecommerce/`
- **Source**: `ecommerce-backend/`, `ecommerce-frontend/`, `ecommerce-db/`

## 3. Portfolio Website (this site)

The site you are viewing. Showcases full-stack and AI work, full project
documentation, and an accessibility statement.

- **Frontend**: Angular 21, standalone components, lazy-loaded routes,
  Kali-themed cyber UI, axe-core a11y tests in `portfolio-frontend/a11y-tests/`.
- **Backend**: Spring Boot 3.5 (`portfolio-backend/`), JWT + refresh tokens,
  CSRF protection, BCrypt, rate-limited endpoints.
- **Deployment**: nginx-fronted Docker locally; AWS Lambda + API Gateway +
  CloudFront + Aurora Serverless in production (see `terraform/` and
  `scripts/deploy-aws-serverless.sh`).
- **Source**: `portfolio-backend/`, `portfolio-frontend/`.

## Cross-cutting practices

- **Testing**: JUnit 5 + Mockito (backend), Vitest + @vitest/coverage-v8 + axe-core (frontend),
  JaCoCo XML coverage (backends), LCOV coverage (frontends), Spring Security Test for auth flows.
  Combined code coverage across all seven codebases: **81%** (tracked via SonarCloud and CodeCov on every CI run, including the dedicated `portfolio-chatbot-backend` test job).
- **Quality gates**: SonarCloud (`sonar-project.properties`), GitHub Actions
  build + test on every PR.
- **Containerization**: Each app has its own Dockerfile. `docker-compose.yml`
  runs the full containerized local stack, while `make preview-all`
  starts the source-based local preview workflow (apps + supporting DB containers).
