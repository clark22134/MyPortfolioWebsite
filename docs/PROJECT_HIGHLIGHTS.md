# Project Highlights

## 1. Portfolio Platform — clarkfoster.com

**The Problem:**
Most developer portfolios are static sites that demonstrate nothing about the developer's actual production engineering skills. This project flips that premise: the portfolio *itself* is the proof of competence — a fully authenticated, production-deployed platform with admin-managed content, a contact system backed by SMTP, and WCAG 2.1 AA accessibility compliance.

**What Makes It Technically Interesting:**
- A **dual-token JWT architecture** with 15-minute access tokens and 7-day refresh tokens stored in HTTP-only cookies. Refresh token rotation is atomic — old token revocation and new token creation happen in a single database transaction. Each token carries device metadata (user agent, IP) for session forensics, and per-user limits (max 5 active refresh tokens) prevent session proliferation.
- **Three-layer rate limiting** that goes well beyond a single WAF rule: AWS WAF enforces global and auth-specific thresholds, Nginx enforces protocol-level limits, and the Spring Boot application tracks per-IP+username attempts with a 30-minute lockout after 5 failures. Each layer catches what the one above it can't.
- A full **accessibility toolbar** (font scaling, high contrast, reduced motion, text-to-speech via Web Speech API, screen reader mode with ARIA live regions) — not as an afterthought, but enforced by automated axe-core + Puppeteer checks that run against 5 pages and block merges on failure. Color contrast ratios are 7.44:1+ on accents and 16.15:1 on body text.

**Challenges Faced:**
The main tension was between stateless JWT auth and the need for token revocation. Pure stateless JWTs can't be revoked. The solution: access tokens are verified statelessly (signature check only), but refresh tokens require a database lookup to check revocation status. This keeps 99% of requests fast (no DB hit) while still allowing immediate session termination when needed. Coordinating the CSRF protection across this setup — Spring Security's `CookieCsrfTokenRepository` on the backend, Angular's `X-XSRF-TOKEN` header injection on the frontend, plus SameSite cookie policy — required understanding the full request lifecycle across all layers.

---

## 2. E-Commerce Platform — shop.clarkfoster.com

**The Problem:**
Build a full shopping experience — product catalog with category browsing, persistent cart, multi-step checkout with address management, order history with status tracking — that handles the messy real-world transitions between guest and authenticated states without losing user data.

**What Makes It Technically Interesting:**
- The **guest-to-authenticated cart merge** is deceptively hard to get right. Guest users have a localStorage cart. On login, the system fetches the server-side cart, merges it with the guest cart (deduplicating by product ID, summing quantities), persists the merged state server-side, and updates the frontend. On logout, the user's cart is saved server-side and the frontend reverts to a guest localStorage key. Edge cases — user adds items as guest, logs in, adds more items, logs out, logs back in — are handled without data loss.
- **Spring Data REST** auto-exposes read-only product/category endpoints with pagination, filtering, and HAL hypermedia links out of the box, while custom controllers handle stateful operations (cart, checkout, orders) with explicit business logic. The boundary between auto-generated CRUD and hand-written transactional logic is clean: `MyDataRestConfig` disables PUT/POST/DELETE on read-only entities.
- **PCI-aware data handling**: credit card numbers are truncated to the last 4 digits *before* persistence via a `maskCardNumber()` method called on every save. Order items snapshot the product price at purchase time — a deliberate denormalization that preserves the audit trail when prices change later.

**Challenges Faced:**
Pagination offset conversion between Spring's 0-based pages and ng-bootstrap's 1-based pagination component caused subtle off-by-one bugs. The frontend had to translate between the two conventions while preserving search state across page navigations. The checkout flow also required careful transaction design — creating an `Order`, snapshotting the current product prices into `OrderItems`, snapshotting the shipping/billing addresses, generating a UUID tracking number, and decrementing inventory all need to succeed or fail atomically within a single `@Transactional` boundary.

---

## 3. HireFlow ATS — ats.clarkfoster.com

**The Problem:**
Applicant tracking systems are either expensive SaaS products or spreadsheets. Build a purpose-built recruiting tool with a 7-stage Kanban pipeline (Applied → Screening → Interview → Assessment → Offer → Hired/Rejected), automated resume parsing, and intelligent candidate scoring — the kind of system that a 50-person company could actually use.

**What Makes It Technically Interesting:**
- A **multi-format resume parsing pipeline** using Apache Tika for MIME type detection (prevents disguised malicious files), PDFBox for PDFs, Apache POI for DOCX, with regex-based extraction of emails, phone numbers, and names, then substring matching against 60+ recognized tech skills. The parsed text is stored in the database, which leaves the door open for future NLP or embedding-based matching without re-processing files. Uploaded files are stored with UUID filenames and validated against a strict regex pattern before serving — no path traversal, no user-controlled filenames reaching the filesystem.
- A **three-factor weighted candidate scoring algorithm**: skills match (50% weight, normalized as matched/required ratio), availability (25%, normalized by days since last assignment up to a 730-day cap), and geographic proximity (25%, using Haversine distance normalized to a 50-mile radius). This isn't keyword matching — it's a composite score that balances competency, availability, and logistics.
- The **Kanban pipeline** uses Angular CDK drag-and-drop with optimistic UI updates. When a candidate card is dragged between stages, the frontend updates immediately while a PATCH request fires to update the `stage` and `stageOrder` fields. The native SQL search query uses elegant NULL coalescing — optional parameters (name, stage, jobId) are ignored when NULL, making it a single polymorphic query rather than a combinatorial explosion of query methods.

