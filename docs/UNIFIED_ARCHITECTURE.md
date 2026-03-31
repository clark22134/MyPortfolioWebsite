# Unified Architecture — Engineering Portfolio

## Architecture Overview

This monorepo houses three production-grade web applications — a **Portfolio site**, an **E-Commerce platform**, and an **Applicant Tracking System** — running on shared cloud infrastructure. Each application is a full-stack vertical slice (Angular SPA → Spring Boot API → relational database), deployed as independent services behind a single AWS Application Load Balancer with host-based routing.

The deliberate selection of three distinct business domains — content management, transactional commerce, and workflow automation — demonstrates breadth across problem spaces while maintaining a unified technology stack, CI/CD pipeline, and infrastructure-as-code foundation.

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
                              └────────┬─────────┘
                                       │
                              ┌────────▼─────────┐
                              │   AWS WAF v2      │
                              │                   │
                              │ • Rate Limiting   │
                              │   2000 req/5min   │
                              │   20 req/5min     │
                              │   (auth endpoints)│
                              │ • Managed Rules   │
                              │   (SQLi, XSS,     │
                              │    Known Bad       │
                              │    Inputs)         │
                              │ • Geo-Restriction  │
                              └────────┬──────────┘
                                       │
                              ┌────────▼──────────┐
                              │  Application Load  │
                              │   Balancer (ALB)   │
                              │                    │
                              │  TLS Termination   │
                              │  (ACM Certificate) │
                              │                    │
                              │  Host-Based Rules: │
                              │  ┌──────────────┐  │
                              │  │clarkfoster   │──┼──► Portfolio TGs
                              │  │shop.clark... │──┼──► E-Commerce TGs
                              │  │ats.clark...  │──┼──► ATS TGs
                              │  └──────────────┘  │
                              └────────┬──────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌───────────────────┐   ┌─────────────────────────┐   ┌───────────────────────┐
