# Technical Design & Decisions

**Author:** Clark Foster
**Last Updated:** March 2026

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

### 1.1 Backend — Spring Boot 4.0.4 / Java 25

| Criterion | Choice | Alternatives Considered |
|-----------|--------|------------------------|
| Language | Java 25 | Kotlin, Go, Node.js (Express/NestJS) |
| Framework | Spring Boot 4.0.4 | Quarkus, Micronaut, Django, FastAPI |
| Build Tool | Maven 3 | Gradle |

**Why Java + Spring Boot:**

Spring Boot was the deliberate choice here, not the default one. The three applications each have different data access patterns — the portfolio uses Spring Data JPA with a clean entity model, the e-commerce platform leans on Spring Data REST for auto-exposed read-only endpoints (products, categories, countries), and the ATS backend does heavier processing with Apache Tika, PDFBox, and POI for resume parsing. Spring's ecosystem handled all three without introducing additional frameworks.

Java 25 over Kotlin: Kotlin is excellent, but every Spring tutorial, Stack Overflow answer, and debugging resource defaults to Java. For a portfolio that other engineers will read and evaluate, Java reduces friction. Virtual threads (Project Loom) in modern Java also close the async gap that used to favor Kotlin coroutines.

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

### 1.3 Database — PostgreSQL 16 & MySQL 8

| Project | Database | Why |
|---------|----------|-----|
| Portfolio | PostgreSQL | Best default for greenfield projects. JSONB support for flexible project metadata. |
| E-Commerce | MySQL 8.0 | Demonstrates polyglot persistence. MySQL's read performance with InnoDB suits a catalog-heavy read workload. |
| ATS | PostgreSQL 16 | Geospatial indexes for candidate/job location matching. PostgreSQL's `earth_distance` and trigonometric functions support the Haversine distance calculation natively. |

**Why not a single database engine:** Running both PostgreSQL and MySQL is a deliberate demonstraion of polyglot data architecture. In production, I'd standardize on one engine to reduce operational overhead. In a portfolio context, it shows comfort with both and an understanding of when each fits.

**Why not a managed database service (RDS):** Cost. An `db.t3.micro` RDS instance in us-east-1 costs ~$15/month per database. That's $45/month for three databases on a portfolio site with negligible traffic. Running databases as ECS sidecar containers costs $0 in additional compute — they share the backend task's Fargate allocation. The trade-off is no automated backups, no multi-AZ failover, and no point-in-time recovery. For a demo portfolio with seeded data, that's acceptable. For a production system with real customer data, I'd move to RDS without hesitation.

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
├── ecs-task-definitions/  (Deployment)
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

### 3.2 Sidecar Database Pattern

```
ECS Task
├── Backend Container (Spring Boot) → localhost:3306 / localhost:5432
└── Database Container (MySQL / PostgreSQL)
```

The backend connects to the database on `localhost` because both containers share the same network namespace within the ECS task. This eliminates the need for service discovery, DNS resolution, or network-level security between the application and its database. The database is not addressable from outside the task.

**Startup ordering** is handled via ECS container dependencies with health checks. The backend container's `dependsOn` clause waits for the database container to report `HEALTHY` (via `mysqladmin ping` or `pg_isready`) before starting. This replaces Spring's retry-on-connect pattern and avoids the race condition where the application starts before the database accepts connections.

---

## 4. Cloud Infrastructure & Deployment

### 4.1 Why AWS ECS Fargate

| Criterion | ECS Fargate | EKS (Kubernetes) | EC2 |
|-----------|------------|-------------------|-----|
| Operational overhead | Minimal — no cluster nodes to manage | High — control plane, node groups, kubectl | Medium — EC2 instances, AMIs, patching |
| Cost at low scale | Pay per task per second | ~$73/month for control plane alone | t3.micro free tier, then ~$8/month |
| Scaling | Auto-scale tasks | Auto-scale pods + nodes | Auto-scaling groups |
| Deployment complexity | `aws ecs update-service` | Helm charts, kubectl apply | CodeDeploy, custom scripts |

**Decision:** ECS Fargate was chosen because this workload runs 6 services at 1 replica each. Kubernetes is designed for orchestrating dozens to thousands of services with complex networking, service mesh, and rolling deployment requirements. That's a tool for a different scale. ECS does the job with a fraction of the configuration surface area.

EC2 was ruled out because managing instance patching, AMI updates, and right-sizing would consume more time than the applications themselves. Fargate's per-second billing means I pay for exactly what the containers consume with zero idle capacity.

### 4.2 Infrastructure as Code — Terraform

The entire infrastructure is defined in Terraform (~800 lines across 6 modules):

