---
title: Full-Stack Projects
category: projects
source: projects-page
---

# Full-Stack Projects

Live, production-grade applications hosted on this portfolio site. All three
share the same DevSecOps pipeline (GitHub Actions → Docker → AWS) and the same
WCAG 2.1 AA accessibility baseline.

## 1. Applicant Tracking System (ATS)

A modern ATS with **Kanban pipeline boards** that move candidates through
screening, interview, offer, and onboarding stages.

- **Frontend**: Angular 21, drag-and-drop boards, optimistic UI updates.
- **Backend**: Spring Boot 3.5 (Java 21), JWT auth, role-based access.
- **Database**: PostgreSQL with Flyway-style schema in `ats-db/init/01-schema.sql`.
- **URL on this site**: `/ats/`
- **Source**: `ats-backend/`, `ats-frontend/`, `ats-db/`

## 2. E-Commerce Platform

A full-featured online store with product catalog, shopping cart, secure
checkout, and order management.

- **Frontend**: Angular 21 with reactive forms, lazy-loaded routes,
  test-setup.ts for Vitest unit tests.
- **Backend**: Spring Boot 3.5 + Spring Data JPA. Country/state and order
  schemas live in `ecommerce-backend/sql_scripts/`.
- **Database**: PostgreSQL (containerized in `ecommerce-db/`), seeded with
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

- **Testing**: JUnit 5 + Mockito (backend), Vitest + axe-core (frontend),
  JaCoCo coverage, Spring Security Test for auth flows.
- **Quality gates**: SonarQube (`sonar-project.properties`), GitHub Actions
  build + test on every PR.
- **Containerization**: Each app has its own Dockerfile. `docker-compose.yml`
  spins up the entire stack locally; `scripts/deploy-local.sh` is the
  one-shot dev bootstrap.
