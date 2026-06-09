# Unified Architecture — Engineering Portfolio

## Architecture Overview

This monorepo houses three production-grade web applications — a **Portfolio site**, an **E-Commerce platform**, and an **Applicant Tracking System** — running on shared serverless cloud infrastructure. Each application is a full-stack vertical slice (Angular SPA → CloudFront CDN → API Gateway → Lambda → Aurora database), deployed as independent serverless services with global edge distribution.

The deliberate selection of three distinct business domains — content management, transactional commerce, and workflow automation — demonstrates breadth across problem spaces while maintaining a unified technology stack, CI/CD pipeline, and infrastructure-as-code foundation. The serverless architecture achieves ~68% cost reduction compared to the previous Fargate implementation.

---

## Unified Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                      INTERNET                                           │
└──────────────────────────────────────┬──────────────────────────────────────────────────┘
                                       │
                              ┌────────▼────────┐
                              │   Route 53 DNS   │
                              │                  │
                              │ clarkfoster.com  │
                              │ shop.  ats.  www.│
                              └───┬────┬────┬────┘
                                  │    │    │
                   ┌──────────────┘    │    └──────────────┐
                   │                   │                   │
          ┌────────▼─────────┐  ┌──────▼──────┐  ┌────────▼─────────┐
          │ CloudFront CDN    │  │CloudFront   │  │ CloudFront CDN    │
          │ Portfolio         │  │E-Commerce   │  │ ATS               │
          │ Global Edge Cache │  │Global Edge  │  │ Global Edge Cache │
          └────────┬──────────┘  └──────┬──────┘  └────────┬──────────┘
                   │                    │                   │
          ┌────────▼────────────────────▼───────────────────▼──────────┐
          │               CloudFront WAF (us-east-1)                    │
          │                                                             │
          │  • Rate Limiting: 2000 req/5min (general)                  │
          │                   20 req/5min (auth endpoints)             │
          │  • AWS Managed Rules: SQL injection, XSS, bad inputs       │
          │  • Geographic restrictions                                 │
          └──────────────────────────┬──────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌───────────────────┐   ┌─────────────────────────┐   ┌───────────────────────┐