| Module | Resources |
|--------|-----------|
| `networking` | VPC, 2 public subnets, IGW, route tables |
| `acm` | SSL certificate with DNS validation for 4 domains |
| `alb` | Application Load Balancer, 6 target groups, listener rules |
| `ecs` | Fargate cluster, 6 services, 6 task definitions, 8 ECR repos, IAM roles |
| `route53` | DNS A records for 4 domains aliased to ALB |
| `waf` | WAFv2 Web ACL with 6 rules attached to ALB |

**Why Terraform over CloudFormation:** Terraform's HCL is more readable than CloudFormation JSON/YAML, has a better plan/apply workflow, and supports multi-cloud if needed. The state is stored in S3 with DynamoDB locking — standard remote backend pattern that supports team collaboration (even though this is a solo project, the pattern is production-correct).

**Bootstrap pattern:** The S3 bucket and DynamoDB table for Terraform state are provisioned separately in `terraform/bootstrap/`. This solves the chicken-and-egg problem — Terraform can't store its state in an S3 bucket that it also creates. The bootstrap resources are created once and never touched again (`prevent_destroy = true`).

### 4.3 CI/CD — GitHub Actions with OIDC

```
GitHub Actions → OIDC → AWS STS → Temporary Credentials → ECR Push + ECS Deploy
```

**Why OIDC over IAM access keys:** IAM access keys are long-lived credentials stored as GitHub Secrets. If the repository is compromised, those keys give persistent AWS access until manually rotated. OIDC federation issues temporary credentials (valid for 1 hour) scoped to the specific GitHub repository and branch. No secrets to rotate, no keys to leak.

The IAM policy grants the GitHub Actions role exactly what it needs: ECR push, ECS service updates, Terraform state management, and infrastructure resource access. It cannot create new IAM users, modify billing, or access other AWS accounts.

### 4.4 Multi-Stage Docker Builds

All six Dockerfiles use multi-stage builds:

```dockerfile
# Stage 1: Build (discarded)
FROM maven:3-eclipse-temurin-25 AS build
COPY . .
RUN mvn clean package -DskipTests

# Stage 2: Runtime (shipped)
FROM eclipse-temurin:25-jre-alpine
COPY --from=build target/*.jar app.jar
```

**Why multi-stage:** The Maven build image is ~800MB (JDK, Maven, project dependencies). The runtime image is ~150MB (JRE-Alpine only). Shipping the build image would waste ECR storage and increase image pull time on every deployment. Multi-stage builds produce minimal runtime images with only the compiled artifact.

Frontend images follow the same pattern: `node:25-alpine` for the Angular build, `nginx:alpine` for serving the compiled static assets.

### 4.5 ALB Host-Based Routing

A single Application Load Balancer serves all three applications using host-based routing rules:

| Host | Path | Target |
|------|------|--------|
| `clarkfoster.com` | `/api/*` | Portfolio Backend (8080) |
| `clarkfoster.com` | `/*` | Portfolio Frontend (80) |
| `shop.clarkfoster.com` | `/api/*` | E-Commerce Backend (8080) |
| `shop.clarkfoster.com` | `/*` | E-Commerce Frontend (80) |
| `ats.clarkfoster.com` | `/api/*` | ATS Backend (8080) |
| `ats.clarkfoster.com` | `/*` | ATS Frontend (80) |

**Why one ALB, not three:** Each ALB costs ~$16/month + data processing charges. Three ALBs would add ~$32/month in fixed costs for zero additional capability. Host-based routing rules are evaluated in priority order with negligible latency impact.

**Why subdomains, not path-based routing:** `/shop/` and `/ats/` path prefixes would require every frontend route and API endpoint to be prefixed, complicating both the Angular router configuration and the Spring controller mappings. Subdomains keep each application's routing self-contained — `shop.clarkfoster.com/products` is the same path as a standalone deployment of the e-commerce app.

---

## 5. Security Architecture

### 5.1 Defense in Depth

Security is enforced at five layers:

```
Internet → WAF → ALB (HTTPS) → Nginx (security headers) → Spring Security → Application Logic
```

**Layer 1 — AWS WAF:**
- General rate limiting: 2,000 requests per 5 minutes per IP
- Auth endpoint rate limiting: 20 requests per 5 minutes per IP (brute-force protection on `/api/auth/*`)
- AWS Managed Rule Sets: OWASP common vulnerabilities, known bad inputs, SQL injection detection
- Geo-blocking: US-only traffic (appropriate for a personal portfolio — reduces attack surface from automated scanners)

**Layer 2 — ALB + ACM:**
- All HTTP traffic is 301-redirected to HTTPS at the listener level
- ACM-managed certificate covers all four domains with automatic renewal
- HTTP/2 enabled for multiplexed connections

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
| JWT signing key | AWS Secrets Manager | ECS task environment variable |
| Admin credentials | AWS Secrets Manager | ECS task environment variable |
| SMTP credentials | AWS Secrets Manager | ECS task environment variable |
| Database passwords (E-Commerce, ATS) | ECS task definition | Container environment variable |

