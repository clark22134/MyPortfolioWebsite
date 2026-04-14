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

All three applications — Portfolio (`clarkfoster.com`), E-Commerce (`shop.clarkfoster.com`), and HireFlow ATS (`ats.clarkfoster.com`) — share a serverless deployment topology: Angular SPA frontends hosted on S3 and served via CloudFront CDN, Spring Boot backends on Java 21 running as AWS Lambda functions behind API Gateway, and Aurora Serverless v2 databases (PostgreSQL 15.17) in private VPC subnets.

```
Internet → Route 53 → CloudFront (with WAF)
                           ├─ clarkfoster.com      → S3 (SPA) / API Gateway → Lambda → Aurora
                           ├─ shop.clarkfoster.com → S3 (SPA) / API Gateway → Lambda → Aurora
                           └─ ats.clarkfoster.com  → S3 (SPA) / API Gateway → Lambda → Aurora
```

### 1.2 Scaling — Lambda + Aurora Serverless v2

Every backend runs as a Lambda function. Lambda scales automatically from 0 to 1000+ concurrent executions with no configuration change. Aurora Serverless v2 scales from 0.5 to 4 ACU based on database load. All three applications share a single Aurora cluster with three separate databases.

| Component | Current Config | Scaling Mechanism |
|-----------|---------------|-------------------|
| Portfolio Backend | Lambda (2048 MB, SnapStart enabled) | Lambda auto-scales concurrency on demand; 0 idle cost |
| E-Commerce Backend | Lambda (2048 MB, SnapStart enabled) | Lambda auto-scales concurrency on demand; 0 idle cost |
| ATS Backend | Lambda (2048 MB, SnapStart enabled) | Lambda auto-scales concurrency on demand; 0 idle cost |
| Portfolio Frontend | S3 + CloudFront | CloudFront edge cache scales with global CDN capacity |
| E-Commerce Frontend | S3 + CloudFront | CloudFront edge cache scales with global CDN capacity |
| ATS Frontend | S3 + CloudFront | CloudFront edge cache scales with global CDN capacity |
| Databases (1 shared Aurora cluster) | Aurora Serverless v2 (0.5–4 ACU) — 3 databases: portfolio, ecommerce, ats | Auto-scales ACU units based on connection/CPU load |

Lambda charges per request (first 1M requests/month free, then $0.20 per 1M). There is no always-on compute cost. Scaling to handle a traffic spike is automatic — Lambda provisions additional execution environments concurrently without operator intervention.

**Cold start mitigation:** SnapStart (enabled on all three functions) reduces Java cold start time from 5–10s to under 2s by snapshotting the initialized JVM checkpoint. Additionally, EventBridge rules trigger a warming invocation every 4 minutes to keep execution environments alive during typical usage patterns.

### 1.3 Vertically Managed Components

| Component | Scaling Behavior | Operator Effort |
|-----------|-----------------|-----------------|
| **CloudFront** | AWS-managed global CDN — handles any traffic volume at 400+ edge POPs | None |
| **API Gateway** | AWS-managed — auto-scales to 10,000 req/s per region by default | None |
| **WAF** | AWS-managed — no capacity planning | None |
| **Route 53** | AWS-managed DNS with 100% SLA | None |
| **S3** | Unlimited object storage; auto-scales for GET throughput (3,500+ req/s per prefix) | None |
| **CloudWatch Logs** | 7-day retention limits accumulation; ingest scales automatically | None |

### 1.4 What Requires Re-Architecture to Scale

The Aurora Serverless v2 max ACU setting (currently 4 ACU on the single shared cluster) is the primary tunable database constraint. File storage, search, and parsing scale paths remain relevant for real production traffic.

| Component | Current Config | Scaling Path | Trigger Threshold |
|-----------|---------------|--------------|-------------------|
| **Databases** | Aurora Serverless v2 (0.5–4 ACU) — PostgreSQL 15.17 | Increase max ACU to 16; add Aurora read replica | >500 concurrent DB connections |
| **File storage** | Resume uploads on Lambda ephemeral `/tmp` (2048 MB) | S3 with pre-signed URLs for direct upload | Multi-instance concurrent uploads |
| **Search** | SQL `LIKE` for products, regex for candidate skills | OpenSearch / Elasticsearch | >10K products or >5K candidates |
| **Resume parsing** | Synchronous in Lambda invocation | SQS + Lambda background worker | >50 concurrent uploads |
| **Rate limiting** | In-memory `ConcurrentHashMap` per Lambda instance | Redis (ElastiCache) | >1 Lambda concurrent execution |
| **Lambda concurrency** | Default 1000 per region (shared across all functions) | Request reserved concurrency increase from AWS | Controlled traffic growth beyond portfolio scale |

