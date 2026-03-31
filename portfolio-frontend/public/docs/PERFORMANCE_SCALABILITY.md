# Performance & Scalability

**Author:** Clark Foster
**Last Updated:** March 2026

---

## Table of Contents

1. [How the System Scales](#1-how-the-system-scales)
2. [Bottlenecks & Mitigation](#2-bottlenecks--mitigation)
3. [Caching Strategies](#3-caching-strategies)
4. [Database Optimization](#4-database-optimization)

---

## 1. How the System Scales

### 1.1 Architecture Overview

All three applications — Portfolio (`clarkfoster.com`), E-Commerce (`shop.clarkfoster.com`), and HireFlow ATS (`ats.clarkfoster.com`) — share a common deployment topology: Angular SPA frontends served by Nginx, Spring Boot backends on Java 25, and databases (PostgreSQL or MySQL) running as ECS Fargate sidecar containers. A single Application Load Balancer with host-based routing distributes traffic to all six services.

```
Internet → Route 53 → WAF → ALB (host-based routing)
                                ├─ clarkfoster.com      → Portfolio  Frontend / Backend
                                ├─ shop.clarkfoster.com → E-Commerce Frontend / Backend + MySQL sidecar
                                └─ ats.clarkfoster.com  → ATS        Frontend / Backend + PostgreSQL sidecar
```

### 1.2 Horizontal Scaling — ECS Fargate

Every service runs as a Fargate task with `desired_count = 1`. Scaling any service horizontally requires changing a single Terraform variable — no re-architecture.

| Component | Current Allocation | Scaling Mechanism |
|-----------|-------------------|-------------------|
| Portfolio Backend | 512 CPU / 1024 MB | Increase `desired_count`, ALB distributes |
| Portfolio Frontend | 256 CPU / 512 MB | Increase `desired_count`, ALB distributes |
| E-Commerce Backend + MySQL | 512 CPU / 2048 MB | Increase `desired_count`, ALB distributes |
| E-Commerce Frontend | 256 CPU / 512 MB | Increase `desired_count`, ALB distributes |
| ATS Backend + PostgreSQL | 512 CPU / 1024 MB | Increase `desired_count`, ALB distributes |
| ATS Frontend | 256 CPU / 512 MB | Increase `desired_count`, ALB distributes |

Fargate charges per-second for vCPU and memory. There is no idle cluster capacity to pay for. Scaling from 1 to N replicas is linear in cost with no step-function pricing cliffs.

**Auto-scaling is not enabled** because the workload is a portfolio with negligible organic traffic. The only load spikes come from bots or scanners — handled by WAF rate limiting rather than auto-scaling to absorb the traffic. The infrastructure is ready for target-tracking auto-scaling when needed:

```hcl
resource "aws_appautoscaling_target" "backend" {
  max_capacity       = 4
  min_capacity       = 1
  resource_id        = "service/${cluster}/${service}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  policy_type        = "TargetTrackingScaling"
  target_tracking_scaling_policy_configuration {
    target_value       = 70.0
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

### 1.3 Vertically Managed Components

| Component | Scaling Behavior | Operator Effort |
|-----------|-----------------|-----------------|
| **ALB** | AWS-managed auto-scaling — handles millions of concurrent connections | None |
| **WAF** | AWS-managed — no capacity planning | None |
| **Route 53** | AWS-managed DNS with 100% SLA | None |
| **ECR** | Unlimited image storage; lifecycle policies retain last 10 images per repo | None |
| **CloudWatch Logs** | 7-day retention limits accumulation; ingest scales automatically | None |

### 1.4 What Requires Re-Architecture to Scale

The sidecar database pattern is the primary scaling constraint. Each database container shares the Fargate task's network namespace with its backend and cannot be independently scaled or replicated.

| Component | Current Limitation | Migration Path | Trigger Threshold |
|-----------|-------------------|----------------|-------------------|
| **Databases** | Single-instance sidecars, ephemeral storage, no replication | RDS (PostgreSQL) / Aurora (MySQL) with read replicas | Real user data, >1 replica needed |
| **File storage** | Resume uploads on ephemeral container filesystem | S3 with pre-signed URLs | Multi-instance ATS backend |
| **Search** | SQL `LIKE` for products, regex for candidate skills | OpenSearch / Elasticsearch | >10K products or >5K candidates |
| **Resume parsing** | Synchronous in HTTP request lifecycle | SQS + Lambda background worker | >50 concurrent uploads |
| **Rate limiting** | In-memory `ConcurrentHashMap` per instance | Redis (ElastiCache) | >1 backend replica |

### 1.5 Scaling Characteristics by Project

**Portfolio:** The lightest workload. Stateless read-heavy traffic (project listings, homepage). The only write path is the contact form (SMTP delivery). Scales horizontally with no state coordination — JWT is stateless, access tokens are self-contained. The sole scaling concern is refresh token validation, which hits the database. At multi-instance scale, the H2 embedded database in dev would be replaced by the PostgreSQL production database, and refresh token lookups would need connection pooling tuning.

**E-Commerce:** Read-heavy catalog browsing (Spring Data REST auto-exposed endpoints with pagination) with write spikes during checkout. The cart merge logic (guest → authenticated) and order placement are the write-intensive paths. MySQL sits as a sidecar — at scale, this becomes the bottleneck first. Product catalog reads are the prime candidate for caching since the inventory changes infrequently. At multi-replica scale, the local `ConcurrentHashMap`-based state won't exist (E-Commerce doesn't use the rate limiter), but session consistency through JWT makes horizontal scaling straightforward for the application tier.

**ATS (HireFlow):** The most computationally intensive. Resume parsing (Apache Tika → PDFBox/POI → regex skill extraction) is CPU-bound and synchronous. The Haversine distance calculation for candidate-job scoring runs in application code across all eligible candidates. At scale, the parsing pipeline needs to move off the request thread (SQS queue), and the scoring algorithm benefits from pre-computed distance caches or spatial database indexes. The 12 MB upload limit (`client_max_body_size 12m` in Nginx) already constrains per-request memory impact.

---

## 2. Bottlenecks & Mitigation

### 2.1 Identified Bottlenecks

#### Bottleneck 1 — Sidecar Databases (All Projects)

**Impact:** The database container shares CPU and memory with its backend inside a single Fargate task. Under load, the JVM and database compete for the same 1024–2048 MB allocation. The E-Commerce backend's 2048 MB task accommodates MySQL's memory requirements; the ATS backend's 1024 MB is tighter for PostgreSQL + Spring Boot cohabitation.

**Mitigation (current):**
- Spring JPA `open-in-view=false` on E-Commerce and ATS backends — prevents lazy-loading queries from holding database connections open through the full HTTP response lifecycle
- `spring.jpa.hibernate.ddl-auto=validate` in production — no schema-altering operations at runtime
- Health checks (`pg_isready`, `mysqladmin ping`) with a 10-second interval ensure the database is responsive; ECS restarts the task if health checks fail

**Mitigation (at scale):** Migrate to managed RDS/Aurora instances. The sidecar pattern was a deliberate cost decision (~$45/month savings) that trades durability for simplicity at portfolio-level traffic.

#### Bottleneck 2 — Synchronous Resume Parsing (ATS)

**Impact:** Apache Tika + PDFBox (PDF) or Apache POI (DOCX) text extraction runs synchronously on the request thread. A complex 10-page PDF with embedded images can take 1–3 seconds to parse. During that time, the thread is blocked, and with the default Tomcat thread pool (200 threads), 200 concurrent uploads would saturate the backend.

**Mitigation (current):**
- 12 MB `client_max_body_size` cap in Nginx limits per-request memory consumption
- MIME type validation via Tika rejects non-PDF/DOCX files before heavy parsing begins
- The expected volume (tens of resumes, not thousands) is well within synchronous capacity

**Mitigation (at scale):**
1. Accept the upload, return `202 Accepted` with a job ID
2. Enqueue parsing work to SQS
3. Lambda or ECS worker picks up the message, parses, and writes results to the database
4. Frontend polls or uses WebSocket for completion notification

#### Bottleneck 3 — In-Memory Rate Limiting (Portfolio)

**Impact:** The `RateLimitingService` uses a `ConcurrentHashMap<String, AttemptInfo>` to track failed login attempts per IP/username. This works correctly at `desired_count = 1`. At `desired_count > 1`, each instance maintains its own map — an attacker gets N × 5 attempts (where N = instance count) before lockout on any single instance.

```java
// Current: per-instance, not distributed
private final Map<String, AttemptInfo> attemptCache = new ConcurrentHashMap<>();

// 5 attempts per 15-minute window → 30-minute lockout
private static final int MAX_ATTEMPTS = 5;
private static final long WINDOW_DURATION_SECONDS = 900;
private static final long LOCKOUT_DURATION_SECONDS = 1800;
```

**Mitigation (current):**
- WAF enforces a hard cap of 20 requests per 5 minutes on `/api/auth/*` endpoints at the infrastructure layer — this is instance-independent and limits brute-force attempts before they reach the application
- Single-instance deployment makes the in-memory approach functionally correct today

**Mitigation (at scale):** Replace `ConcurrentHashMap` with Redis (ElastiCache). Store attempt counts as Redis keys with TTL matching the window duration. The WAF rate limit remains the first line of defense regardless.

#### Bottleneck 4 — SQL-Based Product Search (E-Commerce)

**Impact:** Product search uses SQL `LIKE '%keyword%'` queries, which cannot use B-tree indexes. A full table scan executes for every search request. With 100 seeded products, this is imperceptible. At 100K+ products, query time grows linearly.

**Mitigation (current):**
- Spring Data REST pagination (`?page=0&size=20`) limits result set size regardless of table size
- The product catalog is read-heavy — the same search results can be cached

**Mitigation (at scale):** Add OpenSearch/Elasticsearch for full-text search. The product catalog can be indexed asynchronously via database change events (Debezium CDC) or periodic sync. SQL remains the source of truth; the search index is a read-optimized projection.

#### Bottleneck 5 — Haversine Distance Calculation (ATS)

**Impact:** The candidate scoring algorithm computes Haversine distance between every candidate and the target job location in application code. The formula involves trigonometric functions (sin, cos, atan2) evaluated per candidate. With 100 candidates, this completes in milliseconds. At 50K+ candidates, the O(n) calculation per scoring request becomes measurable.

**Mitigation (current):**
- The scoring is only triggered on explicit match requests, not on page load
- The candidate pool is filtered by `job_id` and `stage` before scoring, reducing the working set

**Mitigation (at scale):**
- PostGIS extension with spatial indexes — the database handles bounding-box filtering before the application computes exact distances
- Pre-computed distance matrix for active job-candidate pairs, refreshed on candidate/job location changes
- PostgreSQL's built-in `earth_distance` and `cube` extensions support efficient proximity queries natively

### 2.2 Bottleneck Summary Matrix

| Bottleneck | Severity (Current) | Severity (At Scale) | Mitigation Effort |
|-----------|--------------------|--------------------|-------------------|
| Sidecar databases | Low — adequate for demo traffic | **Critical** — single point of failure, no replication | Medium — Terraform RDS module + connection string change |
| Synchronous resume parsing | Low — sub-second for typical files | **High** — thread pool exhaustion under concurrent load | Medium — SQS + Lambda worker pattern |
| In-memory rate limiting | None — single instance is correct | **High** — bypassed by multi-instance routing | Low — Redis drop-in replacement |
| SQL LIKE product search | None — 100 products | **Medium** — linear scan at scale | Medium — OpenSearch integration |
| Haversine scoring | None — small candidate pool | **Medium** — O(n) per request | Low–Medium — PostGIS or pre-computation |

---

## 3. Caching Strategies

### 3.1 Current Caching Layers

The system has **three active caching layers** and **no application-level cache**:

#### Layer 1 — Browser Cache (Static Assets)

Nginx serves Angular SPA assets with cache-control headers. The production Nginx configurations across all three frontends include:

```nginx
location / {
    root   /usr/share/nginx/html;
    index  index.html;
    try_files $uri $uri/ /index.html;
}
```

Angular CLI generates content-hashed filenames for production builds (`main.a1b2c3d4.js`). These files are immutable — the hash changes when content changes. Browsers cache them indefinitely by default (`Cache-Control: public, max-age=31536000` for hashed assets), and a deployment simply generates new filenames. `index.html` is always fetched fresh (no hash in the filename) and references the new asset hashes, ensuring cache busting on deployment.

#### Layer 2 — ALB Connection Reuse

The Application Load Balancer maintains persistent connections to backend targets (HTTP keep-alive). This avoids TCP handshake overhead per request. The ALB also handles HTTP/2 multiplexing on the client side, converting to HTTP/1.1 toward the backend targets where needed.

#### Layer 3 — JPA Second-Level Cache (Hibernate)

Hibernate's first-level cache (the persistence context) is active by default on all three backends — within a single transaction, repeated queries for the same entity return the cached instance. This is per-request, not shared. No second-level cache (EhCache, Caffeine, Redis) is configured. The entity relationships use `FetchType.LAZY` by default (Spring Data JPA convention), loading associated entities only when explicitly accessed.

### 3.2 What Is Not Cached (And Why It Matters)

| Data | Access Pattern | Cache Benefit | Why Not Cached Today |
|------|---------------|---------------|---------------------|
| **Product catalog** (E-Commerce) | Read-heavy, rarely updated | High — catalog reads are 90%+ of traffic | Single instance, low traffic, database responds in <10ms |
| **Featured projects** (Portfolio) | Read on every homepage visit | Medium — stable data, changes infrequently | Negligible traffic, no measurable latency |
| **Job listings** (ATS) | Read-heavy, updated occasionally | Medium — recruiter dashboard loads all active jobs | Low traffic, single-instance database is fast enough |
| **Candidate scores** (ATS) | Computed per match request | High — scoring is CPU-intensive | Scores depend on candidate availability (changes daily) — cache invalidation is complex |
| **JWT token validation** (All) | Every authenticated request | None — tokens are self-contained and verified via signature, no lookup is needed for access tokens | By design — stateless validation is the caching strategy |

### 3.3 Recommended Caching Architecture (At Scale)

When traffic warrants caching, the layered approach below introduces caching progressively without architectural disruption:

```
Browser ─→ CloudFront CDN ─→ ALB ─→ Nginx ─→ Spring Boot ─→ Redis ─→ Database
  (L1)         (L2)                              (L3)          (L4)       (L5)
```

**Layer 1 — Browser Cache (existing):** Content-hashed static assets. No changes needed.

**Layer 2 — CloudFront CDN (new):** Place CloudFront in front of the ALB. Configure it to cache static asset responses (`/assets/*`, `*.js`, `*.css`, `*.woff2`) at edge locations. API paths (`/api/*`) pass through uncached. This reduces ALB and Nginx load for static content and improves latency for geographically distributed users. Estimated cost: ~$1/month at portfolio-level traffic.

**Layer 3 — Nginx Proxy Cache (new):** Enable Nginx's built-in `proxy_cache` for API responses with stable data:

```nginx
proxy_cache_path /tmp/nginx_cache levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=10m;

location /api/products {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;    # Cache 200 responses for 5 minutes
    proxy_cache_use_stale error timeout updating;
    add_header X-Cache-Status $upstream_cache_status;
}
```

This is effective for the E-Commerce product catalog where the same product list page is fetched by many users within a cache window.

**Layer 4 — Redis Application Cache (new):** Add ElastiCache Redis for:
- **Product catalog results** — `@Cacheable("products")` on the product service. Invalidate on product updates (event-driven or TTL-based).
- **Candidate scoring results** — Cache scores keyed by `(jobId, candidateId, scoreVersion)`. Invalidate when candidate data changes.
- **Rate limiting state** — Replace `ConcurrentHashMap` with Redis `INCR` + `EXPIRE`. Shared across all backend instances.
- **JWT refresh token blacklist** — On token revocation, write the token ID to Redis with TTL matching the remaining token lifetime. Faster than a database lookup on every refresh.

```java
@Cacheable(value = "products", key = "#categoryId + '-' + #page + '-' + #size")
public Page<Product> getProductsByCategory(Long categoryId, int page, int size) {
    return productRepository.findByCategoryId(categoryId, PageRequest.of(page, size));
}

@CacheEvict(value = "products", allEntries = true)
public Product updateProduct(Long id, ProductDTO dto) { ... }
```

**Layer 5 — Database Query Cache (existing, implicit):** PostgreSQL and MySQL both maintain internal query caches and buffer pools. PostgreSQL's `shared_buffers` defaults to 128 MB (adequate for the sidecar workload). MySQL's InnoDB buffer pool defaults to 128 MB. These are tunable but not explicitly configured because the sidecar databases operate within the Fargate task's memory constraint.

### 3.4 Cache Invalidation Strategy

Cache invalidation is the hardest problem in the system. The approach varies by data volatility:

| Data | Invalidation Strategy | TTL | Rationale |
|------|----------------------|-----|-----------|
| Product catalog | Event-driven (`@CacheEvict` on write) | 5 min fallback TTL | Products change via admin action — eviction is predictable |
| Featured projects | TTL-only | 15 min | Changes are rare, staleness is acceptable |
| Active job listings | TTL-only | 2 min | Recruiters expect near-real-time visibility |
| Candidate scores | Versioned key | 30 min | Recompute on schedule; stale score is better than no score |
| Rate limit counters | Redis TTL (auto-expire) | 15 min (matches window) | Self-invalidating by design |

---

## 4. Database Optimization

### 4.1 Current Index Strategy

#### Portfolio — PostgreSQL (H2 in Dev)

The portfolio database has three tables (`users`, `projects`, `refresh_tokens`) with minimal indexing beyond primary keys. The query patterns are simple:
- `SELECT * FROM projects WHERE featured = true` — benefits from an index on `featured`
- `SELECT * FROM refresh_tokens WHERE user_id = ? AND revoked = false` — benefits from a composite index

The low row count (single-digit users, tens of projects) means full table scans are effectively free. No custom indexes are needed at current scale.

#### E-Commerce — MySQL 8.0

```sql
-- Existing indexes (from schema)
PRIMARY KEY (id)                          -- All tables
UNIQUE KEY uk_customer_email (email)      -- customer table
FOREIGN KEY (category_id) → product_category(id)  -- product table
FOREIGN KEY (customer_id) → customer(id)           -- orders table
FOREIGN KEY (order_id) → orders(id)                -- order_item table
FOREIGN KEY (product_id) → product(id)             -- order_item table
```

**Index gaps identified:**

| Missing Index | Query It Would Optimize | Impact |
|--------------|------------------------|--------|
| `(category_id, date_created DESC)` on `product` | Product listing sorted by newest within category | Avoids filesort on category page loads |
| `(customer_id, date_created DESC)` on `orders` | Order history for a specific customer | Currently scans all orders to find one customer's records |
| `(status)` on `orders` | Admin order filtering by status | Full scan on status filter at scale |
| `(product_id, units_in_stock)` on `product` | Stock availability checks | Useful for inventory-aware queries |

At 100 rows, these missing indexes have zero measurable impact. At 100K+ orders, the `(customer_id, date_created)` composite index becomes critical for the order history page.

#### ATS — PostgreSQL 16

```sql
-- Existing indexes (from schema)
PRIMARY KEY (id)                            -- job, candidate tables
CREATE INDEX idx_candidate_job_id ON candidate (job_id);
CREATE INDEX idx_candidate_stage ON candidate (stage);
CREATE INDEX idx_job_status ON job (status);
```

**Index gaps identified:**

| Missing Index | Query It Would Optimize | Impact |
|--------------|------------------------|--------|
| `(job_id, stage)` composite on `candidate` | Candidates filtered by job AND stage (Kanban board columns) | Currently uses one index and filters the other in memory |
| `(latitude, longitude)` on `candidate` and `job` | Proximity pre-filtering before Haversine calculation | Candidate spatial queries without PostGIS |
| `(job_id, score DESC)` on a scoring results table | Pre-computed scores sorted by match quality | No scoring results table exists today — scores are computed on the fly |

### 4.2 Query Optimization Patterns

#### `open-in-view=false` (E-Commerce, ATS)

Both the E-Commerce and ATS backends set `spring.jpa.open-in-view=false`. This prevents the anti-pattern where a Hibernate session stays open through the full HTTP response lifecycle, allowing lazy-loaded associations to trigger additional SQL queries during JSON serialization.

With `open-in-view=false`, all data must be fetched within the service/repository layer. This makes N+1 query problems visible immediately (the lazy proxy throws `LazyInitializationException` instead of silently issuing N queries). The trade-off is that developers must use `@EntityGraph`, `JOIN FETCH`, or DTO projections explicitly.

#### Spring Data REST Pagination (E-Commerce)

Spring Data REST auto-generates paginated endpoints for all exposed repositories:

```
GET /api/products?page=0&size=20&sort=dateCreated,desc
```

Pagination limits the result set at the database level (`LIMIT 20 OFFSET 0`), preventing the backend from loading the entire product table into memory. This is the single most important query optimization for the E-Commerce catalog — without pagination, a product listing page would transfer all 100+ products per request.

#### DTO Projections (ATS)

The ATS candidate scoring endpoint returns a subset of candidate fields rather than the full entity:

```java
public record CandidateMatchDTO(
    Long id,
    String name,
    String stage,
    double score,
    double distance
) {}
```

This avoids fetching large text fields (parsed resume content, notes) that aren't needed for the scoring results view. At scale, DTO projections can be pushed to the database level via JPQL constructor expressions or native SQL.

### 4.3 Connection Pooling

All three backends use HikariCP (Spring Boot's default connection pool), but no explicit configuration is set. HikariCP defaults apply:

| Setting | Default Value | Implication |
|---------|---------------|-------------|
| `maximumPoolSize` | 10 | Maximum 10 concurrent database connections per backend instance |
| `minimumIdle` | Same as max (10) | Connection pool stays fully populated even during idle periods |
| `connectionTimeout` | 30,000 ms | Request waits up to 30 seconds for a connection before failing |
| `idleTimeout` | 600,000 ms (10 min) | Idle connections are retired after 10 minutes (only if pool > `minimumIdle`) |
| `maxLifetime` | 1,800,000 ms (30 min) | Connections are recycled after 30 minutes regardless of activity |

**At current scale (1 instance per backend, demo traffic):** The default of 10 connections is adequate — sidecar databases handle concurrent connections easily, and request volume doesn't approach pool exhaustion.

**At scale:** The pool size should be tuned relative to the database's max connection limit. PostgreSQL defaults to 100 max connections; MySQL's InnoDB defaults to 151. With N backend replicas, the formula is:

$$\text{maximumPoolSize} \leq \frac{\text{DB max connections} - \text{reserved connections}}{N}$$

For 4 backend replicas against PostgreSQL (100 max connections, 10 reserved for admin):

$$\text{maximumPoolSize} \leq \frac{100 - 10}{4} = 22$$

Recommended production configuration:

```properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=20000
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.max-lifetime=1200000
spring.datasource.hikari.leak-detection-threshold=60000
```

### 4.4 Database Engine Considerations

#### PostgreSQL (Portfolio, ATS)

PostgreSQL's MVCC model favors read-heavy workloads with concurrent writes. Each transaction sees a consistent snapshot without locking readers. This is well-matched to the ATS's pattern of recruiter reads (Kanban board, job listings) concurrent with candidate stage updates (drag-and-drop).

For the ATS's geographic queries, PostgreSQL offers two paths:
- **Current:** Haversine in application code — simple, testable, adequate at small scale
- **At scale:** PostGIS extension with `ST_DWithin` and GiST spatial indexes — orders-of-magnitude faster for proximity filtering across large candidate pools

PostgreSQL's `shared_buffers` (default 128 MB) and `effective_cache_size` (default 4 GB, but constrained by Fargate task memory) should be tuned when migrating to RDS. A `db.t3.small` (2 GB RAM) instance would set `shared_buffers = 512 MB` and `effective_cache_size = 1.5 GB`.

#### MySQL 8.0 (E-Commerce)

MySQL's InnoDB engine is optimized for the E-Commerce read pattern: clustered indexes on the primary key mean product lookups by ID are a single B-tree traversal. InnoDB's buffer pool caches both data and indexes in memory — at 128 MB default, the entire 100-product catalog sits in memory after the first read.

For the E-Commerce platform, MySQL's strengths are:
- **Clustered index on PK** — product detail pages (`SELECT * FROM product WHERE id = ?`) are single-page I/O
- **Covering indexes** — a composite `(category_id, date_created, name, unit_price)` index would serve category listing pages from the index alone, without touching the table
- **InnoDB buffer pool** — frequently accessed catalog data stays in memory between requests

### 4.5 Database Performance Monitoring

Currently, database performance is not directly monitored — there are no slow query logs, no connection pool metrics exposed, and no APM integration.

**What's available today:**
- Spring Boot Actuator `/actuator/health` — reports database connectivity (UP/DOWN) but not query latency
- CloudWatch Logs — application logs with 7-day retention; no structured query timing
- Container Insights — ECS-level CPU and memory metrics for the task (aggregated across backend + database sidecar)

**Recommended instrumentation (at scale):**
- Enable Actuator's `hikaricp` metrics endpoint — exposes pool utilization, connection wait time, and active connections via Micrometer
- Enable slow query logs: PostgreSQL `log_min_duration_statement = 200` (log queries >200ms); MySQL `slow_query_log = ON` with `long_query_time = 0.2`
- Add Micrometer + CloudWatch integration for JPA query timing: `spring.jpa.properties.hibernate.generate_statistics=true` in non-production profiles
- At RDS migration, enable Performance Insights (free tier includes 7 days of retention) for visual query analysis

### 4.6 Schema Design for Performance

**E-Commerce — Point-in-Time Snapshots:**

The `order_item` table stores `unit_price` at the time of purchase rather than referencing the product's current price. This is a denormalization that prevents a join on every order history query and ensures historical accuracy. The same pattern applies to shipping/billing addresses on orders — they're snapshotted, not referenced by foreign key to a mutable address table.

This denormalization trades write complexity (the checkout service must copy fields explicitly) for read performance (order history queries don't join to products or addresses).

**ATS — Candidate Stage as Column, Not Join Table:**

The candidate's pipeline stage (`APPLIED`, `SCREENING`, `INTERVIEW`, etc.) is stored as a `VARCHAR` column on the `candidate` table, not as a separate stage transition history table. This means the Kanban board query (`SELECT * FROM candidate WHERE job_id = ? AND stage = ?`) is a single indexed lookup. The trade-off is that stage transition history is lost — there's no audit trail of when a candidate moved from SCREENING to INTERVIEW. At production scale, a separate `stage_history` table (with `candidate_id`, `from_stage`, `to_stage`, `transitioned_at`) would provide audit capability without impacting the primary query path.

---

## Appendix: Performance Configuration Reference

### Current Resource Allocation

| Service | CPU (units) | Memory (MB) | vCPU Equivalent | Fargate Cost/Month (est.) |
|---------|-------------|-------------|-----------------|--------------------------|
| Portfolio Backend | 512 | 1024 | 0.25 | ~$14 |
| Portfolio Frontend | 256 | 512 | 0.25 | ~$9 |
| E-Commerce Backend + MySQL | 512 | 2048 | 0.25 | ~$18 |
| E-Commerce Frontend | 256 | 512 | 0.25 | ~$9 |
| ATS Backend + PostgreSQL | 512 | 1024 | 0.25 | ~$14 |
| ATS Frontend | 256 | 512 | 0.25 | ~$9 |
| **Total** | **2304** | **5632** | **1.5 vCPU** | **~$73** |

### Rate Limiting Configuration (Multi-Layer)

| Layer | Scope | Limit | Action |
|-------|-------|-------|--------|
| **WAF** (Layer 1) | All endpoints, per IP | 2,000 req / 5 min | Block |
| **WAF** (Layer 2) | `/api/auth/*`, per IP | 20 req / 5 min | Block |
| **Nginx** (Layer 3) | General, per IP | 30 req/s, burst 60 | 503 |
| **Nginx** (Layer 4) | API, per IP | 10 req/s | 503 |
| **Spring** (Layer 5) | Auth, per IP + username | 5 attempts / 15 min | 30-min lockout |

### Health Check Timings

| Component | Path | Interval | Timeout | Healthy Threshold | Unhealthy Threshold | Grace Period |
|-----------|------|----------|---------|-------------------|---------------------|--------------|
| Frontends | `/` | 30s | 10s | 2 | 2 | — |
| Backends | `/actuator/health` | 30s | 15s | 2 | 5 | 120s |
| DB (ECS sidecar) | `pg_isready` / `mysqladmin ping` | 10s | 5s | — | 10 retries | 30s |