The ECS task execution role has a scoped IAM policy: `secretsmanager:GetSecretValue` on `arn:aws:secretsmanager:*:*:secret:portfolio/*` only. It cannot read secrets from other applications or AWS accounts.

Rotation scripts (`scripts/rotate-all-secrets.sh`) generate cryptographically random values (64-byte base64 for JWT, 24-byte base64 for passwords) and force-restart ECS services to pick up the new values.

### 5.3 Network Security

- **ECS Security Group** allows inbound traffic only from the ALB security group on ports 8080 (backend) and 80 (frontend). There is no direct internet access to containers.
- **Database containers** are not exposed on any port — they communicate with their backend via `localhost` within the shared ECS task network namespace.
- **Egress** is unrestricted (required for ECR image pulls, Secrets Manager API calls, and outbound SMTP delivery).

---

## 6. Scalability Considerations

### 6.1 Current State

All services run at `desired_count = 1`. This is a portfolio site, not a production-at-scale system. The infrastructure is designed so that scaling up requires changing a single Terraform variable — not re-architecting.

### 6.2 What Scales Without Changes

| Component | Scaling Mechanism | Effort |
|-----------|------------------|--------|
| Frontend containers | Increase `desired_count` + ALB distributes across tasks | One variable change |
| Backend containers | Increase `desired_count` + ALB distributes across tasks | One variable change |
| ALB | AWS-managed auto-scaling (handles millions of connections) | None |
| WAF | AWS-managed (no capacity planning required) | None |
| ECR | Unlimited image storage (lifecycle policies manage cost) | None |

### 6.3 What Requires Re-Architecture to Scale

| Component | Current Limitation | Migration Path |
|-----------|-------------------|----------------|
| Databases | Sidecar containers — single instance, no replication, data loss on task restart | Migrate to RDS (PostgreSQL) / Aurora (MySQL) for managed replication, backups, and failover |
| Session state | JWT is stateless (good), but refresh token validation requires DB lookups | Add Redis (ElastiCache) for token blacklisting at scale |
| File storage | Resume uploads stored on ephemeral container filesystem | Migrate to S3 with pre-signed URLs |
| Search | SQL `LIKE` queries for product search and candidate matching | Add Elasticsearch/OpenSearch for full-text search |
| Async processing | Resume parsing is synchronous in the request lifecycle | Add SQS queue + Lambda worker for background processing |

### 6.4 ECS Auto-Scaling (Ready to Enable)

The Fargate services support target-tracking auto-scaling on CPU or memory utilization:

```hcl
resource "aws_appautoscaling_target" "backend" {
  max_capacity       = 4
  min_capacity       = 1
  resource_id        = "service/${cluster}/${service}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}
```

This isn't currently enabled because auto-scaling on a portfolio site would only trigger from bot traffic or a DDoS — both handled by WAF rate limiting instead.

### 6.5 Deployment Safety

- **Deployment circuit breaker** is enabled on all ECS services with automatic rollback. If a new task fails health checks, ECS rolls back to the previous task definition without manual intervention.
- **Health check grace period** of 120 seconds gives Spring Boot applications time to start up before the ALB begins sending traffic.
- **Task definition lifecycle** in Terraform is set to `ignore_changes = [task_definition]` — GitHub Actions manages task definition updates, preventing Terraform from reverting deployments.

---

## 7. Cost Analysis & Optimization

### 7.1 Monthly Cost Breakdown (Estimated)

| Resource | Count | Unit Cost | Monthly Cost |
|----------|-------|-----------|-------------|
| **ECS Fargate — Backend Tasks** | 3 tasks × 0.25 vCPU | $0.04048/vCPU-hr | ~$22 |
| **ECS Fargate — Backend Memory** | 3 tasks × (1GB + 2GB + 1GB) | $0.004445/GB-hr | ~$13 |
| **ECS Fargate — Frontend Tasks** | 3 tasks × 0.25 vCPU | $0.04048/vCPU-hr | ~$22 |
| **ECS Fargate — Frontend Memory** | 3 tasks × 0.5GB | $0.004445/GB-hr | ~$5 |
| **Application Load Balancer** | 1 ALB | ~$16.43/month base | ~$16 |
| **ALB Data Processing** | Minimal traffic | $0.008/LCU-hr | ~$1 |
| **Route53 Hosted Zone** | 1 zone | $0.50/month | ~$1 |
| **Route53 DNS Queries** | Minimal | $0.40/million | <$1 |
| **ACM Certificate** | 1 cert | Free | $0 |
| **WAF Web ACL** | 1 ACL + 6 rules | $5 + $6 | ~$11 |
| **WAF Requests** | Minimal | $0.60/million | <$1 |
| **ECR Storage** | ~8 images × ~150MB | $0.10/GB/month | <$1 |
| **CloudWatch Logs** | 7-day retention | $0.50/GB ingested | ~$2 |
| **Secrets Manager** | 8 secrets | $0.40/secret/month | ~$3 |
| **S3 (Terraform State)** | <1MB | $0.023/GB/month | <$1 |
| **DynamoDB (State Lock)** | PAY_PER_REQUEST | ~$0/month at low usage | <$1 |
| | | **Estimated Total** | **~$95–100/month** |