### 1.5 Scaling Characteristics by Project

**Portfolio:** The lightest workload. Stateless read-heavy traffic (project listings, homepage). The only write path is the contact form (SMTP delivery). Scales horizontally with no state coordination — JWT is stateless, access tokens are self-contained. Refresh token validation hits Aurora Serverless v2 (PostgreSQL 15.17) via a VPC-internal connection. Lambda keeps a warm connection pool via HikariCP initialized at startup; SnapStart preserves this connection pool state in the checkpoint snapshot.

**E-Commerce:** Read-heavy catalog browsing (Spring Data REST auto-exposed endpoints with pagination) with write spikes during checkout. The cart merge logic (guest → authenticated) and order placement are the write-intensive paths. Aurora Serverless v2 scales to meet connection demand automatically. Product catalog reads are the prime candidate for caching since the inventory changes infrequently. Session consistency through stateless JWT makes horizontal Lambda scaling straightforward for the application tier.

**ATS (HireFlow):** The most computationally intensive. Resume parsing (Apache Tika → PDFBox/POI → regex skill extraction) is CPU-bound and synchronous. The Haversine distance calculation for candidate-job scoring runs in application code across all eligible candidates. Lambda's default 2048 MB memory allocation handles the parsing workload for typical resumes; the function timeout is set to 30 seconds. At scale, the parsing pipeline should move off the synchronous Lambda invocation path (SQS queue), and the scoring algorithm benefits from pre-computed distance caches or spatial database indexes. The 12 MB upload limit in the Nginx local dev config already constrains per-request memory impact; API Gateway enforces a 10 MB payload limit in production.

---

## 2. Bottlenecks & Mitigation

### 2.1 Identified Bottlenecks

#### Bottleneck 1 — Aurora Cold Start (All Projects)

**Impact:** Aurora Serverless v2 may pause when a cluster has been idle for an extended period. The first database connection after a pause incurs a 1–2 second reconnection delay. Under normal portfolio traffic this is rarely observed; under zero-traffic overnight scenarios, the delay affects the first early-morning request.

**Mitigation (current):**
- EventBridge warming rules ping all three Lambda functions every 4 minutes, keeping both the Lambda execution environment and the Aurora connection pool alive during normal hours
- HikariCP connection pool with `connectionTimeout=30000` and `idleTimeout=600000` handles brief Aurora reconnection gracefully
- SnapStart ensures the Lambda itself doesn't add cold start latency on top of any Aurora reconnection

**Mitigation (at scale):** Increase Aurora minimum ACU from 0.5 to 1 or 2; use Aurora Global Database for multi-region read replicas; switch to Aurora Provisioned for predictable high-throughput workloads.

#### Bottleneck 2 — Synchronous Resume Parsing (ATS)

**Impact:** Apache Tika + PDFBox (PDF) or Apache POI (DOCX) text extraction runs synchronously on the request thread. A complex 10-page PDF with embedded images can take 1–3 seconds to parse. During that time, the thread is blocked, and with the default Tomcat thread pool (200 threads), 200 concurrent uploads would saturate the backend.

**Mitigation (current):**
- 12 MB `client_max_body_size` cap in Nginx limits per-request memory consumption
- MIME type validation via Tika rejects non-PDF/DOCX files before heavy parsing begins
- The expected volume (tens of resumes, not thousands) is well within synchronous capacity

**Mitigation (at scale):**
1. Accept the upload, return `202 Accepted` with a job ID
2. Enqueue parsing work to SQS
3. A dedicated Lambda worker picks up the message, parses, and writes results to the database
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
| Aurora cold start (idle resume) | Low — EventBridge warming mitigates | Low — increase min ACU or use Provisioned | Low — adjust ACU settings |
| Synchronous resume parsing | Low — sub-second for typical files | **High** — Lambda timeout under concurrent load | Medium — SQS + Lambda worker pattern |
| In-memory rate limiting | None — WAF handles as primary gate | **High** — bypassed by multi-instance routing | Low — Redis drop-in replacement |
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