│   PORTFOLIO        │   │   E-COMMERCE             │   │   APPLICANT TRACKING  │
│   clarkfoster.com  │   │   shop.clarkfoster.com   │   │   ats.clarkfoster.com │
│                    │   │                           │   │                       │
│ ┌────────────────┐ │   │ ┌─────────────────────┐  │   │ ┌───────────────────┐ │
│ │  FRONTEND       │ │   │ │   FRONTEND           │  │   │ │   FRONTEND         │ │
│ │  Fargate Task   │ │   │ │   Fargate Task       │  │   │ │   Fargate Task     │ │
│ │                 │ │   │ │                      │  │   │ │                    │ │
│ │  Angular 21     │ │   │ │  Angular 21          │  │   │ │  Angular 21        │ │
│ │  Nginx Alpine   │ │   │ │  Bootstrap 5.3       │  │   │ │  CDK Drag-Drop     │ │
│ │  256 CPU / 512M │ │   │ │  Nginx Alpine        │  │   │ │  Nginx Alpine      │ │
│ │                 │ │   │ │  256 CPU / 512M      │  │   │ │  256 CPU / 512M    │ │
│ │  Features:      │ │   │ │                      │  │   │ │                    │ │
│ │  • WCAG 2.1 AA  │ │   │ │  Features:           │  │   │ │  Features:         │ │
│ │  • A11y Toolbar │ │   │ │  • Product Catalog   │  │   │ │  • 7-Stage Kanban  │ │
│ │  • Terminal FX  │ │   │ │  • Cart Management   │  │   │ │  • Resume Upload   │ │
│ │  • TTS / SR     │ │   │ │  • Checkout Flow     │  │   │ │  • Candidate Match │ │
│ └───────┬─────────┘ │   │ │  • Order History     │  │   │ │  • Dashboard KPIs  │ │
│         │ /api/*    │   │ └──────────┬───────────┘  │   │ └──────────┬────────┘ │
│         ▼           │   │            │ /api/*       │   │            │ /api/*   │
│ ┌────────────────┐  │   │ ┌──────────▼───────────┐  │   │ ┌──────────▼────────┐ │
│ │  BACKEND        │  │   │ │   BACKEND             │  │   │ │   BACKEND          │ │
│ │  Fargate Task   │  │   │ │   Fargate Task        │  │   │ │   Fargate Task     │ │
│ │                 │  │   │ │                       │  │   │ │                    │ │
│ │  Spring Boot 4  │  │   │ │  Spring Boot 4        │  │   │ │  Spring Boot 4     │ │
│ │  Java 25        │  │   │ │  Java 25              │  │   │ │  Java 25           │ │
│ │  512 CPU / 1G   │  │   │ │  Spring Data REST     │  │   │ │  512 CPU / 1G      │ │
│ │                 │  │   │ │  512 CPU / 2G         │  │   │ │                    │ │
│ │  Capabilities:  │  │   │ │                       │  │   │ │  Capabilities:     │ │
│ │  • Dual JWT     │  │   │ │  Capabilities:        │  │   │ │  • Resume Parsing  │ │
│ │    (access +    │  │   │ │  • REST auto-expose   │  │   │ │    (Tika, PDFBox,  │ │
│ │     refresh     │  │   │ │  • Cart CRUD          │  │   │ │     POI)           │ │
│ │     rotation)   │  │   │ │  • Order pipeline     │  │   │ │  • 3-Factor Match  │ │
│ │  • 3-Layer Rate │  │   │ │  • JWT (1hr, cookie)  │  │   │ │    Scoring         │ │
│ │    Limiting     │  │   │ │  • Guest→Auth merge   │  │   │ │  • Pipeline CRUD   │ │
│ │  • CSRF Tokens  │  │   │ │  • PCI-aware card     │  │   │ │  • Analytics API   │ │
│ │  • Contact/SMTP │  │   │ │    truncation         │  │   │ │  • CORS-restricted │ │
│ │  • Session Caps │  │   │ │                       │  │   │ │                    │ │
│ └───────┬─────────┘  │   │ └──────────┬───────────┘  │   │ └──────────┬────────┘ │
│         │            │   │            │              │   │            │           │
│         ▼            │   │            ▼              │   │            ▼           │
│ ┌────────────────┐   │   │ ┌──────────────────────┐  │   │ ┌──────────────────┐  │
│ │  PostgreSQL     │   │   │ │   MySQL 8 (Sidecar)   │  │   │ │  PostgreSQL 16    │  │
│ │  (H2 dev /     │   │   │ │                       │  │   │ │  (Sidecar)        │  │
│ │   Postgres prod)│   │   │ │  • Products, Orders  │  │   │ │                   │  │
│ │                 │   │   │ │  • Customers, Cart   │  │   │ │  • Jobs, Candidates│  │
│ │  • Users        │   │   │ │  • Countries/States  │  │   │ │  • Pipeline Stages │  │
│ │  • Projects     │   │   │ │  • Categories        │  │   │ │  • Skills, Geo     │  │
│ │  • RefreshTokens│   │   │ │  • 3NF Normalized    │  │   │ │  • Seeded: 6 jobs  │  │
│ └─────────────────┘   │   │ └──────────────────────┘  │   │ │    100 candidates  │  │
│                       │   │                           │   │ └──────────────────┘  │
└───────────────────────┘   └───────────────────────────┘   └───────────────────────┘

        ▲                              ▲                              ▲
        │                              │                              │
        └──────────────────────────────┼──────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │       SHARED INFRASTRUCTURE          │
                    │                                      │
                    │  ┌──────────────────────────────┐    │
                    │  │  ECS Fargate Cluster          │    │
                    │  │  6 Services, 8 ECR Repos      │    │
                    │  │  Sidecar DB Pattern            │    │
                    │  └──────────────────────────────┘    │
                    │                                      │
                    │  ┌──────────────────────────────┐    │
                    │  │  VPC (10.0.0.0/16)            │    │
                    │  │  2 Public Subnets             │    │
                    │  │  Internet Gateway             │    │
                    │  │  Security Groups (ALB-only)   │    │
                    │  └──────────────────────────────┘    │
                    │                                      │
                    │  ┌──────────────────────────────┐    │
                    │  │  AWS Secrets Manager           │    │
                    │  │  • JWT Signing Keys            │    │
                    │  │  • Admin Credentials           │    │
                    │  │  • SMTP Credentials            │    │
                    │  │  • DB Passwords                │    │
                    │  └──────────────────────────────┘    │
                    │                                      │
                    │  ┌──────────────────────────────┐    │
                    │  │  CloudWatch Logs               │    │
                    │  │  8 Log Groups (7-day retention)│    │
                    │  │  Container Insights            │    │
                    │  └──────────────────────────────┘    │
                    │                                      │
                    │  Total Cost: ~$95/month              │
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
                    │  │Build &  │─▶│Deploy to │           │
                    │  │Push ECR │  │ECS ×3    │           │
                    │  └─────────┘  └────┬─────┘           │
                    │                    ▼                  │
                    │  ┌──────────────────────┐            │
                    │  │ Smoke Tests + TLS    │            │
                    │  │ Verification         │            │
                    │  └──────────────────────┘            │
                    │                                      │
                    │  Auth: GitHub OIDC → AWS STS         │
                    │  (Zero static credentials)           │
                    │                                      │
                    │  Scanning: Trivy, TruffleHog,        │
                    │  SonarCloud, npm audit,              │
                    │  mvn dependency-check, CodeRabbit    │
                    │                                      │
                    │  IaC: Terraform (6 modules, ~800 LOC)│
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

They share a single monorepo, a single cloud account, a single ALB, and a single CI/CD pipeline — exactly how a small engineering org would run multiple services. The portfolio site at `clarkfoster.com` is the front door; `shop.clarkfoster.com` and `ats.clarkfoster.com` are live demonstrations embedded in it. A hiring manager can read about the architecture and then interact with the running systems.

### Architectural Consistency

All three follow the same layered pattern — **Angular SPA → Nginx reverse proxy → Spring Boot REST API → JPA → relational database** — but each introduces domain-specific complexity:

- The **Portfolio** backend is the most security-mature: dual JWT tokens with refresh rotation, per-user session limits (max 5), and a three-layer rate limiting stack (WAF → Nginx → application-level lockout). This is the hardened baseline.
- The **E-Commerce** backend introduces **Spring Data REST** for automatic read-only endpoint exposition and a guest-to-authenticated cart merge — a real-world state transition problem. It uses MySQL with a normalized 3NF schema and PCI-aware card truncation.
- The **ATS** backend adds **document processing** (Apache Tika + PDFBox + POI for multi-format resume parsing) and a **multi-factor scoring algorithm** (skills match 50%, availability 25%, geographic proximity 25%). The frontend introduces CDK drag-and-drop for a 7-stage Kanban pipeline.

### Infrastructure Unification

The cost-optimized infrastructure (~$95/month for three production apps) uses:

- **Sidecar database pattern**: MySQL and PostgreSQL run as sidecar containers inside Fargate tasks rather than managed RDS instances, cutting database costs by ~$45/month while remaining acceptable for demo-scale traffic.
- **Single ALB with host-based routing**: One load balancer serves three domains via listener rules, avoiding the cost of three separate ALBs (~$48/month savings).
- **Shared ECS Fargate cluster**: Six services (3 frontends + 3 backends) run in one cluster with right-sized CPU/memory allocations.
- **Terraform modules** (networking, ACM, ALB, ECS, Route53, WAF) are reusable across all three apps.

---

## Skills Transfer Matrix

The following table maps engineering capabilities across the three projects, showing how each skill is exercised at different levels of complexity:

| Skill Area | Portfolio | E-Commerce | ATS |
|------------|-----------|------------|-----|
| **Authentication** | Dual JWT + refresh rotation + session caps + CSRF | Single JWT + HTTP-only cookies + guest→auth merge | CORS-restricted public demo |
| **API Design** | RESTful controllers, DTOs, validation | Spring Data REST auto-exposition + custom controllers | CRUD + file upload + scoring endpoints |
| **Data Modeling** | Users, Projects, RefreshTokens (simple) | Products, Orders, Cart, Customers, Countries (3NF normalized) | Jobs, Candidates, Pipeline stages (geographic + temporal) |
| **Frontend Architecture** | Accessibility-first (WCAG 2.1 AA, TTS, screen reader mode) | State management (cart sync, order tracking) | Interactive UI (drag-drop Kanban, file upload, dashboard KPIs) |
| **Security** | 3-layer rate limiting, CSRF, HSTS preload, per-IP lockout | PCI-aware truncation, input validation, secure cookies | CORS restriction, input validation |
| **Database** | PostgreSQL (prod) / H2 (dev) — profile-based switching | MySQL 8 — catalog reads, transactional writes, seed scripts | PostgreSQL 16 — geographic queries, indexed pipeline stages |
| **Document Processing** | — | — | Apache Tika, PDFBox, POI (PDF + DOCX parsing) |
| **Algorithms** | — | Guest-to-auth cart merge logic | Multi-factor candidate scoring (weighted: skills, availability, geography) |
| **Testing** | JUnit + Mockito + axe-core a11y (Puppeteer) | JUnit + Vitest | JUnit + Vitest |
| **DevOps** | Multi-stage Docker, Nginx config, ECS task def | Sidecar DB pattern, healthchecks, ECS task def | Sidecar DB pattern, resume upload (12MB limit), ECS task def |

### Progressive Complexity Arc

The three projects form a **learning progression** that mirrors how real systems evolve:

1. **Portfolio** — Nail the fundamentals: clean REST APIs, robust auth, accessibility, CI/CD. This is the "prove you can build a production-quality service from scratch" project.

2. **E-Commerce** — Introduce transactional complexity: cart state that must survive authentication transitions, normalized relational data, read-heavy auto-exposed endpoints alongside write-heavy custom controllers, and payment-adjacent security constraints.

3. **ATS** — Add domain-specific engineering: document processing pipelines, scoring algorithms with weighted multi-factor evaluation, drag-and-drop UI state management, and analytics dashboards. This is the "prove you can solve non-trivial business problems" project.

Each project builds on patterns established in the previous one. JWT handling, layered architecture, Docker packaging, ECS deployment, and Terraform provisioning are consistent throughout — but the business logic complexity ratchets upward with each application.

---

## Technology Stack Summary

```
FRONTEND          BACKEND              DATABASE          INFRASTRUCTURE
─────────         ───────              ────────          ──────────────
Angular 21        Spring Boot 4.0.4    PostgreSQL 16     AWS ECS Fargate
TypeScript 5.9    Java 25              MySQL 8           Application Load Balancer
RxJS 7.8          Spring Security      H2 (dev)          Route 53
Nginx Alpine      Spring Data JPA                        AWS WAF v2
Bootstrap 5.3     Spring Data REST                       ACM (TLS)
Angular CDK       JWT (jjwt 0.13)                        CloudWatch
axe-core          Apache Tika 3.0                        Secrets Manager
Puppeteer         Apache PDFBox 3.0                      Terraform (~800 LOC)
                  Apache POI 5.3                         GitHub Actions (OIDC)
                  Lombok 1.18                            Docker (multi-stage)
                  JaCoCo                                 SonarCloud
                                                         Trivy / TruffleHog
```

---

## Cost Architecture

| Resource | Monthly Cost | Shared By |
|----------|-------------|-----------|
| ECS Fargate (6 services) | ~$40–50 | All 3 apps |
| Application Load Balancer | ~$16 | All 3 apps |
| Data Transfer | ~$10–15 | All 3 apps |
| AWS WAF (6 rules) | ~$5 | All 3 apps |
| CloudWatch Logs | ~$5–10 | All 3 apps |
| ECR (8 repos) | ~$1 | All 3 apps |
| Route 53 | ~$0.50 | All 3 apps |
| S3 + DynamoDB (Terraform) | <$1 | IaC state |
| **Total** | **~$95/month** | — |

Three production applications — with TLS, WAF, observability, and CI/CD — for under $100/month. The sidecar database pattern and single-ALB routing are the key cost drivers. This is a conscious trade-off: managed RDS would be the correct call at production scale, but for a portfolio demonstrating infrastructure skills at demo traffic, it's the right architectural decision.

---

*This document describes the unified system architecture as of the latest deployment. All three applications are live and accessible at their respective subdomains.*