### 7.2 Cost Optimization Decisions

**Sidecar databases over RDS: ~$45/month saved.** Three `db.t3.micro` RDS instances would cost ~$15/month each. Sidecar containers use the backend task's existing Fargate allocation. The memory cost is embedded in the backend task's memory reservation (2GB for e-commerce to accommodate MySQL, 1GB for ATS).

**Single ALB over three: ~$32/month saved.** Host-based routing handles all three applications on one load balancer.

**7-day CloudWatch log retention: ~$8–10/month saved.** Default retention is indefinite. For a portfolio site, logs older than a week have no debugging value. If I needed long-term log analysis, I'd ship to S3 at $0.023/GB/month instead of paying CloudWatch's $0.50/GB ingestion rate.

**ECR lifecycle policies: storage creep prevented.** Each repository retains only the last 10 images. Without this, every deployment would accumulate ~150MB of images indefinitely.

**No NAT Gateway: ~$32/month saved.** The architecture uses public subnets with direct internet access. A private subnet + NAT Gateway pattern would be more secure (containers not directly addressable), but NAT Gateways cost $0.045/hour (~$32/month) plus data processing charges. Since the ECS security group already restricts inbound traffic to ALB-only, the practical security benefit of a NAT Gateway doesn't justify the cost for this workload.

### 7.3 Cost Scaling Characteristics

Fargate billing is linear: doubling task count doubles compute cost. There are no step-function pricing cliffs. At 2× scale (12 services, 2 replicas each), the estimated cost would be ~$160/month. At the point where cost becomes a concern, the conversation shifts to reserved capacity (Fargate Spot for non-critical workloads, Savings Plans for committed usage).

---

## 8. Trade-offs & Known Limitations

Every architecture involves trade-offs. Here are the ones I made deliberately:

### 8.1 Sidecar Databases — Simplicity Over Durability

**Trade-off:** Sidecar databases lose data when the ECS task restarts. There are no automated backups, no replication, and no point-in-time recovery.

**Why it's acceptable:** All three databases are seeded with demo data on startup. The portfolio has minimal write state (admin account, projects). The e-commerce and ATS databases are demonstrating schema design and query patterns, not storing real customer data. If this were a production system with real users, I'd migrate to RDS on day one.

### 8.2 Public Subnets — Cost Over Network Isolation

**Trade-off:** Containers run in public subnets. In a private subnet architecture, containers would only be reachable through the ALB, and outbound traffic would route through a NAT Gateway.

**Why it's acceptable:** The ECS security group already restricts inbound access to ALB-originated traffic. The containers are not directly addressable by external clients even in a public subnet. The ~$32/month NAT Gateway cost exceeds the security benefit for a portfolio workload with no sensitive customer data.

### 8.3 Geo-Blocking — Security Over Global Accessibility

**Trade-off:** WAF blocks all non-US traffic. International recruiters cannot access the site.

**Why it's acceptable:** Reduces automated scanning and bot traffic from known attack-heavy regions. If international access became a requirement, the WAF rule is a single Terraform change to remove. The decision prioritizes reducing noise in logs and WAF metrics over global reach.

### 8.4 Synchronous Resume Parsing — Simplicity Over Throughput

**Trade-off:** Resume parsing (Tika + PDFBox + POI) runs synchronously in the HTTP request lifecycle. A large DOCX file blocks the thread for the duration of parsing.

**Why it's acceptable:** The ATS is a demonstration of the parsing pipeline, not a high-volume production system. At the expected usage (single recruiter, tens of resumes), synchronous parsing completes in under 2 seconds. An SQS + Lambda architecture would add operational complexity (dead letter queues, retry policies, eventual consistency) for a problem that doesn't exist at this scale.

### 8.5 Hardcoded Database Credentials — Pragmatic Scoping

**Trade-off:** E-commerce MySQL and ATS PostgreSQL sidecar credentials are defined in ECS task definitions rather than Secrets Manager.

**Why it's acceptable but not ideal:** These databases are only reachable via `localhost` within the task — there is no network path to reach them externally. The credentials protect against a threat (unauthorized database access) that the network architecture already prevents. That said, rotating them requires a task definition update and redeployment. For production, I'd move them to Secrets Manager for operational consistency with the portfolio backend's secret management pattern.
