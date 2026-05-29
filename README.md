# Portfolio Website Platform

A production-grade, multi-application platform comprising three full-stack web applications — a **Portfolio**, an **E-Commerce store**, and an **Applicant Tracking System (ATS)** — deployed on AWS behind a shared infrastructure layer.

**Live:**
[clarkfoster.com](https://clarkfoster.com) ·
[shop.clarkfoster.com](https://shop.clarkfoster.com) ·
[ats.clarkfoster.com](https://ats.clarkfoster.com)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Projects](#projects)
  - [Portfolio](#portfolio--clarkfostercom)
  - [E-Commerce](#e-commerce--shopclarkfostercom)
  - [HireFlow ATS](#hireflow-ats--atsclarkfostercom)
  - [Cloud Infrastructure](#cloud-infrastructure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development with Docker](#local-development-with-docker)
  - [Local Development without Docker](#local-development-without-docker)
  - [AWS Deployment](#aws-deployment)
- [Usage](#usage)
- [Testing](#testing)
- [Future Improvements](#future-improvements)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

| Application | Description | Domain |
|-------------|-------------|--------|
| **Portfolio** | Authenticated admin portal with project showcase, contact form, and accessibility toolbar | `clarkfoster.com` |
| **E-Commerce** | Full shopping platform with product catalog, persistent cart, checkout, and order tracking | `shop.clarkfoster.com` |
| **HireFlow ATS** | Applicant tracking system with Kanban pipeline, resume parsing, and candidate scoring | `ats.clarkfoster.com` |

All three applications share a single serverless infrastructure layer with CloudFront global CDN, API Gateway regional endpoints, Lambda functions (Java 21 with SnapStart), a shared Aurora Serverless v2 cluster (3 databases), and a CloudFront WAF — running at **~$63/month** (~68% cost reduction from previous Fargate architecture).

---

## Architecture

```
                                  ┌─────────────────────────┐
                                  │      Route 53 DNS       │
                                  │  clarkfoster.com        │
                                  │  shop.clarkfoster.com   │
                                  │  ats.clarkfoster.com    │
                                  └───────────┬─────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
           ┌────────▼────────┐       ┌────────▼────────┐       ┌───────▼─────────┐
           │  CloudFront CDN │       │  CloudFront CDN │       │  CloudFront CDN │
           │  Portfolio      │       │  E-Commerce     │       │  HireFlow ATS   │
           │  Global Edge    │       │  Global Edge    │       │  Global Edge    │
           └────────┬────────┘       └────────┬────────┘       └────────┬────────┘
                    │                         │                         │
                    └─────────────────────────┼─────────────────────────┘
                                              │
                                  ┌───────────▼─────────────┐
                                  │  CloudFront WAF         │
                                  │  (us-east-1)            │
                                  │  Rate limiting:         │
                                  │   2000/5m (general)     │
                                  │   20/5m (auth)          │
                                  │  AWS Managed Rules      │
                                  │  (SQLi, XSS, bad inputs)│
                                  └───────────┬─────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │ clarkfoster.com         │ shop.*                  │ ats.*
                    │                         │                         │
           ┌────────▼────────┐       ┌────────▼────────┐       ┌───────▼─────────┐
           │   Portfolio     │       │   E-Commerce    │       │   HireFlow ATS  │
           │                 │       │                 │       │                 │
           │ ┌─────────────┐ │       │ ┌─────────────┐ │       │ ┌─────────────┐ │
           │ │  S3 Static  │ │       │ │  S3 Static  │ │       │ │  S3 Static  │ │
           │ │  Hosting    │ │       │ │  Hosting    │ │       │ │  Hosting    │ │
           │ │  Angular 21 │ │       │ │  Angular 21 │ │       │ │  Angular 21 │ │
           │ │  (via CF)   │ │       │ │  (via CF)   │ │       │ │  (via CF)   │ │
           │ └─────────────┘ │       │ └─────────────┘ │       │ └─────────────┘ │
           │                 │       │                 │       │                 │
           │ ┌─────────────┐ │       │ ┌─────────────┐ │       │ ┌─────────────┐ │
           │ │ API Gateway │ │       │ │ API Gateway │ │       │ │ API Gateway │ │
           │ │  (regional) │ │       │ │  (regional) │ │       │ │  (regional) │ │
           │ └──────┬──────┘ │       │ └──────┬──────┘ │       │ └──────┬──────┘ │
           │        │        │       │        │        │       │        │        │
           │ ┌──────▼──────┐ │       │ ┌──────▼──────┐ │       │ ┌──────▼──────┐ │
           │ │   Lambda    │ │       │ │   Lambda    │ │       │ │   Lambda    │ │
           │ │  Java 21    │ │       │ │  Java 21    │ │       │ │  Java 21    │ │
           │ │  SnapStart  │ │       │ │  SnapStart  │ │       │ │  SnapStart  │ │
           │ │  Spring     │ │       │ │  Spring     │ │       │ │  Spring     │ │
           │ │  Boot 3     │ │       │ │  Boot 3     │ │       │ │  Boot 3     │ │
           │ │  1024 MB    │ │       │ │  2048 MB    │ │       │ │  1024 MB    │ │
           │ └──────┬──────┘ │       │ └──────┬──────┘ │       │ └──────┬──────┘ │
           │        │        │       │        │        │       │        │        │
           │ ┌──────▼──────┐ │       │ ┌──────▼──────┐ │       │ ┌──────▼──────┐ │
           │ │  Shared     │ │       │ │  Shared     │ │       │ │  Shared     │ │
           │ │  Aurora     │ │       │ │  Aurora     │ │       │ │  Aurora     │ │
           │ │  Serverless │ │       │ │  Serverless │ │       │ │  Serverless │ │
           │ │  v2 PG 15.17│ │       │ │  v2 PG 15.17│ │       │ │  v2 PG 15.17│ │
           │ │  0.5-4 ACU  │ │       │ │  0.5-4 ACU  │ │       │ │  0.5-4 ACU  │ │
           │ └─────────────┘ │       │ └─────────────┘ │       │ └─────────────┘ │
           └─────────────────┘       └─────────────────┘       └─────────────────┘

                          AWS Serverless Infrastructure
                     ┌────────────────────────────────────┐
                     │  4 Lambda functions (SnapStart)    │
                     │  3 API Gateways (REST regional)    │
                     │  3 S3 buckets (static hosting)     │
                     │  3 CloudFront distributions        │
                     │  1 shared Aurora Serverless v2     │
                     │    cluster (3 databases)           │
                     │  CloudFront WAF (shared)           │
                     │  CloudWatch Logs (7-day)           │
                     │  EventBridge (Lambda warming)      │
                     └────────────────────────────────────┘
```

**Infrastructure-as-Code:** 8 Terraform modules (networking, ACM, S3, CloudFront, CloudFront WAF, API Gateway, Lambda, Aurora) with remote state in S3 + DynamoDB locking. ~2190 lines of modular infrastructure code.

**CI/CD:** GitHub Actions with OIDC-based AWS authentication (no long-lived credentials), parallel test jobs, Trivy/TruffleHog security scans, SonarCloud quality gates, Lambda deployment with versioning and aliases.

**Cost Optimization:** Migrated from ECS Fargate (~$200/month) to serverless architecture (~$63/month) — ~68% cost reduction while upgrading databases to managed Aurora Serverless v2.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Angular 21, TypeScript 5.9, RxJS, Angular CDK, Bootstrap 5 (E-Commerce), SCSS |
| **Backend** | Spring Boot 3.5.14, Java 21, Spring Security, Spring Data JPA, Spring Data REST |
| **AI / RAG** | Spring AI 1.0.8, OpenAI gpt-5.4-mini, text-embedding-3-small (1536-dim), SimpleVectorStore |
| **Databases** | Aurora Serverless v2 (1 shared cluster, 3 databases), PostgreSQL 15.17, H2 (local tests) |
| **Auth** | JWT (JJWT), HTTP-only cookies, BCrypt, refresh token rotation |
| **Parsing** | Apache Tika, PDFBox, Apache POI (ATS resume parsing) |
| **Hosting** | S3 Static (frontends), CloudFront CDN (global edge), Lambda (backends) |
| **Compute** | AWS Lambda (Java 21 runtime, SnapStart, EventBridge warming) |
| **API Layer** | API Gateway (REST regional), Lambda proxy integration |
| **Infrastructure** | Terraform, AWS VPC, Route53, ACM, CloudFront WAF, CloudWatch |
| **CI/CD** | GitHub Actions, OIDC, SonarCloud, Trivy, TruffleHog, JaCoCo |
| **Testing** | JUnit 5, Mockito, Vitest, @vitest/coverage-v8, axe-core + Puppeteer (WCAG 2.1 AA) |

---

## Projects

### Portfolio · clarkfoster.com

An authenticated admin portal for managing and showcasing projects, with a public contact form and full WCAG 2.1 AA accessibility compliance.

**Key Features:**
- Dual-token JWT authentication (15-min access + 7-day refresh tokens with atomic rotation)
- Three-layer rate limiting (WAF → Nginx → application-level with brute-force lockout)
- CSRF protection via `CookieCsrfTokenRepository` + `X-XSRF-TOKEN` header coordination
- Per-user session limits (max 5 active refresh tokens, per-token device metadata)
- SMTP-backed contact form (AWS SES in production; Gmail SMTP for local development)
- Accessibility toolbar: font scaling (75%–200%), high contrast, reduced motion, text-to-speech, screen reader mode
- Automated WCAG 2.1 AA testing (axe-core + Puppeteer) blocking merges on failure
- **Portfolio Assistant** (RAG chatbot via dedicated Lambda outside VPC): Spring AI 1.0.8, query expansion, cosine similarity retrieval, reranking, streaming SSE citations

**Structure:**
```
portfolio-backend/
├── controller/     AuthController, ProjectController, ContactController
├── service/        AuthService, ProjectService, EmailService, RefreshTokenService
├── security/       JwtUtil, JwtFilter, CookieUtil, RateLimitingService
├── entity/         User, Project, RefreshToken
└── dto/            LoginRequest, ProjectResponse, ContactRequest, ApiResponse

portfolio-frontend/
├── components/     nav, home, projects, login, contact, footer, accessibility-toolbar, chatbot-launcher
├── services/       auth.service, project.service, contact.service, accessibility.service, chatbot.service
├── guards/         authGuard
└── a11y-tests/     axe-core Puppeteer test suite

portfolio-chatbot-backend/          ← standalone production chatbot Lambda (outside VPC)
├── controller/     PortfolioAssistantController
├── service/        RagService, KnowledgeIngestionService
├── config/         ChatbotConfig (@ConditionalOnExpression)
├── dto/            ChatRequest, ChatResponse, Citation
└── resources/
    ├── knowledge/  bundled at build time from portfolio-backend/src/main/resources/knowledge/
    └── docs/       bundled at build time from /docs/ (via Maven resources configuration)
```

---

### E-Commerce · shop.clarkfoster.com

A full-featured online store with product catalog, persistent cart, multi-step checkout, and order history.

**Key Features:**
- Product catalog with category browsing, search, and pagination
- Guest-to-authenticated cart merge (localStorage ↔ server sync with deduplication)
- Multi-step checkout: customer info → shipping → billing → payment → review → submit
- Order lifecycle tracking (Processing → Shipped → Delivered / Cancelled)
- Spring Data REST for auto-generated read-only endpoints + custom controllers for stateful operations
- PCI-aware card handling (last 4 digits only persisted)
- Order item price snapshots (denormalized for audit trail)

**Structure:**
```
ecommerce-backend/
├── controller/     AuthController, CartController, CheckoutController, OrderController
├── service/        CartServiceImpl, CheckoutServiceImpl
├── entity/         Product, Customer, Order, OrderItem, CartItem, Address, Country, State
├── repository/     Spring Data JPA + Spring Data REST repositories
└── config/         MyDataRestConfig (disables mutation on read-only entities)

ecommerce-frontend/
├── components/     product-list, product-details, cart, checkout, order-history, login, register
├── services/       ProductService, AuthService, CartService, CheckoutService, OrderHistoryService
└── validators/     ShopValidators (whitespace, pattern, length)
```

---

### HireFlow ATS · ats.clarkfoster.com

A purpose-built applicant tracking system with cookie-based JWT auth, role-aware access control, a Kanban recruitment pipeline, resume parsing, candidate scoring, threaded notes, an append-only activity log, follow-up tasks, and tags. The frontend is built on a refined custom design system tuned for non-technical recruiters and hiring managers.

**Key features:**

*Workflow*
- 7-stage Kanban pipeline (Applied → Screening → Interview → Assessment → Offer → Hired / Rejected) with drag-and-drop and optimistic UI
- New **Candidate Detail** page (`/candidates/:id`): threaded notes, activity timeline, per-candidate tasks, multi-tag assignment, in-place stage change
- New **Tasks** page (`/tasks`): "Mine / Open / Overdue / Done / All" tabs, priority + due-date tracking, inline complete and cancel
- Talent search with debounced name/skills filters, stage + job + sort dropdown, saved-sort in localStorage, pagination

*Authentication & roles*
- HTTP-only cookie JWT auth (access 15 min, refresh 7 days) mirroring the Portfolio's pattern (`AuthService`, `JwtUtil`, `CookieUtil`, `JwtRequestFilter`)
- Three roles: **Admin** (full access incl. user management), **Recruiter** (read/write on operational data), **Hiring Manager** (read-only + can add notes and complete assigned tasks)
- Auth interceptor with single-shot silent refresh on 401, then redirect to `/login`
- Per-user session limits (max 5 active refresh tokens), token-rotation on refresh, secure logout that revokes the refresh token

*Demo users (seeded on startup, override with `ATS_*_PASSWORD` env)*

| Username | Default password | Role |
|----------|------------------|------|
| `admin` | `admin123` | Administrator |
| `recruiter` | `recruiter123` | Recruiter |
| `manager` | `manager123` | Hiring Manager |

*Dashboard*
- KPI row: open positions, total candidates, hired this month, open tasks, overdue tasks, active employers
- Pipeline-at-a-glance bars per stage
- Recent activity feed (last 10) + upcoming tasks (next 5 by due date)
- Jobs-by-client donut chart

*Resume parsing & matching*
- Multi-format parsing: PDF (PDFBox), DOCX (Apache POI), TXT — with Tika MIME detection
- Automated extraction of email, phone, name, and 60+ tech skills
- Three-factor candidate scoring: skills match (50%), availability (25%), geographic proximity via Haversine (25%)

*Database & migrations*
- Schema is now managed by **Flyway** (`ats-backend/src/main/resources/db/migration/`):
  - `V1__initial_schema.sql` — jobs, candidates, talent pool, seed data
  - `V2__auth_users.sql` — users (`app_user`) + refresh tokens
  - `V3__notes_activities_tasks_tags.sql` — notes, activities, tasks, tags + candidate_tags join
- Tests use H2 with `MODE=PostgreSQL` and `ddl-auto=create-drop`; Flyway is disabled under the test profile

**Structure:**
```
ats-backend/
├── config/         SecurityConfig (role-based authorize, BCrypt, JWT)
├── controller/     AuthController, UserController, JobController, CandidateController,
│                   DashboardController, TalentPoolController, NoteController,
│                   ActivityController, TaskController, TagController, HealthController
├── service/        AuthService, UserService, CustomUserDetailsService, DemoUserInitializer,
│                   JobService, CandidateService, DashboardService, ResumeParserService,
│                   NoteService, ActivityService, TaskService, TagService, TalentPoolInitializer
├── security/       JwtUtil, JwtRequestFilter, CookieUtil, CurrentUserService
├── entity/         User, Role, RefreshToken, Job, Candidate, PipelineStage, JobStatus,
│                   EmploymentType, CandidateNote, Activity, ActivityType, FollowUpTask,
│                   TaskStatus, TaskPriority, Tag
├── repository/     UserRepository, RefreshTokenRepository, JobRepository, CandidateRepository,
│                   CandidateNoteRepository, ActivityRepository, FollowUpTaskRepository, TagRepository
└── resources/db/migration/  V1, V2, V3 Flyway migrations

ats-frontend/
├── components/     AppShellComponent (top bar + user menu), ToastContainerComponent
├── pages/          DashboardComponent, LoginComponent, JobsComponent, PipelineComponent,
│                   TalentComponent, CandidateDetailComponent, TasksComponent, UsersComponent
├── services/       AuthService (+guard + interceptor), JobService, CandidateService,
│                   DashboardService, NoteService, ActivityService, TaskService, TagService,
│                   UserService, ToastService
└── models/         job, candidate, pipeline, dashboard, auth, note, activity, task, tag
```

---

### Cloud Infrastructure

| Component | Configuration | Monthly Cost |
|-----------|--------------|:------------:|
| **Lambda** | 4 functions (Java 21, SnapStart, EventBridge warming every 2 min) — portfolio: 1024 MB, e-commerce: 2048 MB, ATS: 1024 MB, chatbot: 1024 MB | ~$6–8 |
| **Aurora Serverless v2** | 1 shared cluster (3 databases), PostgreSQL 15.17, 0.5–4 ACU | ~$25–30 |
| **CloudFront** | 3 distributions, global edge caching, TLS termination | ~$3–5 |
| **API Gateway** | 3 REST APIs (regional), Lambda proxy integration | ~$1–2 |
| **CloudFront WAF** | 5 rules (rate limit, OWASP, geo-block), shared WebACL | ~$5–6 |
| **S3** | 3 buckets (static hosting), versioning + encryption | ~$1 |
| **VPC + NAT** | Private subnets, NAT Gateway for Lambda VPC egress | ~$8–10 |
| **CloudWatch** | 7-day log retention across all log groups | ~$1–2 |
| **Route53 + ACM** | 1 hosted zone, wildcard TLS certificate | ~$1 |
| **Total** | | **~$63** |

**Cost decisions:** Serverless Lambda instead of ECS Fargate (~$120/mo saved), CloudFront CDN instead of ALB (~$16/mo saved), 1 shared Aurora cluster instead of 3 (~$50/mo saved). Migrated from ~$200/month Fargate architecture to ~$63/month serverless.

---

## Getting Started

### Prerequisites

- **Java 21** (Eclipse Temurin recommended)
- **Maven 3.9+**
- **Node.js 24 LTS** and **npm 10+** (Node 22+ also works locally)
- **Docker** and **Docker Compose**
- **AWS CLI v2** (for deployment only)
- **Terraform 1.10+** (for infrastructure provisioning only)

### Local Development with Docker

1. **Clone the repository:**
   ```bash
   git clone https://github.com/clark22134/MyPortfolioWebsite.git
   cd MyPortfolioWebsite
   ```

2. **Create a `.env` file** in the project root:
   ```env
   # Portfolio
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your_admin_password
   ADMIN_EMAIL=admin@example.com
   ADMIN_FULLNAME=Admin User
   JWT_SECRET=your_base64_jwt_secret_at_least_32_bytes
   MAIL_USERNAME=your_gmail@gmail.com
   MAIL_PASSWORD=your_gmail_app_password
   CONTACT_EMAIL=your_contact@email.com
   OPENAI_API_KEY=            # optional — enables Portfolio Assistant chatbot in local dev

   # E-Commerce
   ECOMMERCE_JWT_SECRET=your_ecommerce_jwt_secret

   # ATS
   POSTGRES_PASSWORD=your_postgres_password
   JWT_SECRET=your_ats_jwt_secret_at_least_32_bytes      # shared with portfolio if you like
   ATS_ADMIN_PASSWORD=your_admin_password                # optional — defaults to admin123
   ATS_RECRUITER_PASSWORD=your_recruiter_password        # optional — defaults to recruiter123
   ATS_MANAGER_PASSWORD=your_manager_password            # optional — defaults to manager123
   ATS_DEMO_ACCOUNTS_ENABLED=true                        # set false to skip seeding the 3 demo users
   ```

3. **Start all services:**
   ```bash
   docker compose up -d
   ```

4. **Access the applications:**

   | Application | URL |
   |-------------|-----|
   | Portfolio | [http://localhost:4200](http://localhost:4200) |
   | E-Commerce | [http://localhost:8082](http://localhost:8082) |
   | HireFlow ATS | [http://localhost:8084](http://localhost:8084) |

5. **Stop all services:**
   ```bash
   docker compose down
   ```

### Local Development without Docker

1. **Install all dependencies:**
   ```bash
   make install
   ```

2. **Run tests:**
   ```bash
   make test
   ```

3. **Build all applications:**
   ```bash
   make build
   ```

4. **Start the full source-based preview stack (all 3 apps + DB containers):**
   ```bash
   make preview-all
   ```
   Stop it with:
   ```bash
   make preview-all-stop
   ```

See `make help` for the full list of available commands.

### AWS Deployment

1. **Bootstrap Terraform state:**
   ```bash
   cd terraform/bootstrap
   terraform init && terraform apply
   cd ../..
   ```

2. **Provision infrastructure:**
   ```bash
   make terraform-init
   make terraform-plan
   make terraform-apply
   ```

3. **Set up secrets in `.env`:**
   ```bash
   # Add TF_VAR exports for JWT secrets, admin password, and SMTP credentials
   # These are injected as Lambda environment variables via Terraform
   source .env
   ```

4. **Deploy to production:**
   ```bash
   ./scripts/deploy-aws-serverless.sh
   ```
   This builds backend JARs and frontend bundles, uploads JARs to Lambda via S3, syncs frontend assets to S3, publishes SnapStart versions, and invalidates CloudFront caches.

> **Note:** CI/CD via GitHub Actions handles production deployments automatically on pushes to `main`. Manual deployment is only needed for initial setup or out-of-band changes.

---

## Usage

### Portfolio (Admin)

1. Navigate to the login page and authenticate with admin credentials.
2. Add, edit, or remove projects from the showcase.
3. Contact form submissions are delivered via SMTP to the configured email.
4. Use the accessibility toolbar (bottom-right) to adjust font size, contrast, motion, and TTS.

### E-Commerce (Shopper)

1. Browse products by category or search by name.
2. Add items to cart — works as a guest (localStorage) or signed in (server-persisted).
3. Register/login to proceed through checkout with saved addresses.
4. Complete the multi-step checkout: shipping → billing → payment → review → place order.
5. View order history and track order status.

### HireFlow ATS (Recruiter / Hiring Manager / Admin)

1. **Sign in** at `/login` (the page lists three demo accounts — click any to autofill).
2. **Dashboard** (`/`) — KPIs, pipeline-at-a-glance bars, recent activity, upcoming tasks, jobs-by-client donut.
3. **Jobs** (`/jobs`) — group by employer, create/edit jobs (recruiter+), open "Top Matches" to see scored candidates per role.
4. **Pipeline** (`/jobs/:id/pipeline`) — drag-and-drop kanban; clicking a candidate opens the new detail page.
5. **Talent** (`/talent`) — search across all candidates with debounced name/skills filters, stage + job + sort dropdowns; sort selection persists per browser.
6. **Candidate Detail** (`/candidates/:id`) — contact + skills + tags + score, three-tab body (Activity timeline / Notes thread / Tasks), in-place stage change for recruiters.
7. **Tasks** (`/tasks`) — your follow-up queue: Mine / Open / Overdue / Done / All; one-click complete; create from any candidate.
8. **Users** (`/users`, admin only) — create users, change roles, enable/disable, delete.
9. **Sign out** from the user menu (top-right) — revokes the refresh token server-side.

---

## Testing

| Layer | Framework | Scope |
|-------|-----------|-------|
| **Backend Unit** | JUnit 5 + Mockito | Controllers, services, exception handlers |
| **Backend Integration** | Spring Boot Test + H2 | Full context wiring, repository queries |
| **Frontend Unit** | Vitest + @angular/build:unit-test | Components, services, guards (all three frontends) |
| **Accessibility** | axe-core + Puppeteer | WCAG 2.1 AA compliance across 5 pages |
| **Security Scanning** | TruffleHog, Trivy | Secret detection, CVE scanning |
| **Code Quality** | SonarCloud + JaCoCo + V8 coverage | Coverage, code smells, duplication |

**Coverage generation:**
```bash
# Backend — generates target/site/jacoco/jacoco.xml
cd portfolio-backend  && mvn test
cd portfolio-chatbot-backend && mvn test
cd ats-backend        && mvn test
cd ecommerce-backend  && mvn test

# Frontend — generates coverage/lcov.info
cd portfolio-frontend  && npm run test:ci
cd ats-frontend        && npm run test:ci
cd ecommerce-frontend  && npm run test:ci

# Primary app test sweep (3 backends + 3 frontends)
make test

# Chatbot backend tests
cd portfolio-chatbot-backend && mvn test
```

**CI coverage flow:**  
Each test job uploads its coverage file as a GitHub Actions artifact. The `code-quality` job waits for all seven test jobs, downloads the artifacts, and restores them to the paths expected by `sonar-project.properties` before running the SonarCloud scan. This ensures SonarCloud always receives accurate, current coverage data. Combined project coverage across all seven codebases is **81%**.

**Required secrets:** `SONAR_TOKEN` must be set in repository Settings → Secrets.

**Run accessibility tests (Portfolio):**
```bash
cd portfolio-frontend && node a11y-tests/axe-test.js
```

---

## Future Improvements

| Area | Improvement | Rationale |
|------|-------------|-----------|
| **Search** | Add Elasticsearch for product search | Full-text search at scale (100K+ products) |
| **Caching** | Add Redis (ElastiCache) for sessions and queries | Required for multi-instance rate limiting and performance |
| **Resume Parsing** | SQS + Lambda async pipeline | Non-blocking resume processing at scale |
| **Geospatial** | PostGIS for candidate proximity | Spatial indexes for 50K+ candidate searches |
| **Monitoring** | Prometheus + Grafana or CloudWatch dashboards | Application-level metrics and alerting |
| **E2E Testing** | Playwright or Cypress test suites | Browser-based user flow validation |
| **Payments** | Stripe integration for real payment processing | Replace simplified card form with production payment flow |

---

## Documentation

Detailed documentation is available in the [`docs/`](docs/) directory:

| Document | Description |
|----------|-------------|
| [System Overview](docs/SYSTEM_OVERVIEW.md) | High-level system description and goals |
| [Architecture](docs/ARCHITECTURE.md) | Detailed architecture decisions and patterns |
| [Technical Design Decisions](docs/TECHNICAL_DESIGN_DECISIONS.md) | Tradeoffs and rationale |
| [API Documentation](docs/API_DOCUMENTATION.md) | REST API endpoints and contracts |
| [Security Considerations](docs/SECURITY_CONSIDERATIONS.md) | Security measures and threat model |
| [Performance & Scalability](docs/PERFORMANCE_SCALABILITY.md) | Optimization strategies and scaling paths |
| [Testing Strategy](docs/TESTING_STRATEGY.md) | Test pyramid and coverage approach |
| [DevOps Infrastructure](docs/DEVOPS_INFRASTRUCTURE.md) | CI/CD, Terraform, and deployment details |
| [Accessibility](docs/ACCESSIBILITY.md) | WCAG 2.1 AA compliance details |
| [UML Diagrams](docs/UML_DIAGRAMS.md) | System and sequence diagrams |
| [Project Highlights](docs/PROJECT_HIGHLIGHTS.md) | Technical highlights and challenges |
| [Unified Architecture](docs/UNIFIED_ARCHITECTURE.md) | Cross-cutting architecture overview |

---

## License

This project is proprietary. All rights reserved.