**Challenges Faced:**
The "Talent Pool" concept required a design decision: candidates uploaded via resume (without an explicit job posting) need to exist somewhere. The solution is an auto-created system job (employer=`SYSTEM`, title=`Talent Pool`) created idempotently at startup. This avoids a separate table, keeps the data model consistent, and allows talent pool candidates to be moved to real jobs through the same pipeline mechanics. Resume parsing accuracy was another challenge — Tika's format detection is reliable, but extracting structured data (name, phone, skills) from unstructured resume text is inherently fuzzy. The approach uses pragmatic regex patterns rather than over-engineering an ML solution for a problem domain where 85% accuracy is sufficient for initial triage.

---

## 4. Shared Cloud Infrastructure

**The Problem:**
Run three distinct production applications with separate frontends, backends, and databases on AWS without the cost spiraling to hundreds of dollars a month or the operational complexity requiring a dedicated DevOps team.

**What Makes It Technically Interesting:**
- **Single-cluster, multi-tenant ECS Fargate architecture** running 6 services behind one ALB with host-based routing. The ALB listener rules route `shop.clarkfoster.com/api/*` to the e-commerce backend, `ats.clarkfoster.com/api/*` to the ATS backend, and `clarkfoster.com/api/*` to the portfolio backend — with frontend fallbacks for each domain. This saves ~$32/month versus running three separate ALBs, which adds up when the goal is a sustainable personal deployment.
- **Database sidecars** (MySQL for e-commerce, PostgreSQL for the other two) run as containers within the same ECS task as their respective backends. This eliminates the ~$45/month RDS cost and simplifies networking (the backend connects to `localhost`). The tradeoff — ephemeral storage, no automated backups, no replication — is documented and acceptable for a portfolio workload. Container dependency ordering ensures the database is healthy (via `mysqladmin ping` / `pg_isready`) before the backend starts.
- **Six Terraform modules** (networking, ACM, ALB, ECS, Route53, WAF) provision the entire stack with remote state in S3 and DynamoDB locking. The ECS module uses `lifecycle { ignore_changes = [task_definition] }` so Terraform manages infrastructure while GitHub Actions manages deployments — neither steps on the other. CI/CD uses **GitHub OIDC** for AWS authentication (no long-lived credentials), and deployments include circuit breakers with automatic rollback.
- **Defense in depth**: AWS WAF with 6 rules (general rate limiting at 2000 req/5min, auth-specific limiting at 20 req/5min, three AWS managed rule sets for OWASP/SQLi/bad inputs, geo-restriction to US), ALB enforcing TLS 1.2+ with the `ELBSecurityPolicy-TLS13-1-2-2021-06` policy, Nginx security headers (HSTS, CSP, X-Frame-Options), and application-level security stacked on top.
- **All-in cost: ~$95/month** for three production applications with TLS, WAF protection, container orchestration, secrets management, and DNS. Scaling is a single Terraform variable change.

**Challenges Faced:**
The biggest infrastructure challenge was cost containment without sacrificing production-grade practices. NAT Gateways alone would add ~$32/month, so the services run in public subnets with security groups restricting ingress to the ALB only. RDS would add ~$45/month per database, so the sidecar pattern was chosen with documented migration paths for when scale demands it. Every cost optimization has a corresponding documented tradeoff and upgrade path — this isn't cutting corners, it's right-sizing for actual traffic while keeping the architecture horizontally scalable.

---

## Why This Demonstrates Senior-Level Ability

These projects aren't three toy apps deployed to Heroku. They represent a cohesive body of work where every layer — from PostgreSQL schema design to Terraform module composition to Angular CDK drag-and-drop — was built, tested, deployed, and operated by one person.

**Architectural judgment** shows in the tradeoffs: stateless JWTs with stateful refresh tokens, Spring Data REST for reads with hand-written controllers for writes, database sidecars with documented RDS migration paths, optimistic UI updates with server reconciliation. These are decisions that require understanding the entire stack, not just the layer you're working on.

**Security thinking** is systemic, not checkbox-driven: three-layer rate limiting, HTTP-only cookies with SameSite policy, CSRF coordination across frontend and backend, file upload validation with MIME detection and UUID storage, PCI-aware card truncation, OIDC-based CI/CD with no long-lived AWS credentials.

**Operational maturity** shows in what's *around* the code: Terraform modules with remote state locking, deployment circuit breakers with automatic rollback, ECR lifecycle policies, 7-day log retention, health check tuning (120–180s grace periods for JVM startup), SonarCloud quality gates, automated accessibility testing, and secrets rotation scripts.

The fact that this runs in production at ~$95/month — with WAF, TLS, container orchestration, and automated deployments — demonstrates the kind of cost-conscious infrastructure thinking that distinguishes senior engineers who've been responsible for a cloud bill from those who haven't.
