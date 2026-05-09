# Technical Design & Decisions

**Author:** Clark Foster
**Last Updated:** April 2026

---

## Table of Contents

1. [Tech Stack Selection](#1-tech-stack-selection)
2. [Design Patterns & Architecture](#2-design-patterns--architecture)
3. [Database Strategy](#3-database-strategy)
4. [Cloud Infrastructure & Deployment](#4-cloud-infrastructure--deployment)
5. [Security Architecture](#5-security-architecture)
6. [Scalability Considerations](#6-scalability-considerations)
7. [Cost Analysis & Optimization](#7-cost-analysis--optimization)
8. [Trade-offs & Known Limitations](#8-trade-offs--known-limitations)

---

## 1. Tech Stack Selection

### 1.1 Backend — Spring Boot 3.5.13 / Java 21

| Criterion | Choice | Alternatives Considered |
|-----------|--------|------------------------|
| Language | Java 21 | Kotlin, Go, Node.js (Express/NestJS) |
| Framework | Spring Boot 3.5.13 | Quarkus, Micronaut, Django, FastAPI |
| Build Tool | Maven 3 | Gradle |

**Why Java + Spring Boot:**

Spring Boot was the deliberate choice here, not the default one. The three applications each have different data access patterns — the portfolio uses Spring Data JPA with a clean entity model, the e-commerce platform leans on Spring Data REST for auto-exposed read-only endpoints (products, categories, countries), and the ATS backend does heavier processing with Apache Tika, PDFBox, and POI for resume parsing. Spring's ecosystem handled all three without introducing additional frameworks.

Java 21 over Kotlin: Kotlin is excellent, but every Spring tutorial, Stack Overflow answer, and debugging resource defaults to Java. For a portfolio that other engineers will read and evaluate, Java reduces friction. Virtual threads (Project Loom) in modern Java also close the async gap that used to favor Kotlin coroutines.

Why not Go: Go would have been faster at startup and lighter on memory, which matters on Fargate billing. But Go's ecosystem for full-stack web applications — ORM tooling, security middleware, mail integration — requires stitching together many libraries. Spring provides all of that out of the box with battle-tested defaults.

Why not Node.js/NestJS: Type safety across the full stack (Angular + NestJS) is appealing. But Spring Security's authentication/authorization model, JPA's entity mapping, and Actuator's production-readiness features are significantly more mature than their Node equivalents. The JVM's memory overhead is the trade-off, and it's acceptable at this scale.

Why Maven over Gradle: Maven is more verbose, but its build lifecycle is deterministic and well-understood. Gradle builds can be faster with caching, but the Groovy/Kotlin DSL adds cognitive load when debugging build failures. For a project where the build configuration rarely changes, Maven's declarative XML is simpler to maintain.

### 1.2 Frontend — Angular 21

| Criterion | Choice | Alternatives Considered |
|-----------|--------|------------------------|
| Framework | Angular 21 | React 19, Vue 3, Svelte 5 |
| UI Libraries | Bootstrap 5.3, ng-bootstrap, Angular CDK | Tailwind, Material, PrimeNG |
| Test Runner | Vitest / Karma+Jasmine | Jest, Playwright |

**Why Angular:**

Angular was chosen for its opinionated structure. Three separate frontend applications — portfolio, e-commerce, and ATS — share the same Angular version, CLI toolchain, and project conventions. A developer switching between them knows exactly where to find components, services, guards, and interceptors. React would give more flexibility per-project, but that flexibility becomes inconsistency in a monorepo with three SPAs.

Angular's built-in dependency injection, typed forms, HTTP interceptors, and route guards reduced the number of third-party libraries needed. The e-commerce checkout flow uses reactive forms with validation — that's native Angular, not a plugin. The ATS Kanban board uses Angular CDK's drag-and-drop — again, first-party. React would have required `react-hook-form`, `react-dnd`, and a routing library, each with their own upgrade cycles.

Standalone components (no NgModules) keep the bundle lean and the dependency graph explicit. Each component declares exactly what it imports — no module-level side effects.

**UI library choices diverge by project intentionally:**

- **Portfolio:** Minimal dependencies — custom SCSS with CSS variables for theming, accessibility toolbar, and high-contrast mode. No CSS framework. The portfolio's visual identity needs to be unique, not Bootstrap-generic.
- **E-Commerce:** Bootstrap 5.3 + ng-bootstrap + FontAwesome. An e-commerce store should look familiar, not novel. Bootstrap's grid, cards, and form components let the product catalog and checkout flow feel conventional. Customers expect this visual language.
- **ATS:** Angular CDK only. The Kanban pipeline board and candidate modals are custom components. CDK provides the low-level drag-and-drop primitives without imposing Material Design's visual opinions.

### 1.3 Database — PostgreSQL 15.17

| Project | Database | Why |
|---------|----------|-----|
| Portfolio | PostgreSQL 15.17 | Best default for greenfield projects. JSONB support for flexible project metadata. |
| E-Commerce | PostgreSQL 15.17 | Migrated from MySQL 8 during the Aurora consolidation. PostgreSQL's advanced indexing, CTEs, and JSONB support provide a superset of MySQL's capabilities for a catalog-heavy read workload. |
| ATS | PostgreSQL 15.17 | Geospatial indexes for candidate/job location matching. PostgreSQL's `earth_distance` and trigonometric functions support the Haversine distance calculation natively. |

**Why PostgreSQL for all three applications:** Standardizing on a single database engine eliminates the operational overhead of maintaining two different engines (PostgreSQL and MySQL) with different backup strategies, monitoring configurations, and upgrade cycles. The e-commerce application was originally on MySQL 8 to demonstrate polyglot persistence, but consolidating onto PostgreSQL enabled a shared Aurora Serverless v2 cluster — reducing costs from three separate clusters to one. PostgreSQL provides a superset of the features both engines were using: JSONB for flexible metadata, advanced indexing, window functions, and CTEs. The migration from MySQL to PostgreSQL required updating column types (`TINYINT(1)` → `BOOLEAN`, `DATETIME` → `TIMESTAMP`), replacing MySQL-specific SQL syntax, and switching the JDBC driver and Hibernate dialect.

**Why Aurora Serverless v2 over RDS fixed instances:** Aurora auto-scales from 0.5 to 4 ACU based on load, eliminating idle compute costs. Three `db.t3.micro` RDS instances would cost ~$45/month fixed. A single shared Aurora cluster costs ~$10–15/month at typical portfolio traffic. Aurora also provides automated backups, point-in-time recovery, and encryption at rest — production-grade durability that the previous sidecar container databases lacked.

**Why not DynamoDB:** The e-commerce and ATS data models are inherently relational. Products belong to categories, orders contain order items referencing products and customers, candidates belong to jobs with stage progressions. DynamoDB would require denormalization patterns (single-table design) that add complexity without a clear performance benefit at this scale.

---

## 2. Design Patterns & Architecture

### 2.1 Three-Tier Layered Architecture

All three backends follow the same layered structure:

```
Controller → Service → Repository → Database
     ↑            ↑
  DTOs/Validation  Business Logic
```

**Why not hexagonal/clean architecture:** Hexagonal architecture adds port/adapter abstractions that pay off when you need to swap infrastructure layers (e.g., replacing PostgreSQL with MongoDB). These applications don't need that indirection. The service layer already decouples controllers from repositories. Adding interfaces for every repository and mapping between domain/persistence models would triple the class count with no practical benefit.

### 2.2 Key Patterns by Project

**Portfolio:**
- **JWT with refresh token rotation** — Access tokens expire in 15 minutes, refresh tokens in 7 days. On each refresh, the old token is invalidated and a new pair is issued. This limits the blast radius of a stolen refresh token to a single use.
- **Per-user session limits** (max 5 devices) — Prevents credential sharing and bounds the number of active refresh tokens per account.
- **HTTP-only cookies for token storage** — Tokens never touch JavaScript. Combined with CSRF protection via the XSRF-TOKEN pattern, this closes both XSS-based token theft and CSRF attack vectors.

**E-Commerce:**
- **Spring Data REST for read-only endpoints** — Products, categories, countries, and states are exposed automatically with pagination, sorting, and HATEOAS links. Zero boilerplate for the most common queries. Write operations (cart management, checkout, order placement) go through explicit `@RestController` endpoints where business validation matters.
- **Guest-to-authenticated cart merge** — Cart items stored in `localStorage` for anonymous users are merged into the database-backed cart on login. This prevents cart abandonment during the authentication flow — if a user adds items, decides to sign in, and comes back, their cart is intact.
- **Address reuse with saved profiles** — Customers can save default shipping and billing addresses. Checkout auto-populates from saved addresses. This reduces checkout friction for repeat purchases.

**ATS:**
- **Multi-factor candidate scoring** — The matching algorithm scores candidates against job openings using three weighted factors: skills overlap (50%), availability based on days since last assignment (25%), and geographic proximity via Haversine distance (25%). The weights are configurable. This is more defensible than keyword matching because it accounts for practical fit (availability, location), not just resume keywords.
- **Resume parsing pipeline** — Apache Tika detects the MIME type, then delegates to PDFBox (PDF) or Apache POI (DOCX) for text extraction. A regex-based skill extractor matches against 60+ recognized technical skills. The pipeline is stateless and synchronous — no queue, no worker. At the expected volume (tens of resumes, not thousands), an async pipeline would be over-engineering.
- **7-stage Kanban pipeline** — APPLIED → SCREENING → INTERVIEW → ASSESSMENT → OFFER → HIRED / REJECTED. Stage transitions are validated server-side. The frontend uses Angular CDK's `moveItemInArray` and `transferArrayItem` for drag-and-drop, with optimistic UI updates and server reconciliation on failure.

### 2.3 Monorepo Structure

All three applications live in a single repository with independent build paths:

```
/
├── portfolio-backend/     (Maven)
├── portfolio-frontend/    (Angular CLI)
├── ecommerce-backend/     (Maven)
├── ecommerce-frontend/    (Angular CLI)
├── ats-backend/           (Maven)
├── ats-frontend/          (Angular CLI)
├── terraform/             (IaC)
├── scripts/               (Operations)
└── docs/                  (Documentation)
```

**Why a monorepo over separate repositories:** A single repository means one PR can update both the backend API and the frontend that consumes it. Cross-cutting infrastructure changes (Terraform, Dockerfiles, CI/CD) apply to all projects atomically. The Makefile provides `make build`, `make test`, and `make deploy-local` across all six codebases in one command.

The applications don't share runtime code — no shared library, no common module. They share infrastructure configuration and deployment tooling. If the projects grew to have independent release cycles and separate teams, I'd split them into a polyrepo. At one developer, the monorepo avoids the coordination overhead of managing six repositories.

---

## 3. Database Strategy

### 3.1 Schema Design Decisions

**E-Commerce — Normalized Relational Model:**

The e-commerce schema follows third normal form. `orders` references `customer`, `shipping_address`, and `billing_address` by foreign key. `order_item` is a join table between `orders` and `product`. This normalization means address updates don't corrupt historical order records (addresses are point-in-time snapshots at the association level), and product price changes don't retroactively alter completed orders (`unit_price` is stored on `order_item`).

**ATS — Geographic-Aware Schema:**

Jobs and candidates both store `latitude` and `longitude` columns. The Haversine formula runs in application code rather than as a PostgreSQL function because the distance calculation is part of the composite scoring algorithm (combined with skills and availability). Pushing all three factors into SQL would produce an unreadable query. Application-level calculation keeps the scoring logic testable and the weights configurable without SQL changes.

Indexes on `candidate.job_id`, `candidate.stage`, and `job.status` target the three most common query patterns: listing candidates per job, filtering candidates by pipeline stage, and listing active jobs.

### 3.2 Aurora Serverless v2 — Shared Cluster Pattern

```
Lambda Function (Spring Boot)
    ↓ (VPC private subnet)
Shared Aurora Serverless v2 Cluster
    PostgreSQL 15.17 • 0.5–4 ACU auto-scaling
    ├── portfolio   (database)
    ├── ecommerce   (database)
    └── ats         (database)
```

All three backends connect to a single shared Aurora Serverless v2 cluster over JDBC within the VPC, each targeting its own database with a separate schema. Aurora auto-scales capacity units based on combined load, scaling as low as 0.5 ACU during idle periods.

**Why one shared cluster instead of three:** A single Aurora cluster with three databases is significantly cheaper than three separate clusters. Each cluster carries a minimum 0.5 ACU baseline (~$3–4/month), so three clusters cost ~$10–12/month at idle. One shared cluster costs ~$3–4/month at idle, saving ~$7–8/month. The three applications have staggered and light usage patterns — sharing a cluster pools their combined load without contention.

**Why Aurora over RDS fixed instance:** Aurora Serverless v2 eliminates idle compute costs — the cluster scales as low as 0.5 ACU during off-peak hours. Three fixed `db.t3.micro` RDS instances would cost ~$45/month regardless of traffic. Aurora also provides automated backups, point-in-time recovery, and failover without additional configuration.

**Why not sidecar containers:** The previous architecture ran databases as ECS sidecar containers sharing a task's network namespace. This worked for demo traffic but provided no durability — a task restart would wipe all data. Aurora provides managed storage, encryption at rest, and automated backups: the correct choice when dealing with real user data.

---

## 4. Cloud Infrastructure & Deployment

### 4.1 Why AWS Lambda (Serverless)

| Criterion | Lambda + API Gateway | ECS Fargate | EC2 |
|-----------|---------------------|-------------|-----|
| Operational overhead | None — no containers, clusters, or task definitions | Minimal — no EC2 nodes | Medium — AMIs, patching, sizing |
| Idle cost | $0 (pay per request) | ~$60–80/month (6 tasks running 24/7) | ~$8–16/month |
| Cold start | 1–2s with SnapStart | 120–180s (JVM startup in new task) | N/A — always on |
| Scaling | Automatic, per-request | Change `desired_count` | Auto Scaling Groups |
| Deployment | `aws lambda update-function-code` | Register new task def + `update-service` | CodeDeploy / custom |

**Decision:** Lambda with API Gateway was chosen because this workload is a portfolio site with low and spiky traffic. Fargate tasks running 24/7 consumed ~$60–80/month for compute that sat idle >99% of the time. Lambda pays per request — the three backend functions cost ~$2–5/month with free tier. SnapStart (pre-initialized JVM snapshots) reduces Spring Boot cold starts from ~8s to 1–2s, eliminating the main Lambda drawback for Java workloads.

**Why not Fargate:** Fargate is the right tool at scale, but not at demo traffic levels. It was the previous architecture, and the overall migration from ECS Fargate to Lambda + Aurora Serverless v2 achieved ~68% total infrastructure cost reduction (~$200/month to ~$63/month).

### 4.2 Infrastructure as Code — Terraform

The entire infrastructure is defined in Terraform (~2,190 lines across 8 modules):

| Module | Resources |
|--------|-----------|
| `networking` | VPC, 2 public + 2 private subnets, IGW, NAT Gateway, route tables |
| `acm` | SSL certificate with DNS validation for 4 domains |
| `aurora` | 1 shared Aurora Serverless v2 cluster (3 databases, PostgreSQL 15.17, 0.5–4 ACU) |
| `lambda` | 3 Lambda functions (Java 21, SnapStart, 2048 MB), IAM execution roles, EventBridge warm-up rules |
| `api-gateway` | 3 REST API Gateways (regional), Lambda proxy integrations |
| `cloudfront` | 3 CloudFront distributions, Route 53 DNS records for 4 domains |
| `cloudfront-waf` | CloudFront WAFv2 Web ACL with 5 rules (us-east-1) |
| `s3-static` | 3 S3 static hosting buckets |

**Why Terraform over CloudFormation:** Terraform's HCL is more readable than CloudFormation JSON/YAML, has a better plan/apply workflow, and supports multi-cloud if needed. The state is stored in S3 with DynamoDB locking — standard remote backend pattern that supports team collaboration (even though this is a solo project, the pattern is production-correct).

**Bootstrap pattern:** The S3 bucket and DynamoDB table for Terraform state are provisioned separately in `terraform/bootstrap/`. This solves the chicken-and-egg problem — Terraform can't store its state in an S3 bucket that it also creates. The bootstrap resources are created once and never touched again (`prevent_destroy = true`).

### 4.3 CI/CD — GitHub Actions with OIDC

```
GitHub Actions → OIDC → AWS STS → Temporary Credentials → Lambda Update + S3 Sync
```

**Why OIDC over IAM access keys:** IAM access keys are long-lived credentials stored as GitHub Secrets. If the repository is compromised, those keys give persistent AWS access until manually rotated. OIDC federation issues temporary credentials (valid for 1 hour) scoped to the specific GitHub repository and branch. No secrets to rotate, no keys to leak.

The IAM policy grants the GitHub Actions role exactly what it needs: Lambda function updates, S3 deployments, CloudFront invalidations, Terraform state management, and infrastructure resource access. It cannot create new IAM users, modify billing, or access other AWS accounts.

### 4.4 Lambda Packaging — maven-shade-plugin Uber JAR

All three backends are packaged as flat uber JARs using `maven-shade-plugin` for Lambda deployment:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-shade-plugin</artifactId>
    <version>3.6.0</version>
    <!-- Produces a flat uber JAR with all classes at the root classpath -->
    <!-- Lambda's URLClassLoader can load this directly -->
</plugin>
```

**Why maven-shade-plugin instead of spring-boot-maven-plugin:** Spring Boot's default packaging nests all classes under `BOOT-INF/classes/`, which Lambda's `URLClassLoader` cannot traverse. The shade plugin produces a flat JAR where `com/portfolio/backend/StreamLambdaHandler.class` is directly at the root — required for Lambda to find and invoke the handler class.

**Lambda handler:** Each backend uses `aws-serverless-java-container-springboot3` to wrap the Spring Boot application context as a `RequestStreamHandler`. The handler class receives API Gateway proxy events and delegates to Spring's `DispatcherServlet`, making the Lambda function behave identically to a running servlet container.

**Local development:** Docker and multi-stage builds are still used for local development via `docker-compose`. Production deployments use the Lambda JAR exclusively.

### 4.5 CloudFront + API Gateway Routing

Three independent CloudFront distributions serve the three applications, each with two configured origins:

| Host | Path | Origin |
|------|------|--------|
| `clarkfoster.com` | `/api/*` | API Gateway → Portfolio Lambda |
| `clarkfoster.com` | `/*` | S3 Bucket (Portfolio SPA) |
| `shop.clarkfoster.com` | `/api/*` | API Gateway → E-Commerce Lambda |
| `shop.clarkfoster.com` | `/*` | S3 Bucket (E-Commerce SPA) |
| `ats.clarkfoster.com` | `/api/*` | API Gateway → ATS Lambda |
| `ats.clarkfoster.com` | `/*` | S3 Bucket (ATS SPA) |

**Why three CloudFront distributions, not one ALB:** CloudFront provides global edge caching, TLS termination at 400+ POPs worldwide, and DDoS protection via Shield Standard — all at lower cost than an ALB (~$1–2/month per distribution vs. $16–18/month for one ALB). Each distribution has its own WAF Web ACL association, cache policies, and origin configurations.

**Why subdomains, not path-based routing:** `/shop/` and `/ats/` path prefixes would require every frontend route and API endpoint to be prefixed, complicating both the Angular router configuration and the Spring controller mappings. Subdomains keep each application's routing self-contained — `shop.clarkfoster.com/products` is the same path as a standalone deployment of the e-commerce app.

---

## 5. Security Architecture

### 5.1 Defense in Depth

Security is enforced at five layers:

```
Internet → CloudFront WAF → CloudFront (HTTPS) → API Gateway → Spring Security → Application Logic
```

**Layer 1 — AWS WAF:**
- General rate limiting: 2,000 requests per 5 minutes per IP
- Auth endpoint rate limiting: 20 requests per 5 minutes per IP (brute-force protection on `/api/auth/*`)
- AWS Managed Rule Sets: OWASP common vulnerabilities, known bad inputs, SQL injection detection
- Geo-blocking: US-only traffic (appropriate for a personal portfolio — reduces attack surface from automated scanners)

**Layer 2 — CloudFront + ACM:**
- All HTTP traffic is redirected to HTTPS by CloudFront
- ACM-managed certificate covers all four domains with automatic renewal
- HTTP/2 and HTTP/3 (QUIC) enabled at edge locations

**Layer 3 — Nginx Security Headers:**
All three frontends enforce identical security headers:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` — HSTS with 1-year max-age
- `X-Content-Type-Options: nosniff` — prevents MIME-sniffing attacks
- `X-Frame-Options: DENY` — prevents clickjacking via iframe embedding
- `X-XSS-Protection: 1; mode=block` — legacy XSS filter (belt-and-suspenders)
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage
- `Permissions-Policy: geolocation=(), microphone=(), camera=()` — disables browser APIs the applications don't need
- `Content-Security-Policy: default-src 'self'` — restricts resource loading to same-origin (portfolio and ATS use strict CSP; e-commerce allows `'unsafe-inline'` for Bootstrap style compatibility)

**Layer 4 — Spring Security:**
- **Portfolio:** Full JWT authentication with BCrypt password hashing, refresh token rotation, CSRF protection, and per-user session limits
- **E-Commerce:** JWT authentication with 1-hour expiry, HTTP-only cookies, BCrypt hashing, and CORS enforcement
- **ATS:** CORS-configured stateless API (demo mode — authentication not enforced, appropriate for a recruiter demo tool)

**Layer 5 — Application-Level Validation:**
- All three backends use `spring-boot-starter-validation` with `@Valid` annotations on request DTOs
- Input sanitization happens at the controller boundary — no raw request bodies reach service logic
- The ATS resume parser validates MIME type via Apache Tika before processing — rejects files that claim to be PDFs but aren't

### 5.2 Secrets Management

Sensitive configuration is never stored in code, environment files, or Docker images:

| Secret | Storage | Injection |
|--------|---------|-----------|
| JWT signing key | Terraform variable | Lambda environment variable |
| Admin password | Terraform variable | Lambda environment variable |
| SMTP credentials | Terraform variable | Lambda environment variable |
| Database passwords | AWS Secrets Manager (Aurora-managed) | Lambda environment variable via Secrets Manager ARN |

**Why Terraform variables over Secrets Manager for most secrets:** JWT signing keys, admin password, and SMTP credentials are injected as Lambda environment variables directly from Terraform variables defined at apply time. This simplifies the architecture — no runtime Secrets Manager API calls, no IAM policies for `secretsmanager:GetSecretValue`, and no cold-start latency from fetching secrets. Only database credentials remain in Secrets Manager because Aurora manages its own master password rotation natively.

The Lambda execution role has a scoped IAM policy for Secrets Manager access limited to `arn:aws:secretsmanager:*:*:secret:rds!*` for Aurora-managed credentials only.

### 5.3 Network Security

- **Lambda Security Group** allows only outbound connections to the Aurora security group (PostgreSQL port 5432) and HTTPS egress for Secrets Manager / SMTP calls. Inbound traffic arrives exclusively via API Gateway.
- **Aurora Security Group** allows inbound connections only from the Lambda security group on port 5432.
- **Private subnets** host all Lambda functions and Aurora clusters; they are unreachable from the public internet.

---

## 6. Scalability Considerations

### 6.1 Current State

All Lambda functions are deployed with `desired_concurrency = unreserved`. This is a portfolio site. Lambda scales automatically from 0 to thousands of concurrent executions per function with no configuration changes required.

### 6.2 What Scales Without Changes

| Component | Scaling Mechanism | Effort |
|-----------|------------------|--------|
| Lambda functions | AWS-managed auto-scaling (concurrent executions) | None |
| S3 + CloudFront | AWS-managed (unlimited objects, global edge) | None |
| API Gateway | AWS-managed auto-scaling | None |
| CloudFront WAF | AWS-managed (no capacity planning required) | None |
| Aurora Serverless v2 | Auto-scales ACU based on load | None |

### 6.3 What Requires Planning to Scale

| Component | Current Limitation | Migration Path |
|-----------|-------------------|----------------|
| Aurora ACU cap | Max 4 ACU (shared cluster) | Raise `max_capacity` in Terraform, or migrate to provisioned Aurora |
| Lambda concurrency | Default burst limit (3000 initial, +500/min) | Request concurrency increase via AWS support |
| Session state (in-memory rate limiter) | Per-invocation `ConcurrentHashMap`; independent across concurrent executions | Replace with ElastiCache Redis for distributed rate limiting |
| File storage | Resume uploads use Lambda `/tmp` (2048 MB per invocation) | Move to S3 with pre-signed upload URLs |
| Search | SQL `LIKE` queries for product search | Add OpenSearch for full-text product/candidate search |
| Async processing | Resume parsing is synchronous in the request lifecycle | Add SQS + Lambda consumer for background parsing |

### 6.4 Lambda Scaling Characteristics

Lambda scales automatically to match incoming request volume. SnapStart pre-initializes execution environments (Spring context loaded), reducing cold start time from ~8s to 1–2s. EventBridge rules invoke each function every 4 minutes to maintain warm execution environments during low-traffic periods.

Concurrency limits can be set per-function if linear cost scaling becomes a concern.

### 6.5 Deployment Safety

- **Lambda versioning** — each deployment publishes an immutable numbered version (e.g., v42). The `live` alias always points to the current version; rollback is a single alias update to a previous version number.
- **SnapStart snapshots** — Lambda pre-creates initialized snapshots after each `publish-version` call. If the new version fails its warm-up invocation, the previous snapshot remains the `live` alias target.
- **CloudFront invalidation** — frontend deployments always invalidate `/*` to ensure users receive the latest SPA build from the nearest edge location.

---

## 7. Cost Analysis & Optimization

### 7.1 Monthly Cost Breakdown (Estimated)

| Resource | Count | Unit Cost | Monthly Cost |
|----------|-------|-----------|-------------|
| **Lambda** | 3 functions, ~5K req/mo each | First 1M req free + $0.20/M | ~$2–5 |
| **API Gateway** | 3 REST APIs | First 1M req free + $3.50/M | ~$1–2 |
| **Aurora Serverless v2** | 1 shared cluster (3 DBs), ~0.5 ACU avg | $0.12/ACU-hr | ~$10–15 |
| **CloudFront** | 3 distributions | First 1TB transfer free | ~$1–2 |
| **CloudFront WAF (us-east-1)** | 1 Web ACL + 5 rules | $5 + $1/rule/mo | ~$5–6 |
| **S3** | 3 buckets, ~15MB each | $0.023/GB/month | ~$0.50 |
| **Route53 Hosted Zone** | 1 zone | $0.50/month | ~$1 |
| **ACM Certificate** | 1 cert | Free | $0 |
| **CloudWatch Logs** | 3 log groups, 7-day retention | $0.50/GB ingested | ~$1–2 |
| **Secrets Manager** | Aurora-managed DB credentials | $0.40/secret/month | ~$1 |
| **NAT Gateway** | 1 (single AZ, Lambda VPC egress) | $0.045/hr + data | ~$33 |
| **S3 + DynamoDB (Terraform State)** | <1MB | Negligible | <$1 |
| | | **Estimated Total** | **~$63/month** |

**Previous ECS Fargate architecture: ~$200/month. Cost reduction: ~68% (~$137/month saved).**

### 7.2 Cost Optimization Decisions

**Lambda over Fargate: ~$55–80/month saved.** Six Fargate tasks running 24/7 cost ~$60–80/month for compute that was idle >99% of the time. Lambda charges only for actual execution time. For a portfolio with demo-level traffic, the pay-per-request model is strictly cheaper.

**Shared Aurora cluster: ~$7–8/month saved vs. 3 separate clusters.** Three separate Aurora clusters each carry a 0.5 ACU minimum baseline (~$3–4/month each at idle). One shared cluster with three databases pools the workload and carries only one baseline charge.

**CloudFront over ALB: ~$14–16/month saved.** One ALB cost ~$16–18/month. Three CloudFront distributions cost ~$1–2/month total, with the added benefit of global edge caching that reduces origin (Lambda) invocations.

**7-day CloudWatch log retention: ~$8–10/month saved.** Default retention is indefinite. For a portfolio site, logs older than a week have no debugging value. Long-term storage uses S3 at $0.023/GB/month if needed.

**Terraform-injected secrets: ~$2–3/month saved.** Moving JWT keys, admin password, and SMTP credentials from Secrets Manager to Terraform variables reduced per-secret charges. Only Aurora-managed database credentials remain in Secrets Manager.

---

## 8. Trade-offs & Known Limitations

Every architecture involves trade-offs. Here are the ones I made deliberately:

### 8.1 Geo-Blocking — Security Over Global Accessibility

**Trade-off:** WAF blocks all non-US traffic. International recruiters cannot access the site.

**Why it's acceptable:** Reduces automated scanning and bot traffic from known attack-heavy regions. If international access became a requirement, the WAF rule is a single Terraform change to remove. The decision prioritizes reducing noise in logs and WAF metrics over global reach.

### 8.2 Synchronous Resume Parsing — Simplicity Over Throughput

**Trade-off:** Resume parsing (Tika + PDFBox + POI) runs synchronously in the HTTP request lifecycle. A large DOCX file blocks the thread for the duration of parsing.

**Why it's acceptable:** The ATS is a demonstration of the parsing pipeline, not a high-volume production system. At the expected usage (single recruiter, tens of resumes), synchronous parsing completes in under 2 seconds. An SQS + Lambda architecture would add operational complexity (dead letter queues, retry policies, eventual consistency) for a problem that doesn't exist at this scale.

### 8.3 NAT Gateway Cost — Network Security Over Cost

**Trade-off:** A single NAT Gateway costs ~$33/month — the largest single line item. This is required for Lambda functions in private subnets to reach external services (Secrets Manager, SMTP, etc.).

**Why it's acceptable:** Private subnets are the production-correct network architecture. Lambda functions and Aurora clusters are unreachable from the public internet. The NAT Gateway cost is the price of proper network isolation. A single NAT Gateway (one AZ) reduces cost versus two (multi-AZ), accepting reduced availability during an AZ outage — acceptable for a portfolio site.

### 8.4 Shared Aurora Cluster — Cost Over Isolation

**Trade-off:** All three applications share a single Aurora Serverless v2 cluster. A noisy-neighbor scenario (e.g., heavy ATS resume parsing queries) could impact portfolio or e-commerce database performance.

**Why it's acceptable:** At portfolio-level traffic, the three applications collectively use a fraction of the minimum 0.5 ACU capacity. Contention is not a realistic concern. If any application grew to production scale, splitting it to a dedicated cluster is a Terraform variable change and a connection string update.