#### Layer 2 — API Gateway Connection Management

API Gateway manages HTTP connections between clients and Lambda functions. Each API Gateway endpoint handles TLS termination, request routing, and throttling. API Gateway supports HTTP/2 on the client side and invokes Lambda functions via the AWS internal invoke API, eliminating traditional connection pooling overhead between the gateway and backend.

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
Browser ─→ CloudFront CDN ─→ API Gateway ─→ Lambda (Spring Boot) ─→ Redis ─→ Aurora
  (L1)         (L2)              (L3)              (L4)              (L5)     (L6)
```

**Layer 1 — Browser Cache (existing):** Content-hashed static assets. No changes needed.

**Layer 2 — CloudFront CDN (existing):** CloudFront already serves SPA assets from S3 at edge locations. API paths (`/api/*`) route through API Gateway to Lambda. Static content is served directly from CloudFront’s edge cache, reducing latency for geographically distributed users.

**Layer 3 — API Gateway Caching (new):** Enable API Gateway’s built-in response caching for stable API responses:

- Configure per-stage caching with TTL for read-heavy endpoints (`/api/products`, `/api/projects`)
- Cache sizes from 0.5 GB to 237 GB available
- Cache key based on request path, query parameters, and headers
- Invalidation via `Cache-Control: max-age=0` header or API call

This is effective for the E-Commerce product catalog where the same product list page is fetched by many users within a cache window.

**Layer 4 — Redis Application Cache (new):** Add ElastiCache Redis for:
- **Product catalog results** — `@Cacheable("products")` on the product service. Invalidate on product updates (event-driven or TTL-based).
- **Candidate scoring results** — Cache scores keyed by `(jobId, candidateId, scoreVersion)`. Invalidate when candidate data changes.
- **Rate limiting state** — Replace `ConcurrentHashMap` with Redis `INCR` + `EXPIRE`. Shared across all Lambda execution environments.
- **JWT refresh token blacklist** — On token revocation, write the token ID to Redis with TTL matching the remaining token lifetime. Faster than an Aurora lookup on every refresh.

```java
@Cacheable(value = "products", key = "#categoryId + '-' + #page + '-' + #size")
public Page<Product> getProductsByCategory(Long categoryId, int page, int size) {
    return productRepository.findByCategoryId(categoryId, PageRequest.of(page, size));
}

@CacheEvict(value = "products", allEntries = true)
public Product updateProduct(Long id, ProductDTO dto) { ... }
```

**Layer 5 — Database Query Cache (Aurora-managed):** Aurora PostgreSQL 15.17 maintains internal buffer pools for the shared cluster. The single Aurora Serverless v2 cluster has dedicated compute and memory that scales with ACU allocation; there is no resource contention between the databases and the Lambda functions. Buffer pool size scales proportionally with ACU allocation.

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

#### E-Commerce — PostgreSQL 15.17 (Aurora Serverless v2)

The E-Commerce database was migrated from MySQL 8.0 to PostgreSQL 15.17 during the Aurora consolidation. It shares the same Aurora Serverless v2 cluster as Portfolio and ATS.

```sql
-- Existing indexes (from schema)
PRIMARY KEY (id)                                              -- All tables
UNIQUE (email)                                                -- customer table
FOREIGN KEY (category_id) REFERENCES product_category(id)     -- product table
FOREIGN KEY (customer_id) REFERENCES customer(id)             -- orders table
FOREIGN KEY (order_id) REFERENCES orders(id)                  -- order_item table
FOREIGN KEY (product_id) REFERENCES product(id)               -- order_item table
```

**Index gaps identified:**

| Missing Index | Query It Would Optimize | Impact |
|--------------|------------------------|--------|
| `CREATE INDEX idx_product_category_date ON product (category_id, date_created DESC)` | Product listing sorted by newest within category | Avoids sort on category page loads |
| `CREATE INDEX idx_orders_customer_date ON orders (customer_id, date_created DESC)` | Order history for a specific customer | Currently scans all orders to find one customer’s records |
| `CREATE INDEX idx_orders_status ON orders (status)` | Admin order filtering by status | Full scan on status filter at scale |
| `CREATE INDEX idx_product_stock ON product (product_id, units_in_stock)` | Stock availability checks | Useful for inventory-aware queries |
| `CREATE INDEX idx_product_search ON product USING GIN (to_tsvector('english', name))` | Full-text product search | Replaces `LIKE '%keyword%'` with indexed tsvector search |

At 100 rows, these missing indexes have zero measurable impact. At 100K+ orders, the `(customer_id, date_created)` composite index becomes critical for the order history page. PostgreSQL’s GIN indexes enable efficient full-text search as an alternative to the current `LIKE` pattern.

#### ATS — PostgreSQL 15.17 (Aurora Serverless v2)

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
| `maximumPoolSize` | 10 | Maximum 10 concurrent database connections per Lambda execution environment |
| `minimumIdle` | Same as max (10) | Connection pool stays fully populated even during idle periods |
| `connectionTimeout` | 30,000 ms | Request waits up to 30 seconds for a connection before failing |
| `idleTimeout` | 600,000 ms (10 min) | Idle connections are retired after 10 minutes (only if pool > `minimumIdle`) |
| `maxLifetime` | 1,800,000 ms (30 min) | Connections are recycled after 30 minutes regardless of activity |

**At current scale (Lambda with demo traffic):** The default of 10 connections per Lambda execution environment is adequate — the single shared Aurora Serverless v2 cluster handles concurrent connections across all three databases, and request volume doesn’t approach pool exhaustion. SnapStart preserves the initialized HikariCP pool in the JVM checkpoint, so warm invocations reuse established connections.

**At scale:** The pool size should be tuned relative to the Aurora cluster’s max connection limit. Aurora Serverless v2 max connections scale with ACU (approximately 90 connections per ACU). With N concurrent Lambda execution environments across all three functions, the formula is:

$$\text{maximumPoolSize} \leq \frac{\text{DB max connections} - \text{reserved connections}}{N}$$

For 20 concurrent Lambda environments against Aurora (4 ACU ≈ 360 max connections, 30 reserved for admin):

$$\text{maximumPoolSize} \leq \frac{360 - 30}{20} = 16$$

Recommended production configuration:

```properties
spring.datasource.hikari.maximum-pool-size=16
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=20000
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.max-lifetime=1200000
spring.datasource.hikari.leak-detection-threshold=60000
```

### 4.4 Database Engine Considerations

#### PostgreSQL 15.17 — Shared Aurora Serverless v2 Cluster (All Three Applications)

All three applications (Portfolio, E-Commerce, ATS) run on PostgreSQL 15.17 via a single shared Aurora Serverless v2 cluster with three separate databases. The E-Commerce database was migrated from MySQL 8.0 to PostgreSQL during the Aurora consolidation.

PostgreSQL's MVCC model favors read-heavy workloads with concurrent writes. Each transaction sees a consistent snapshot without locking readers. This is well-matched to the ATS's pattern of recruiter reads (Kanban board, job listings) concurrent with candidate stage updates (drag-and-drop), and the E-Commerce catalog's read-heavy browsing with occasional checkout writes.

**E-Commerce-specific strengths (post-migration from MySQL):**
- **B-tree index on PK** — product detail pages (`SELECT * FROM product WHERE id = ?`) are efficient single-index lookups
- **Covering indexes** — `CREATE INDEX ... INCLUDE (name, unit_price)` serves category listing pages from the index alone, without a heap lookup
- **GIN indexes for full-text search** — `to_tsvector`/`to_tsquery` enables indexed full-text product search, replacing `LIKE '%keyword%'` patterns
- **Shared buffer cache** — frequently accessed catalog data stays in memory between requests

**ATS-specific strengths (geographic queries):**
- **Current:** Haversine in application code — simple, testable, adequate at small scale
- **At scale:** PostGIS extension with `ST_DWithin` and GiST spatial indexes — orders-of-magnitude faster for proximity filtering across large candidate pools

Aurora Serverless v2 manages `shared_buffers` and `effective_cache_size` automatically based on the current ACU allocation. At 0.5 ACU (~1 GB RAM), Aurora allocates approximately 256 MB to the buffer cache; at 4 ACU (~8 GB RAM), the buffer cache scales to approximately 5.3 GB. No manual tuning is needed — Aurora adjusts these parameters dynamically as ACUs scale.

### 4.5 Database Performance Monitoring

Currently, database performance is not directly monitored — there are no slow query logs, no connection pool metrics exposed, and no APM integration.

**What's available today:**
- Spring Boot Actuator `/actuator/health` — reports database connectivity (UP/DOWN) but not query latency
- CloudWatch Logs — application logs with 7-day retention; no structured query timing
- CloudWatch Lambda Insights — per-function metrics for memory utilization, duration, cold starts, and concurrent executions

**Recommended instrumentation (at scale):**
- Enable Actuator's `hikaricp` metrics endpoint — exposes pool utilization, connection wait time, and active connections via Micrometer
- Enable slow query logs: PostgreSQL `log_min_duration_statement = 200` (log queries >200ms) via Aurora cluster parameter group
- Add Micrometer + CloudWatch integration for JPA query timing: `spring.jpa.properties.hibernate.generate_statistics=true` in non-production profiles
- Enable Performance Insights on the Aurora cluster (free tier includes 7 days of retention) for visual query analysis

### 4.6 Schema Design for Performance

**E-Commerce — Point-in-Time Snapshots:**

The `order_item` table stores `unit_price` at the time of purchase rather than referencing the product's current price. This is a denormalization that prevents a join on every order history query and ensures historical accuracy. The same pattern applies to shipping/billing addresses on orders — they're snapshotted, not referenced by foreign key to a mutable address table.

This denormalization trades write complexity (the checkout service must copy fields explicitly) for read performance (order history queries don't join to products or addresses).

**ATS — Candidate Stage as Column, Not Join Table:**

The candidate's pipeline stage (`APPLIED`, `SCREENING`, `INTERVIEW`, etc.) is stored as a `VARCHAR` column on the `candidate` table, not as a separate stage transition history table. This means the Kanban board query (`SELECT * FROM candidate WHERE job_id = ? AND stage = ?`) is a single indexed lookup. The trade-off is that stage transition history is lost — there's no audit trail of when a candidate moved from SCREENING to INTERVIEW. At production scale, a separate `stage_history` table (with `candidate_id`, `from_stage`, `to_stage`, `transitioned_at`) would provide audit capability without impacting the primary query path.

---

## Appendix: Performance Configuration Reference

### Current Resource Allocation

| Service | Memory | SnapStart | Estimated Cost/Month |
|---------|--------|-----------|---------------------|
| Portfolio Backend (Lambda) | 2048 MB | Enabled | ~$0 (free tier) |
| E-Commerce Backend (Lambda) | 2048 MB | Enabled | ~$0 (free tier) |
| ATS Backend (Lambda) | 2048 MB | Enabled | ~$0 (free tier) |
| Frontends (S3 + CloudFront) | N/A | N/A | ~$1–3 (S3 storage + CloudFront transfer) |
| Aurora Serverless v2 (1 shared cluster, 3 DBs) | 0.5–4 ACU | N/A | ~$43 (0.5 ACU minimum × $0.12/ACU-hour) |
| **Total** | — | — | **~$45–50** |

Lambda pricing: first 1M requests/month free, then $0.20/1M requests. At portfolio-level traffic, all three backends remain within the free tier. Aurora Serverless v2 is the primary ongoing cost.

### Rate Limiting Configuration (Multi-Layer)

| Layer | Scope | Limit | Action |
|-------|-------|-------|--------|
| **WAF** (Layer 1) | All endpoints, per IP | 2,000 req / 5 min | Block |
| **WAF** (Layer 3) | `/api/auth/*`, per IP | 20 req / 5 min | Block |
| **API Gateway** (Layer 3) | Per-account, per-region | 10,000 req/s (default) | 429 |
| **Spring** (Layer 4) | Auth, per IP + username | 5 attempts / 15 min | 30-min lockout |

### Health Check Timings

| Component | Path | Interval | Timeout | Healthy Threshold | Unhealthy Threshold | Grace Period |
|-----------|------|----------|---------|-------------------|---------------------|--------------|
| Frontends | S3 + CloudFront health origin checks | — | — | — | — | — |
| Backends | `/actuator/health` (Lambda health via API Gateway) | — | — | — | — | — |
| Aurora Serverless v2 | Managed by AWS — automatic health monitoring | — | — | — | — | — |