│   PORTFOLIO        │   │   E-COMMERCE             │   │   APPLICANT TRACKING  │
│   clarkfoster.com  │   │   shop.clarkfoster.com   │   │   ats.clarkfoster.com │
│                    │   │                           │   │                       │
│ ┌────────────────┐ │   │ ┌─────────────────────┐  │   │ ┌───────────────────┐ │
│ │  FRONTEND       │ │   │ │   FRONTEND           │  │   │ │   FRONTEND         │ │
│ │  S3 Static      │ │   │ │   S3 Static          │  │   │ │   S3 Static        │ │
│ │  Hosting        │ │   │ │   Hosting            │  │   │ │   Hosting          │ │
│ │                 │ │   │ │                      │  │   │ │                    │ │
│ │  Angular 21     │ │   │ │  Angular 21          │  │   │ │  Angular 21        │ │
│ │  TypeScript 5.9 │ │   │ │  Bootstrap 5.3       │  │   │ │  CDK Drag-Drop     │ │
│ │  Versioning On  │ │   │ │  Versioning On       │  │   │ │  Versioning On     │ │
│ │  Encryption     │ │   │ │  Encryption          │  │   │ │  Encryption        │ │
│ │                 │ │   │ │                      │  │   │ │                    │ │
│ │  Features:      │ │   │ │  Features:           │  │   │ │  Features:         │ │
│ │  • WCAG 2.1 AA  │ │   │ │  • Product Catalog   │  │   │ │  • 7-Stage Kanban  │ │
│ │  • A11y Toolbar │ │   │ │  • Cart Management   │  │   │ │  • Resume Upload   │ │
│ │  • Terminal FX  │ │   │ │  • Checkout Flow     │  │   │ │  • Candidate Match │ │
│ │  • TTS / SR     │ │   │ │  • Order History     │  │   │ │  • Dashboard KPIs  │ │
│ └───────┬─────────┘ │   │ └──────────┬───────────┘  │   │ └──────────┬────────┘ │
│         │ /api/*    │   │            │ /api/*       │   │            │ /api/*   │
│         │ (CF proxy)│   │            │ (CF proxy)   │   │            │ (CF proxy)│
│         ▼           │   │            ▼              │   │            ▼           │
│ ┌────────────────┐  │   │ ┌──────────────────────┐  │   │ ┌──────────────────┐  │
│ │  API Gateway    │  │   │ │   API Gateway         │  │   │ │   API Gateway     │  │
│ │  REST Regional  │  │   │ │   REST Regional       │  │   │ │   REST Regional   │  │
│ └───────┬─────────┘  │   │ └──────────┬───────────┘  │   │ └──────────┬────────┘ │
│         ▼            │   │            ▼              │   │            ▼           │
│ ┌────────────────┐   │   │ ┌──────────────────────┐  │   │ ┌──────────────────┐  │
│ │  Lambda         │   │   │ │   Lambda              │  │   │ │   Lambda          │  │
│ │  Backend        │   │   │ │   Backend             │  │   │ │   Backend         │  │
│ │                 │   │   │ │                       │  │   │ │                    │  │
│ │  Spring Boot 3  │   │   │ │  Spring Boot 3        │  │   │ │  Spring Boot 3     │  │
│ │  Java 21        │   │   │ │  Java 21              │  │   │ │  Java 21           │  │
│ │  SnapStart      │   │   │ │  Spring Data REST     │  │   │ │  SnapStart         │  │
│ │  1024 MB        │   │   │ │  SnapStart            │  │   │ │  1024 MB           │  │
│ │  30s timeout    │   │   │ │  2048 MB              │  │   │ │  30s timeout       │  │
│ │  VPC-enabled    │   │   │ │                       │  │   │ │  VPC-enabled       │  │
│ │                 │   │   │ │  Capabilities:        │  │   │ │                    │  │
│ │  Capabilities:  │   │   │ │  • REST auto-expose   │  │   │ │  Capabilities:     │  │
│ │  • Dual JWT     │   │   │ │  • Cart CRUD          │  │   │ │  • Resume Parsing  │  │
│ │    (access +    │   │   │ │  • Order pipeline     │  │   │ │    (Tika, PDFBox,  │  │
│ │     refresh     │   │   │ │  • JWT (1hr, cookie)  │  │   │ │     POI)           │  │
│ │     rotation)   │   │   │ │  • Guest→Auth merge   │  │   │ │  • 3-Factor Match  │  │
│ │  • Rate Limit   │   │   │ │  • PCI-aware card     │  │   │ │    Scoring         │  │
│ │  • CSRF Tokens  │   │   │ │    truncation         │  │   │ │  • Pipeline CRUD   │  │
│ │  • Contact/SMTP │   │   │ │                       │  │   │ │  • Analytics API   │  │
│ │  • Session Caps │   │   │ │                       │  │   │ │  • JWT cookie auth │  │
│ │  • EventBridge  │   │   │ │  • EventBridge        │  │   │ │  • EventBridge     │  │
│ │    Warmer       │   │   │ │    Warmer             │  │   │ │    Warmer          │  │
│ └───────┬─────────┘   │   │ └──────────┬───────────┘  │   │ └──────────┬────────┘  │
│         │             │   │            │              │   │            │           │
│         ▼             │   │            ▼              │   │            ▼           │
│ ┌─────────────────┐   │   │ ┌──────────────────────┐  │   │ ┌──────────────────┐  │
│ │  portfolio DB    │   │   │ │  ecommerce DB         │  │   │ │  ats DB            │  │
│ │  (shared Aurora  │   │   │ │  (shared Aurora        │  │   │ │  (shared Aurora     │  │
│ │   cluster)       │   │   │ │   cluster)             │  │   │ │   cluster)         │  │
│ │                 │   │   │ │                       │  │   │ │                    │  │
│ │  • Users        │   │   │ │  • Products, Orders   │  │   │ │  • Jobs, Candidates│  │
│ │  • Projects     │   │   │ │  • Customers, Cart    │  │   │ │  • Pipeline Stages │  │
│ │  • RefreshTokens│   │   │ │  • Countries/States   │  │   │ │  • Skills, Geo     │  │
│ └─────────────────┘   │   │ │  • Categories         │  │   │ │  • Seeded: 6 jobs  │  │
│                       │   │ │  • 3NF Normalized     │  │   │ │    100 candidates  │  │
└───────────────────────┘   │ └──────────────────────┘  │   │ └──────────────────┘  │
                            │                           │   │                       │
                            └───────────────────────────┘   └───────────────────────┘

        ▲                              ▲                              ▲
        │                              │                              │
        └──────────────────────────────┼──────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │       SHARED INFRASTRUCTURE          │
                    │                                      │
                    │  ┌──────────────────────────────┐    │
                    │  │  AWS Lambda + API Gateway     │    │
                    │  │  4 Lambda Functions (Java 21) │    │
                    │  │  3 REST APIs (regional)       │    │
                    │  │  SnapStart enabled (1-2s cold)│    │
                    │  └──────────────────────────────┘    │
                    │                                      │
                    │  ┌──────────────────────────────┐    │
                    │  │  CloudFront + S3              │    │
                    │  │  3 Distributions (global edge)│    │
                    │  │  3 S3 Buckets (static hosting)│    │
                    │  │  CloudFront WAF (us-east-1)   │    │
                    │  └──────────────────────────────┘    │
                    │                                      │
                    │  ┌──────────────────────────────┐    │
                    │  │  VPC (10.0.0.0/16)            │    │
                    │  │  2 Public + 2 Private Subnets │    │
                    │  │  Internet Gateway (no NAT;    │    │
                    │  │  in-VPC Lambdas have no egress,│   │
                    │  │  DB auth via RDS IAM)         │    │
                    │  │  Security Groups (Lambda→DB)  │    │
                    │  └──────────────────────────────┘    │
                    │                                      │
                    │  ┌──────────────────────────────┐    │
                    │  │  Aurora Serverless v2          │    │
                    │  │  1 Shared Cluster (3 DBs)     │    │
                    │  │  PostgreSQL 15.17, 0.5–4 ACU  │    │
                    │  │  Managed backups + encryption  │    │
                    │  └──────────────────────────────┘    │
                    │                                      │
                    │  ┌──────────────────────────────┐    │
                    │  │  Secrets & Configuration       │    │
                    │  │  • DB Auth: RDS IAM tokens     │    │
                    │  │    (no DB password in env;     │    │
                    │  │    master cred in SM = break-  │    │
                    │  │    glass / provisioning only)  │    │
                    │  │  • OpenAI key (chatbot): SM    │    │
                    │  │    fetched at startup          │    │
                    │  │  • JWT/Admin/SMTP: Terraform   │    │
                    │  │    vars → Lambda env vars      │    │
                    │  └──────────────────────────────┘    │
                    │                                      │
                    │  ┌──────────────────────────────┐    │
                    │  │  CloudWatch Logs               │    │
                    │  │  7 Log Groups (7-day retention)│    │
                    │  │  Lambda + API Gateway logs     │    │
                    │  └──────────────────────────────┘    │
                    │                                      │
                    │  Total Cost: ~$63/month              │
                    │  (~68% reduction from Fargate)       │
                    └──────────────────────────────────────┘


                    ┌──────────────────────────────────────┐
                    │       CI/CD PIPELINE                  │
                    │       (GitHub Actions)                │
                    │                                      │
                    │  PR Validation (10 parallel jobs):   │
                    │  ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
                    │  │Test│ │Lint│ │Sec │ │A11y│        │
                    │  │ ×6 │ │ ×3 │ │Scan│ │Test│        │
                    │  └────┘ └────┘ └────┘ └────┘        │
                    │                                      │
                    │  Production Deploy (5 stages):       │
                    │  ┌─────────┐  ┌──────────┐           │
                    │  │Quality  │─▶│Terraform │           │
                    │  │Gates    │  │Apply     │           │
                    │  └─────────┘  └────┬─────┘           │
                    │                    ▼                  │
                    │  ┌─────────┐  ┌──────────┐           │
                    │  │Build    │─▶│Deploy to │           │
                    │  │JARs+Dist│  │Lambda+S3 │           │
                    │  └─────────┘  └────┬─────┘           │
                    │                    ▼                  │
                    │  ┌──────────────────────┐            │
                    │  │ CloudFront Invalidate│            │
                    │  │ + Smoke Tests + TLS  │            │
                    │  └──────────────────────┘            │
                    │                                      │
                    │  Auth: GitHub OIDC → AWS STS         │
                    │  (Zero static credentials)           │
                    │                                      │
                    │  Scanning: Trivy, TruffleHog,        │
                    │  SonarCloud, npm audit,              │
                    │  mvn dependency-check                │
                    │                                      │
                    │  IaC: Terraform (8 modules, ~2900 LOC)│
                    │  State: S3 + DynamoDB Locking        │
                    └──────────────────────────────────────┘
```

---

## How the Three Applications Relate

These aren't three disconnected side projects — they form a **deliberate engineering portfolio** designed to cover the core problem domains a senior full-stack engineer encounters in production:

| Domain | Application | What It Proves |
|--------|-------------|----------------|
| **Content & Identity** | Portfolio | Auth architecture, accessibility, API design, contact workflows |
| **Transactional Commerce** | E-Commerce | State management (cart), data modeling (3NF), guest-to-auth transitions, payment-adjacent security |
| **Workflow & Automation** | ATS | Document processing (resume parsing), scoring algorithms, drag-and-drop UI, pipeline orchestration |

They share a single monorepo, a single cloud account, and a single CI/CD pipeline — exactly how a small engineering org would run multiple services. The portfolio site at `clarkfoster.com` is the front door; `shop.clarkfoster.com` and `ats.clarkfoster.com` are live demonstrations embedded in it. A hiring manager can read about the architecture and then interact with the running systems.

### Architectural Consistency

All three follow the same layered pattern — **Angular SPA → CloudFront CDN → API Gateway → Spring Boot Lambda → JPA → Aurora PostgreSQL** — but each introduces domain-specific complexity:

- The **Portfolio** backend is the most security-mature: dual JWT tokens with refresh rotation, per-user session limits (max 5), and a two-layer rate limiting stack (CloudFront WAF → application-level lockout). This is the hardened baseline.
- The **E-Commerce** backend introduces **Spring Data REST** for automatic read-only endpoint exposition and a guest-to-authenticated cart merge — a real-world state transition problem. It uses PostgreSQL (migrated from MySQL) with a normalized 3NF schema and PCI-aware card truncation.
- The **ATS** backend adds **document processing** (Apache Tika + PDFBox + POI for multi-format resume parsing) and a **multi-factor scoring algorithm** (skills match 50%, availability 25%, geographic proximity 25%). The frontend introduces CDK drag-and-drop for a 7-stage Kanban pipeline.

### Infrastructure Unification

The cost-optimized serverless infrastructure (~$63/month for three production apps, down from ~$200/month) uses:

- **Aurora Serverless v2**: A single shared PostgreSQL 15.17 cluster with 3 separate databases (portfolio, ecommerce, ats), auto-scaling from 0.5–4 ACU. Replaces the previous sidecar database containers. Provides managed backups, encryption at rest, and automatic scaling based on traffic.
- **Single CloudFront WAF**: One CloudFront-compatible WAF WebACL (deployed in us-east-1) protects all three CloudFront distributions with rate limiting (2000 req/5min general, 20 req/5min for auth endpoints) and AWS managed rules (SQL injection, XSS, bad inputs).
- **Lambda SnapStart**: All four Java Lambda functions (portfolio, portfolio-chatbot, e-commerce, ATS) use SnapStart to reduce cold starts from ~8s to 1-2s by creating snapshots of initialized Spring Boot contexts.
- **CloudFront global CDN**: Three distributions serve static frontends from S3 with edge caching and proxy `/api/*` requests to regional API Gateways. This eliminates the ALB (~$16/month) and reduces data transfer costs.
- **EventBridge warming**: Each Lambda function has a scheduled rule that triggers every 2 minutes to maintain warm execution environments and prevent cold starts during low-traffic periods.
- **Terraform modules** (networking, ACM, S3, CloudFront, CloudFront WAF, API Gateway, Lambda, Aurora) are reusable across all three apps with ~2900 lines of modular infrastructure code. Route 53 records live in the root `main.tf` rather than a dedicated module.

---

## Skills Transfer Matrix

The following table maps engineering capabilities across the three projects, showing how each skill is exercised at different levels of complexity:

| Skill Area | Portfolio | E-Commerce | ATS |
|------------|-----------|------------|-----|
| **Authentication** | Dual JWT + refresh rotation + session caps + CSRF | Single JWT + HTTP-only cookies + guest→auth merge | JWT (HTTP-only cookie) + role-based authorization (ADMIN/RECRUITER/HIRING_MANAGER) |
| **API Design** | RESTful controllers, DTOs, validation | Spring Data REST auto-exposition + custom controllers | CRUD + file upload + scoring endpoints |
| **Data Modeling** | Users, Projects, RefreshTokens (simple) | Products, Orders, Cart, Customers, Countries (3NF normalized) | Jobs, Candidates, Pipeline stages (geographic + temporal) |
| **Frontend Architecture** | Accessibility-first (WCAG 2.1 AA, TTS, screen reader mode) | State management (cart sync, order tracking) | Interactive UI (drag-drop Kanban, file upload, dashboard KPIs) |
| **Security** | 3-layer rate limiting, CSRF, HSTS preload, per-IP lockout | PCI-aware truncation, input validation, secure cookies | Role-based authorization, JWT HTTP-only cookies, input validation |
| **Database** | Aurora Serverless v2 PostgreSQL 15.17 — profile-based table creation | Aurora Serverless v2 PostgreSQL 15.17 — catalog reads, transactional writes, seed scripts | Aurora Serverless v2 PostgreSQL 15.17 — geographic queries, indexed pipeline stages |
| **Document Processing** | — | — | Apache Tika, PDFBox, POI (PDF + DOCX parsing) |
| **Algorithms** | — | Guest-to-auth cart merge logic | Multi-factor candidate scoring (weighted: skills, availability, geography) |
| **Testing** | JUnit + Mockito + axe-core a11y (Puppeteer) | JUnit + Vitest | JUnit + Vitest |
| **DevOps** | Lambda deployment, CloudFront CDN, S3 static hosting | Lambda + S3 + CloudFront + Aurora Serverless v2 | Lambda + S3 + API Gateway, resume upload (12MB limit), Aurora Serverless v2 |

### Progressive Complexity Arc

The three projects form a **learning progression** that mirrors how real systems evolve:

1. **Portfolio** — Demonstrate mastery of the fundamentals: clean REST APIs, robust auth, accessibility, CI/CD. This is the "prove you can build a production-quality service from scratch" project.

2. **E-Commerce** — Introduce transactional complexity: cart state that must survive authentication transitions, normalized relational data, read-heavy auto-exposed endpoints alongside write-heavy custom controllers, and payment-adjacent security constraints.

3. **ATS** — Add domain-specific engineering: document processing pipelines, scoring algorithms with weighted multi-factor evaluation, drag-and-drop UI state management, and analytics dashboards. This is the "prove you can solve non-trivial business problems" project.

Each project builds on patterns established in the previous one. JWT handling, layered architecture, Lambda deployment and Terraform provisioning are consistent throughout — but the business logic complexity ratchets upward with each application.

---

## Technology Stack Summary

```
FRONTEND          BACKEND              DATABASE               INFRASTRUCTURE
─────────         ───────              ────────               ──────────────
Angular 21        Spring Boot 3.5.14    Aurora Serverless v2   AWS Lambda (Java 21)
TypeScript 5.9    Java 21              PostgreSQL 15.17        API Gateway (REST)
RxJS 7.8          Spring Security      0.5–4 ACU scaling      CloudFront CDN
S3 Static         Spring Data JPA                             S3 Buckets
Bootstrap 5.3     Spring Data REST                            CloudFront WAF (us-east-1)
Angular CDK       JWT (jjwt 0.13)                             Route 53
axe-core          Apache Tika 3.0                             CloudWatch
Puppeteer         Apache PDFBox 3.0                           Secrets Manager
                  Apache POI 5.3                              Terraform (~2900 LOC, 8 modules)
                  Lombok 1.18                                 GitHub Actions (OIDC)
                  JaCoCo                                      SnapStart (Lambda optimization)
                                                              EventBridge (warming)
                                                              RDS IAM DB Auth (no NAT)
                                                              SonarCloud
                                                              Trivy / TruffleHog
```

---

## Cost Architecture

| Resource | Monthly Cost | Shared By |
|----------|-------------|-----------|
| Lambda (4 functions, SnapStart + EventBridge warming) | ~$6–8 | All 3 apps + chatbot route |
| Aurora Serverless v2 (1 shared cluster, 3 DBs, 0.5–4 ACU) | ~$35–40 | All 3 apps |
| CloudFront (3 distributions, global edge cache) | ~$3–5 | All 3 apps |
| CloudFront WAF (5 rules, shared WebACL) | ~$5–6 | All 3 apps |
| S3 (3 buckets, static hosting + versioning) | ~$1–2 | All 3 apps |
| API Gateway (3 REST APIs, regional) | ~$1–2 | All 3 apps |
| CloudWatch Logs (7 log groups) | ~$1–2 | All 3 apps + chatbot route |
| Route 53 (hosted zone + queries) | ~$0.50 | All 3 apps |
| S3 + DynamoDB (Terraform state) | <$1 | IaC state |
| **Total** | **~$63/month** | — |

**Previous Fargate Architecture:** ~$200/month
**Cost Reduction:** ~68% (~$137/month savings)

Three production applications — with TLS, global CDN, CloudFront WAF, managed database, and CI/CD — for ~$63/month. The serverless architecture eliminates the always-on costs of Fargate tasks ($120-150) and ALB ($16-18). Aurora Serverless v2 auto-scales based on demand, and Lambda charges only for actual request execution time. This is the correct architectural decision for a portfolio demonstrating infrastructure optimization skills at demo traffic levels.

**Cost vs. Fargate Comparison:**
- **Compute:** $120-150/month (Fargate 24/7) → $6-8/month (Lambda pay-per-request)
- **Load Balancing:** $16-18/month (ALB) → $3-5/month (CloudFront)
- **Database:** $0/month (sidecar containers) → $35-40/month (Aurora Serverless v2, 1 shared cluster with backups + encryption + managed scaling)
- **Total Savings:** ~$137/month despite upgrading to a managed database cluster

---

*This document describes the unified serverless system architecture as of the latest deployment. All three applications are live and accessible at their respective subdomains.*
