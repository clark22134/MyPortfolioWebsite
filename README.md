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
- [Screenshots](#screenshots)
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
           │ │  2048 MB    │ │       │ │  2048 MB    │ │       │ │  2048 MB    │ │
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
                     │  3 Lambda functions (SnapStart)    │
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
| **Backend** | Spring Boot 3.5.13, Java 21, Spring Security, Spring Data JPA, Spring Data REST |
| **Databases** | Aurora Serverless v2 (1 shared cluster, 3 databases), PostgreSQL 15.17, H2 (local tests) |
| **Auth** | JWT (JJWT), HTTP-only cookies, BCrypt, refresh token rotation |
| **Parsing** | Apache Tika, PDFBox, Apache POI (ATS resume parsing) |
| **Hosting** | S3 Static (frontends), CloudFront CDN (global edge), Lambda (backends) |
| **Compute** | AWS Lambda (Java 21 runtime, SnapStart, EventBridge warming) |
| **API Layer** | API Gateway (REST regional), Lambda proxy integration |
| **Infrastructure** | Terraform, AWS VPC, Route53, ACM, CloudFront WAF, CloudWatch |
| **CI/CD** | GitHub Actions, OIDC, SonarCloud, Trivy, TruffleHog, JaCoCo |
| **Testing** | JUnit 5, Mockito, Vitest, Karma, axe-core + Puppeteer (WCAG 2.1 AA) |

---

## Projects

### Portfolio · clarkfoster.com

An authenticated admin portal for managing and showcasing projects, with a public contact form and full WCAG 2.1 AA accessibility compliance.

**Key Features:**
- Dual-token JWT authentication (15-min access + 7-day refresh tokens with atomic rotation)
- Three-layer rate limiting (WAF → Nginx → application-level with brute-force lockout)
- CSRF protection via `CookieCsrfTokenRepository` + `X-XSRF-TOKEN` header coordination
- Per-user session limits (max 5 active refresh tokens, per-token device metadata)
- SMTP-backed contact form (Gmail integration)
- Accessibility toolbar: font scaling (75%–200%), high contrast, reduced motion, text-to-speech, screen reader mode
- Automated WCAG 2.1 AA testing (axe-core + Puppeteer) blocking merges on failure

**Structure:**
```
portfolio-backend/
├── controller/     AuthController, ProjectController, ContactController
├── service/        AuthService, ProjectService, EmailService, RefreshTokenService
├── security/       JwtUtil, JwtFilter, CookieUtil, RateLimitingService
├── entity/         User, Project, RefreshToken
└── dto/            LoginRequest, ProjectResponse, ContactRequest, ApiResponse

portfolio-frontend/
├── components/     nav, home, projects, login, contact, footer, accessibility-toolbar
├── services/       auth.service, project.service, contact.service, accessibility.service
├── guards/         authGuard
└── a11y-tests/     axe-core Puppeteer test suite
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

A purpose-built applicant tracking system with a Kanban recruitment pipeline, resume parsing, and candidate scoring.

**Key Features:**
- 7-stage Kanban pipeline: Applied → Screening → Interview → Assessment → Offer → Hired / Rejected
- Drag-and-drop pipeline board (Angular CDK) with optimistic UI updates
- Multi-format resume parsing: PDF (PDFBox), DOCX (Apache POI), TXT — with Tika MIME detection
- Automated extraction of email, phone, name, and 60+ tech skills from resumes
- Three-factor candidate scoring: skills match (50%), availability (25%), geographic proximity via Haversine (25%)
- Polymorphic search with NULL-coalescing native SQL (single query handles all filter combinations)
- Talent Pool: system-managed job for candidates uploaded without a specific posting
- Dashboard analytics: candidate distribution, jobs by employer, pipeline metrics

**Structure:**
```
ats-backend/
├── controller/     CandidateController, JobController, TalentPoolController, DashboardController
├── service/        CandidateService, JobService, ResumeParserService, DashboardService
├── entity/         Job, Candidate, PipelineStage (enum)
├── dto/            ParsedResume, StageMoveRequest, TopCandidateMatch, DashboardStats
└── exception/      GlobalExceptionHandler

ats-frontend/
├── pages/          DashboardComponent, JobsComponent, PipelineComponent, TalentComponent
├── services/       JobService, CandidateService, DashboardService
└── models/         Job, Candidate, PipelineStage, DashboardStats
```

---

### Cloud Infrastructure

| Component | Configuration | Monthly Cost |
|-----------|--------------|:------------:|
| **Lambda** | 3 functions (Java 21, SnapStart, 2048 MB), EventBridge warming every 4 min | ~$6–8 |
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

## Screenshots

> Replace these placeholders with actual screenshots.

| Portfolio | E-Commerce | HireFlow ATS |
|-----------|-----------|--------------|
| ![Portfolio Home](docs/screenshots/portfolio-home.png) | ![Product Catalog](docs/screenshots/ecommerce-products.png) | ![Pipeline Board](docs/screenshots/ats-pipeline.png) |
| ![Accessibility Toolbar](docs/screenshots/portfolio-a11y.png) | ![Checkout Flow](docs/screenshots/ecommerce-checkout.png) | ![Resume Upload](docs/screenshots/ats-resume.png) |
| ![Admin Dashboard](docs/screenshots/portfolio-admin.png) | ![Order History](docs/screenshots/ecommerce-orders.png) | ![Dashboard](docs/screenshots/ats-dashboard.png) |

---

## Getting Started

### Prerequisites

- **Java 21** (Eclipse Temurin recommended)
- **Maven 3.9+**
- **Node.js 22+** and **npm 10+**
- **Docker** and **Docker Compose**
- **AWS CLI v2** (for deployment only)
- **Terraform 1.5+** (for infrastructure provisioning only)

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

   # E-Commerce
   ECOMMERCE_JWT_SECRET=your_ecommerce_jwt_secret

   # ATS
   POSTGRES_PASSWORD=your_postgres_password
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

4. **Start the portfolio backend + frontend:**
   ```bash
   make deploy-local
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

### HireFlow ATS (Recruiter)

1. Create job postings with title, department, location, required skills, and employment type.
2. Upload resumes to the Talent Pool — the system automatically parses contact info and skills.
3. Add candidates to specific jobs and move them through pipeline stages via drag-and-drop.
4. Use the dashboard for pipeline analytics and employer-level job distribution.
5. Search candidates by name, skills, or pipeline stage.

---

## Testing

| Layer | Framework | Scope |
|-------|-----------|-------|
| **Backend Unit** | JUnit 5 + Mockito | Controllers, services, exception handlers |
| **Backend Integration** | Spring Boot Test + H2 | Full context wiring, repository queries |
| **Frontend Unit** | Vitest (E-Commerce, ATS), Karma (Portfolio) | Components, services, guards |
| **Accessibility** | axe-core + Puppeteer | WCAG 2.1 AA compliance across 5 pages |
| **Security Scanning** | TruffleHog, Trivy | Secret detection, CVE scanning |
| **Code Quality** | SonarCloud + JaCoCo | Coverage, code smells, duplication |

**Run all tests:**
```bash
make test
```

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

---

## License

This project is proprietary. All rights reserved.
