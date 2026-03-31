# Architecture Diagrams

---

## 1. Portfolio Website — clarkfoster.com

### 1.1 High-Level Architecture

```mermaid
graph TB
    subgraph Internet
        Browser[Browser]
    end

    subgraph AWS["AWS — us-east-1"]
        Route53["Route 53<br/>clarkfoster.com"]
        WAF["AWS WAF<br/>Rate Limiting + Managed Rules"]
        ACM["ACM Certificate<br/>*.clarkfoster.com"]

        subgraph VPC["VPC — 10.0.0.0/16"]
            subgraph ALB_Sub["Application Load Balancer"]
                ALB["ALB<br/>HTTPS :443"]
            end
            
            subgraph ECS["ECS Fargate Cluster"]
                FE["portfolio-frontend<br/>Nginx + Angular SPA<br/>256 CPU / 512 MB"]
                BE["portfolio-backend<br/>Spring Boot<br/>512 CPU / 1024 MB"]
            end
        end

        SM["Secrets Manager<br/>JWT, Admin, SMTP Credentials"]
        CW["CloudWatch Logs<br/>7-day retention"]
        ECR["ECR<br/>portfolio-frontend<br/>portfolio-backend"]
    end

    subgraph External
        SMTP["Gmail SMTP<br/>Contact Form Delivery"]
    end

    Browser -->|HTTPS| Route53
    Route53 --> ALB
    WAF -.->|Attached| ALB
    ACM -.->|TLS Cert| ALB
    ALB -->|"/* → port 80"| FE
    ALB -->|"/api/* → port 8080"| BE
    BE -->|Send Email| SMTP
    SM -.->|Inject Secrets| BE
    BE -->|Logs| CW
    FE -->|Logs| CW
    ECR -.->|Pull Images| ECS
```

### 1.2 Component Diagram

```mermaid
graph LR
    subgraph Frontend["Angular SPA"]
        Router["Router"]
        HomeC["HomeComponent<br/>Terminal Loader, Skills, Featured"]
        ProjectsC["ProjectsComponent<br/>Browse All Projects"]
        ContactC["ContactComponent<br/>Email Form"]
        LoginC["LoginComponent<br/>Username/Password"]
        AdminC["InteractiveProjectsComponent<br/>RAG, CLIP, ML, LLM"]
        CredC["CredentialsComponent"]
        A11yC["AccessibilityComponent"]
        
        AuthSvc["AuthService<br/>JWT Cookie Management"]
        ProjectSvc["ProjectService"]
        ContactSvc["ContactService"]
        AuthGuard["AuthGuard<br/>Protects /admin/*"]
        AuthInterceptor["AuthInterceptor<br/>withCredentials: true"]
    end

    subgraph Backend["Spring Boot"]
        AuthCtrl["AuthController<br/>/api/auth"]
        ProjCtrl["ProjectController<br/>/api/projects"]
        ContactCtrl["ContactController<br/>/api/contact"]
        
        JwtFilter["JwtAuthenticationFilter"]
        JwtUtil["JwtUtils<br/>Access: 15 min<br/>Refresh: 7 days"]
        RateLimiter["RateLimitFilter<br/>Per IP + Username"]

        AuthSvcBE["AuthService"]
        ProjSvcBE["ProjectService"]
        EmailSvc["EmailService<br/>Spring Mail"]
        RefreshSvc["RefreshTokenService<br/>Max 5 per User"]
    end

    subgraph Database["PostgreSQL"]
        Users["users"]
        Projects["projects"]
        RefreshTokens["refresh_tokens"]
    end

    Router --> HomeC & ProjectsC & ContactC & LoginC & AdminC & CredC & A11yC
    AuthGuard -.->|Protects| AdminC
    AuthInterceptor -.->|Attaches Cookies| AuthSvc & ProjectSvc & ContactSvc

    AuthSvc -->|HTTP| AuthCtrl
    ProjectSvc -->|HTTP| ProjCtrl
    ContactSvc -->|HTTP| ContactCtrl

    JwtFilter -.->|Validates Requests| AuthCtrl & ProjCtrl & ContactCtrl
    AuthCtrl --> AuthSvcBE --> JwtUtil & RefreshSvc
    ProjCtrl --> ProjSvcBE
    ContactCtrl --> EmailSvc

    AuthSvcBE --> Users & RefreshTokens
    ProjSvcBE --> Projects
    RefreshSvc --> RefreshTokens
```

### 1.3 Data Flow Diagram

```mermaid
sequenceDiagram
    participant B as Browser
    participant N as Nginx
    participant ALB as ALB
    participant API as Spring Boot
    participant DB as PostgreSQL
    participant SMTP as Gmail SMTP
    participant SM as Secrets Manager

    Note over SM,API: Startup: Secrets injected as env vars

    rect rgb(240, 248, 255)
        Note over B,N: Public Browsing
        B->>ALB: GET /
        ALB->>N: Route to frontend (port 80)
        N-->>B: Angular SPA
        B->>ALB: GET /api/projects/featured
        ALB->>API: Route to backend (port 8080)
        API->>DB: SELECT * FROM projects WHERE featured=true
        DB-->>API: Project list
        API-->>B: JSON response
    end

    rect rgb(255, 248, 240)
        Note over B,DB: Authentication
        B->>API: POST /api/auth/login {username, password}
        API->>DB: Lookup user, verify BCrypt hash
        API->>DB: Store refresh token (device, IP)
        API-->>B: Set-Cookie: accessToken (HttpOnly, 15 min)<br/>Set-Cookie: refreshToken (HttpOnly, 7 days)
    end

    rect rgb(240, 255, 240)
        Note over B,DB: Token Refresh
        B->>API: POST /api/auth/refresh (cookie)
        API->>DB: Validate refresh token, check revoked flag
        API->>DB: Rotate: revoke old, issue new refresh token
        API-->>B: New access + refresh cookies
    end

    rect rgb(255, 240, 245)
        Note over B,SMTP: Contact Form
        B->>API: POST /api/contact {name, email, subject, message}
        API->>SMTP: Send email (reply-to: sender)
        SMTP-->>API: Delivery confirmation
        API-->>B: 200 OK
    end
```

### 1.4 Component Explanations

| Component | Purpose |
|-----------|---------|
| **Nginx** | Serves the compiled Angular SPA. Adds security headers (HSTS, CSP, X-Frame-Options). Handles SPA fallback routing via `try_files`. Rate-limits requests at the protocol level. |
| **Angular SPA** | Single-page application with standalone components. Lazy-loads interactive project routes. Manages JWT lifecycle via interceptors and guards. |
| **Spring Boot API** | Stateless REST backend. Handles authentication, project CRUD, and contact form submission. JWT filter chain validates every request. |
| **PostgreSQL** | Stores users, projects, and refresh tokens. Runs as H2 in-memory for local development, PostgreSQL in production. |
| **Secrets Manager** | Injects sensitive configuration (JWT signing key, admin credentials, SMTP password) into the container at task startup. Avoids hardcoded secrets in images or task definitions. |
| **Gmail SMTP** | External email relay for contact form submissions. Configured via Spring Mail with injected credentials. |
| **RefreshTokenService** | Enforces a maximum of 5 active refresh tokens per user. Tracks device (user agent) and IP address per session. Supports single-device and all-device logout. |

### 1.5 Architecture Rationale

**Why this architecture:**

The portfolio is a low-traffic, content-driven site. A single Spring Boot backend with an embedded JWT auth system keeps deployment simple — one backend container, no external auth provider dependency. PostgreSQL stores minimal data (users, projects, refresh tokens), so a managed database would be over-provisioned. The frontend is a static Angular build served by Nginx, which also handles TLS termination at the edge (ALB) and adds security headers.

**Key tradeoffs:**

| Decision | Benefit | Cost |
|----------|---------|------|
| JWT with refresh tokens vs. session-based auth | Stateless backend, no session store needed | Token revocation requires database lookup on refresh; can't instantly revoke access tokens |
| Spring Mail (Gmail SMTP) vs. SES | Zero AWS cost for low-volume email, simpler config | Gmail rate limits (500/day), requires app password management |
| H2 for dev / PostgreSQL for prod | Fast local iteration, no local DB setup needed | Schema drift risk — mitigated by `ddl-auto=update` |
| No CDN (CloudFront) | Fewer moving parts, lower cost | Higher latency for geographically distant users |
| Sidecar-less backend (no DB container) | Smaller task footprint (512 CPU / 1024 MB) | Portfolio uses H2 in dev; in prod, the data set is small enough that an embedded approach was considered but PostgreSQL was chosen for durability |

---

## 2. E-Commerce Platform — shop.clarkfoster.com

### 2.1 High-Level Architecture

```mermaid
graph TB
    subgraph Internet
        Browser[Browser]
    end

    subgraph AWS["AWS — us-east-1"]
        Route53["Route 53<br/>shop.clarkfoster.com"]
        WAF["AWS WAF"]
        
        subgraph VPC["VPC — 10.0.0.0/16"]
            ALB["ALB<br/>HTTPS :443"]
            
            subgraph ECS["ECS Fargate Cluster"]
                FE["ecommerce-frontend<br/>Nginx + Angular SPA<br/>256 CPU / 512 MB"]
                
                subgraph BackendTask["Backend Task — 512 CPU / 2048 MB"]
                    BE["ecommerce-backend<br/>Spring Boot<br/>port 8080"]
                    DB["ecommerce-db<br/>MySQL Sidecar<br/>port 3306"]
                end
            end
        end

        SM["Secrets Manager"]
        CW["CloudWatch Logs"]
        ECR["ECR<br/>ecommerce-frontend<br/>ecommerce-backend<br/>ecommerce-db"]
    end

    Browser -->|HTTPS| Route53
    Route53 --> ALB
    WAF -.->|Attached| ALB
    ALB -->|"/* → port 80"| FE
    ALB -->|"/api/* → port 8080"| BE
    BE -->|"localhost:3306"| DB
    SM -.->|Inject Secrets| BE
    BE -->|Logs| CW
    FE -->|Logs| CW
    DB -->|Logs| CW
```

### 2.2 Component Diagram

```mermaid
graph LR
    subgraph Frontend["Angular SPA"]
        ProductList["ProductListComponent<br/>Grid, Pagination, Category Filter"]
        CartDetails["CartDetailsComponent<br/>Quantities, Totals"]
        Checkout["CheckoutComponent<br/>Address, Card, Place Order"]
        Login["LoginComponent<br/>Login / Register Toggle"]
        OrderHistory["OrderHistoryComponent<br/>Search, Sort, Expand"]
        Search["SearchComponent"]
        CartStatus["CartStatusComponent<br/>Navbar Cart Icon"]

        ProductSvc["ProductService<br/>Spring Data REST HAL Parser"]
        CartSvc["CartService<br/>localStorage + DB Sync"]
        CheckoutSvc["CheckoutService"]
        AuthSvcFE["AuthService<br/>Signals: isAuthenticated, userEmail"]
        OrderSvc["OrderHistoryService"]
        ShopFormSvc["ShopFormService<br/>Countries, States, Card Years"]
        AuthGuardFE["authGuard<br/>Protects /order-history"]
    end

    subgraph Backend["Spring Boot"]
        AuthCtrl["AuthController<br/>/api/auth"]
        CartCtrl["CartController<br/>/api/cart"]
        CheckoutCtrl["CheckoutController<br/>/api/checkout/purchase"]
        OrderCtrl["OrderController<br/>/api/orders"]
        DataREST["Spring Data REST<br/>/api/products (read-only)<br/>/api/product-category<br/>/api/countries, /api/states"]

        CartSvcBE["CartService"]
        CheckoutSvcBE["CheckoutService<br/>UUID Tracking Numbers<br/>Card Masking (last 4)"]
        JwtFilter["JwtAuthenticationFilter<br/>Cookie or Bearer"]
    end

    subgraph Database["MySQL"]
        Products["product / product_category"]
        Customers["customer"]
        Addresses["address"]
        Orders["orders / order_item"]
        CartItems["cart_item"]
        Geo["country / state"]
    end

    ProductSvc -->|GET| DataREST
    CartSvc -->|PUT/GET| CartCtrl
    CheckoutSvc -->|POST| CheckoutCtrl
    AuthSvcFE -->|POST| AuthCtrl
    OrderSvc -->|GET| OrderCtrl
    ShopFormSvc -->|GET| DataREST

    JwtFilter -.->|Validates| CartCtrl & CheckoutCtrl & OrderCtrl
    DataREST --> Products & Geo
    CartCtrl --> CartSvcBE --> CartItems & Customers
    CheckoutCtrl --> CheckoutSvcBE --> Orders & Customers & Addresses
    OrderCtrl --> Orders
    AuthCtrl --> Customers
```

### 2.3 Data Flow Diagram

```mermaid
sequenceDiagram
    participant B as Browser
    participant ALB as ALB
    participant API as Spring Boot
    participant REST as Spring Data REST
    participant DB as MySQL (Sidecar)

    rect rgb(240, 248, 255)
        Note over B,DB: Product Browsing (Public, No Auth)
        B->>ALB: GET /api/products?page=0&size=8&categoryId=2
        ALB->>REST: Forward
        REST->>DB: SELECT from product WHERE category_id=2
        DB-->>REST: Product page
        REST-->>B: HAL+JSON {_embedded: {products: [...]}, page: {...}}
    end

    rect rgb(240, 255, 240)
        Note over B,DB: Guest Cart (Client-Side)
        Note right of B: Cart stored in localStorage<br/>(key: cartItems)
        B->>B: Add to cart → localStorage.setItem()
    end

    rect rgb(255, 248, 240)
        Note over B,DB: Login + Cart Merge
        B->>API: POST /api/auth/login {email, password}
        API->>DB: Verify customer credentials
        API-->>B: Set-Cookie: jwt (HttpOnly, 1 hour)
        B->>API: GET /api/cart (with cookie)
        API->>DB: SELECT from cart_item WHERE customer_id=?
        DB-->>API: Server-side cart items
        API-->>B: Cart items
        Note right of B: Merge: guest items + server items<br/>Deduplicate by productId
        B->>API: PUT /api/cart [merged items]
        API->>DB: DELETE old cart, INSERT merged items
    end

    rect rgb(255, 240, 245)
        Note over B,DB: Checkout + Order Placement
        B->>API: POST /api/checkout/purchase
        Note right of B: {customer, shippingAddress,<br/>billingAddress, order, orderItems}
        API->>API: Mask card number → last 4 digits only
        API->>API: Generate UUID tracking number
        API->>DB: INSERT order, order_items, link addresses
        API->>DB: Set order status = PROCESSING
        DB-->>API: Saved
        API-->>B: {orderTrackingNumber: "uuid"}
    end

    rect rgb(248, 240, 255)
        Note over B,DB: Order History (Authenticated)
        B->>API: GET /api/orders (with cookie)
        API->>DB: SELECT orders + items + addresses<br/>WHERE customer_email=? ORDER BY date DESC
        DB-->>API: Order list with nested items
        API-->>B: JSON order array
    end
```

### 2.4 Component Explanations

| Component | Purpose |
|-----------|---------|
| **Spring Data REST** | Auto-generates paginated, filterable, read-only REST endpoints for the product catalog, categories, countries, and states from JPA repository interfaces. Eliminates boilerplate controller code for the read path. Write operations are disabled via `MyDataRestConfig`. |
| **CartService (frontend)** | Manages dual-storage cart: `localStorage` for guests, database for authenticated users. On login, fetches the server-side cart, merges it with local guest items (deduplicating by productId), and persists the merged result. On logout, saves current cart to server before clearing local state. |
| **CheckoutService (backend)** | Converts the `Purchase` DTO into persisted entities. Masks credit card numbers to last 4 digits before writing to the database. Generates a UUID-based order tracking number. Links order to the authenticated customer or the form-submitted customer info for guest checkout. |
| **MySQL Sidecar** | Runs as a second container inside the same ECS task (shared `awsvpc` network mode). Communicates with the backend via `localhost:3306`. Health-checked via `mysqladmin ping` with a 30-second start period. Initialized from a schema script on first boot. |
| **JwtAuthenticationFilter** | Extracts JWT from HTTP-only cookie first, falls back to `Authorization: Bearer` header. Handles stale cookies gracefully — if the user was deleted from the database, the request proceeds as unauthenticated rather than returning a 500. |

### 2.5 Architecture Rationale

**Why this architecture:**

The e-commerce platform needs a relational data model (products, orders, customers, addresses with strict referential integrity) and both read-heavy public browsing and write-heavy authenticated operations. Spring Data REST handles the read path with zero controller code, while explicit controllers handle writes with business logic (card masking, order tracking, cart merge). The sidecar database pattern keeps the backend and database co-located in the same task, avoiding cross-network latency and the cost of a managed RDS instance.

**Key tradeoffs:**

| Decision | Benefit | Cost |
|----------|---------|------|
| Spring Data REST for catalog vs. custom controllers | Auto-generates paginated, filterable, HAL-compliant endpoints from repository interfaces | Less control over response shape; frontend must parse HAL `_embedded` format |
| MySQL sidecar vs. RDS | No RDS cost (~$15+/month for db.t3.micro). Simpler task-level deployment. | No managed backups, no multi-AZ failover, no point-in-time recovery. Data loss if the task is replaced. Acceptable for a demonstration project. |
| Card masking (last 4 digits) with no payment gateway | Demonstrates PCI-aware handling without payment processor integration costs | Cannot process real payments without adding Stripe/PayPal |
| Guest cart in localStorage + server merge on login | Users can browse and add items without creating an account | Merge logic adds frontend complexity; edge cases around duplicate products |
| JWT in HTTP-only cookie vs. localStorage | XSS protection — JavaScript cannot access the token | Requires `withCredentials: true` on all HTTP calls; CORS must be explicitly configured |

---

## 3. HireFlow (ATS) — ats.clarkfoster.com

### 3.1 High-Level Architecture

```mermaid
graph TB
    subgraph Internet
        Browser[Browser]
    end

    subgraph AWS["AWS — us-east-1"]
        Route53["Route 53<br/>ats.clarkfoster.com"]
        WAF["AWS WAF"]

        subgraph VPC["VPC — 10.0.0.0/16"]
            ALB["ALB<br/>HTTPS :443"]

            subgraph ECS["ECS Fargate Cluster"]
                FE["ats-frontend<br/>Nginx + Angular SPA<br/>256 CPU / 512 MB"]

                subgraph BackendTask["Backend Task — 512 CPU / 1024 MB"]
                    BE["ats-backend<br/>Spring Boot<br/>port 8080"]
                    DB["ats-db<br/>PostgreSQL 16 Sidecar<br/>port 5432"]
                    FS["Resume File Storage<br/>(Container Filesystem)"]
                end
            end
        end

        CW["CloudWatch Logs"]
        ECR["ECR<br/>ats-frontend<br/>ats-backend<br/>ats-db"]
    end

    Browser -->|HTTPS| Route53
    Route53 --> ALB
    WAF -.->|Attached| ALB
    ALB -->|"/* → port 80"| FE
    ALB -->|"/api/* → port 8080"| BE
    BE -->|"localhost:5432"| DB
    BE -->|Read/Write| FS
    BE -->|Logs| CW
    FE -->|Logs| CW
    DB -->|Logs| CW
```

### 3.2 Component Diagram

```mermaid
graph LR
    subgraph Frontend["Angular SPA"]
        Dashboard["DashboardComponent<br/>Stats, Pie Chart, Stage Breakdown"]
        Jobs["JobsComponent<br/>CRUD, Employer Groups, Top Matches"]
        Pipeline["PipelineComponent<br/>Drag-and-Drop Kanban (7 Stages)"]
        Talent["TalentComponent<br/>Pool, Resume Upload, Filter"]

        JobSvc["JobService"]
        CandSvc["CandidateService"]
        DashSvc["DashboardService"]
    end

    subgraph Backend["Spring Boot"]
        JobCtrl["JobController<br/>/api/jobs"]
        CandCtrl["CandidateController<br/>/api/candidates"]
        TalentCtrl["TalentPoolController<br/>/api/talent-pool"]
        DashCtrl["DashboardController<br/>/api/dashboard"]

        JobSvcBE["JobService<br/>Top Candidate Matching"]
        CandSvcBE["CandidateService"]
        ResumeSvc["ResumeParserService<br/>Tika + PDFBox + POI"]
        DashSvcBE["DashboardService<br/>Aggregation Queries"]

        MatchAlgo["Matching Algorithm<br/>Skills: 50%<br/>Availability: 25%<br/>Proximity: 25%"]
    end

    subgraph Database["PostgreSQL 16"]
        JobTbl["job<br/>idx: status"]
        CandTbl["candidate<br/>idx: job_id, stage"]
    end

    subgraph FileSystem["Container FS"]
        Resumes["Uploaded Resumes<br/>UUID Filenames"]
    end

    JobSvc -->|HTTP| JobCtrl
    CandSvc -->|HTTP| CandCtrl & TalentCtrl
    DashSvc -->|HTTP| DashCtrl

    JobCtrl --> JobSvcBE --> MatchAlgo
    CandCtrl --> CandSvcBE
    TalentCtrl --> ResumeSvc
    DashCtrl --> DashSvcBE

    JobSvcBE --> JobTbl & CandTbl
    CandSvcBE --> CandTbl
    ResumeSvc --> CandTbl
    ResumeSvc --> Resumes
    DashSvcBE --> JobTbl & CandTbl
    MatchAlgo --> CandTbl
```

### 3.3 Data Flow Diagram

```mermaid
sequenceDiagram
    participant B as Browser
    participant ALB as ALB
    participant API as Spring Boot
    participant Parser as ResumeParserService
    participant DB as PostgreSQL (Sidecar)
    participant FS as Container Filesystem

    rect rgb(240, 248, 255)
        Note over B,DB: Resume Upload → Auto-Create Candidate
        B->>ALB: POST /api/talent-pool/upload (multipart/form-data, ≤12MB)
        ALB->>API: Forward
        API->>Parser: parse(file)
        Parser->>Parser: Tika: detect MIME type<br/>(PDF, DOCX, or TXT only)
        Parser->>Parser: Extract text (PDFBox / POI / raw)
        Parser->>Parser: Regex: extract name, email, phone
        Parser->>Parser: Match against 60+ tech skills
        Parser-->>API: ParsedResume {name, email, skills[], text}
        API->>FS: Save file as UUID filename
        API->>DB: INSERT candidate (talent pool job, parsed fields)
        DB-->>API: Created candidate
        API-->>B: Candidate JSON
    end

    rect rgb(255, 248, 240)
        Note over B,DB: Top Candidate Matching
        B->>API: GET /api/jobs/42/top-candidates
        API->>DB: SELECT job (required_skills, lat, lng)
        API->>DB: SELECT all candidates
        DB-->>API: Candidate list
        API->>API: Score each candidate:
        Note right of API: skills_match = matched/required × 0.50<br/>availability = normalize(days, 730) × 0.25<br/>proximity = (1 - haversine/50mi) × 0.25
        API->>API: Sort by composite score, take top 5
        API-->>B: TopCandidateMatch[] with scores
    end

    rect rgb(240, 255, 240)
        Note over B,DB: Pipeline Stage Transition (Drag-and-Drop)
        B->>API: PATCH /api/candidates/17/stage<br/>{newStage: "INTERVIEW", newOrder: 2}
        API->>DB: UPDATE candidate SET stage='INTERVIEW', stage_order=2
        DB-->>API: Updated
        API-->>B: Updated candidate
        Note right of B: Optimistic UI: card moved<br/>before server confirms
    end

    rect rgb(248, 240, 255)
        Note over B,DB: Dashboard Aggregation
        B->>API: GET /api/dashboard
        API->>DB: COUNT(*) FROM job
        API->>DB: COUNT(*) FROM job WHERE status='OPEN'
        API->>DB: COUNT(*) FROM candidate GROUP BY stage
        API->>DB: COUNT(*) FROM job GROUP BY employer (excl. Talent Pool)
        DB-->>API: Aggregate results
        API-->>B: DashboardStats JSON
    end
```

### 3.4 Component Explanations

| Component | Purpose |
|-----------|---------|
| **PipelineComponent** | Drag-and-drop Kanban board using Angular CDK `DragDropModule`. Displays candidates across 7 columns (APPLIED through HIRED/REJECTED). Performs optimistic UI updates — the card moves immediately and rolls back if the API call fails. |
| **ResumeParserService** | Accepts PDF, DOCX, and TXT uploads. Uses Apache Tika for MIME type detection (rejects other file types). Extracts text via PDFBox (PDF) or Apache POI (DOCX). Applies regex patterns to extract name, email, and phone. Matches extracted text against a curated list of 60+ technical skills. Creates a candidate record in the talent pool with all parsed fields. |
| **Matching Algorithm** | Composite scoring system for ranking candidates against a job. Three weighted factors: skill overlap (50%), availability based on recency of last assignment (25%), and geographic proximity via Haversine formula (25%). Proximity caps at 50 miles — candidates beyond that distance score zero on that factor. Returns top 5 matches. |
| **PostgreSQL Sidecar** | Runs as a second container in the same Fargate task. Health-checked via `pg_isready`. Seeded on first boot with 6 jobs and 100 candidates for immediate demonstration. Indexed on `job_id`, `stage`, and `status` for query performance. |
| **Container Filesystem (Resume Storage)** | Uploaded resumes are stored on the container's local filesystem with UUID-based filenames to prevent path traversal. Files are served back via `GET /api/talent-pool/resumes/{filename}` with a strict filename regex. Ephemeral — files are lost if the task is replaced. |
| **TalentComponent** | Central talent pool UI with debounced search (300ms), multi-select skill filter tags, and pagination (12 per page). Supports resume upload via a modal dialog. Displays candidate cards with skills, contact info, and notes. |

### 3.5 Architecture Rationale

**Why this architecture:**

An ATS is inherently relational — jobs have candidates, candidates have stages, and matching requires joins across both tables. PostgreSQL handles this well and provides geographic functions that support the proximity calculation. The sidecar pattern keeps the database on the same network namespace as the backend, so `localhost:5432` has zero network overhead. The resume parser runs in-process (Tika, PDFBox, POI) rather than calling an external NLP service, keeping the system self-contained.

**Key tradeoffs:**

| Decision | Benefit | Cost |
|----------|---------|------|
| Sidecar PostgreSQL vs. RDS | No RDS cost, simpler deployment, localhost latency | No managed backups or failover. Data is ephemeral — tied to the task lifecycle. Acceptable for demo seeded data. |
| In-process resume parsing (Tika/PDFBox/POI) vs. external service | No external dependencies, no API costs, deterministic behavior | Limited extraction quality — regex-based name/email parsing is brittle for non-standard resume formats. No OCR for scanned PDFs. |
| Container filesystem for resume storage vs. S3 | Simple implementation, no S3 costs or IAM policies | Files lost on task replacement. Would need S3 for production durability. |
| Haversine distance for proximity vs. geocoding API | No external API calls, no rate limits, deterministic | Requires lat/lng to be pre-populated on both jobs and candidates. Straight-line distance, not driving distance. |
| No authentication (demo mode) vs. full auth | Faster to demonstrate, no login friction | Not production-safe. Any user can modify any data. Acceptable for a portfolio demonstration. |
| Optimistic UI for drag-and-drop vs. wait for server | Immediate visual feedback, snappier UX | Must handle rollback on failure; risk of brief inconsistent state if API errors |

---

## 4. Shared Cloud Infrastructure

### 4.1 High-Level Architecture

```mermaid
graph TB
    subgraph Internet
        Users["Users"]
    end

    subgraph GitHub["GitHub"]
        Repo["Repository<br/>clark22134/MyPortfolioWebsite"]
        GHA["GitHub Actions<br/>OIDC Federation"]
    end

    subgraph AWS["AWS — us-east-1"]
        subgraph Edge["Edge Layer"]
            Route53["Route 53<br/>clarkfoster.com<br/>*.clarkfoster.com"]
            WAF["AWS WAF<br/>Rate Limiting<br/>Managed Rules<br/>Geo-Block (non-US)"]
            ACM["ACM<br/>Multi-SAN Certificate"]
        end

        subgraph Network["VPC — 10.0.0.0/16"]
            subgraph PubSub1["Public Subnet 1<br/>10.0.1.0/24 — AZ-a"]
                ALB1["ALB Node"]
            end
            subgraph PubSub2["Public Subnet 2<br/>10.0.2.0/24 — AZ-b"]
                ALB2["ALB Node"]
            end
            IGW["Internet Gateway"]

            subgraph ECS["ECS Fargate Cluster — prod-portfolio-cluster"]
                PFE["portfolio-frontend"]
                PBE["portfolio-backend"]
                EFE["ecommerce-frontend"]
                EBE["ecommerce-backend<br/>+ MySQL sidecar"]
                AFE["ats-frontend"]
                ABE["ats-backend<br/>+ PostgreSQL sidecar"]
            end
        end

        subgraph Services["AWS Services"]
            ECR["ECR<br/>8 Repositories"]
            SM["Secrets Manager<br/>8 Secrets"]
            CW["CloudWatch<br/>8 Log Groups<br/>Container Insights"]
            IAM["IAM<br/>OIDC Provider<br/>Task Execution Role<br/>GH Actions Role"]
        end

        subgraph State["Terraform State — eu-west-2"]
            S3["S3 Bucket<br/>clarkfoster-portfolio-tf-state"]
            DDB["DynamoDB<br/>portfolio-terraform-locks"]
        end
    end

    Users -->|HTTPS| Route53
    Route53 --> ALB1 & ALB2
    WAF -.->|Attached| ALB1 & ALB2
    ACM -.->|TLS| ALB1 & ALB2
    IGW --- ALB1 & ALB2
    ALB1 & ALB2 -->|Host + Path Rules| ECS

    GHA -->|OIDC AssumeRole| IAM
    GHA -->|Push Images| ECR
    GHA -->|Update Services| ECS
    GHA -->|Read/Write State| S3
    GHA -->|Lock State| DDB

    ECR -.->|Pull Images| ECS
    SM -.->|Inject Secrets| PBE
    ECS -->|Logs| CW
```

### 4.2 Component Diagram — Networking & Security

```mermaid
graph TB
    subgraph WAF_Rules["WAF Web ACL"]
        R1["P1: rate-limit-general<br/>2000 req / 5 min / IP"]
        R2["P2: rate-limit-auth<br/>20 req / 5 min / IP<br/>Scope: /api/auth*"]
        R3["P3: AWSManagedRulesCommonRuleSet"]
        R4["P4: AWSManagedRulesKnownBadInputsRuleSet"]
        R5["P5: AWSManagedRulesSQLiRuleSet"]
        R6["P6: geo-block-non-us"]
    end

    subgraph ALB_Rules["ALB Listener Rules — HTTPS :443"]
        L50["P50: shop.clarkfoster.com /api/* → ecom-backend-tg:8080"]
        L51["P51: shop.clarkfoster.com /* → ecom-frontend-tg:80"]
        L60["P60: ats.clarkfoster.com /api/* → ats-backend-tg:8080"]
        L61["P61: ats.clarkfoster.com /* → ats-frontend-tg:80"]
        L100["P100: clarkfoster.com /api/* → portfolio-backend-tg:8080"]
        LDEF["Default: → portfolio-frontend-tg:80"]
    end

    subgraph SG["Security Groups"]
        ALB_SG["ALB SG<br/>Ingress: 80, 443 from 0.0.0.0/0<br/>Egress: All"]
        ECS_SG["ECS SG<br/>Ingress: 80, 8080 from ALB SG only<br/>Egress: All"]
    end

    WAF_Rules -->|Filter| ALB_Rules
    ALB_Rules -->|Allowed Traffic| SG
    ALB_SG -->|Source| ECS_SG
```

### 4.3 Data Flow Diagram — CI/CD Deployment Pipeline

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub
    participant GHA as GitHub Actions
    participant IAM as AWS IAM (OIDC)
    participant ECR as ECR
    participant ECS as ECS Fargate
    participant ALB as ALB
    participant CW as CloudWatch

    Dev->>GH: git push (main branch)
    GH->>GHA: Trigger workflow

    rect rgb(240, 248, 255)
        Note over GHA,IAM: Authentication (No Stored Credentials)
        GHA->>IAM: Request OIDC token
        IAM->>IAM: Validate: repo=clark22134/MyPortfolioWebsite<br/>branch=main | master | PR
        IAM-->>GHA: Temporary AWS credentials (AssumeRoleWithWebIdentity)
    end

    rect rgb(240, 255, 240)
        Note over GHA,ECR: Build & Push
        GHA->>GHA: docker build (multi-stage)<br/>Maven/Node → JRE/Nginx
        GHA->>ECR: docker push (tagged with git SHA)
        ECR->>ECR: Image scan on push
        ECR->>ECR: Lifecycle: retain last 10 images
    end

    rect rgb(255, 248, 240)
        Note over GHA,ECS: Deploy
        GHA->>ECS: Register new task definitions<br/>(updated image tags)
        GHA->>ECS: Update services (force new deployment)
        ECS->>ECR: Pull new images
        ECS->>ECS: Start new tasks
        ALB->>ECS: Health check: /actuator/health (backend)<br/>Health check: / (frontend)
        ECS->>ECS: Drain old tasks after health checks pass
        GHA->>ECS: Wait for stabilization (15 min timeout, 3 checks)
    end

    rect rgb(248, 240, 255)
        Note over GHA,CW: Verify
        GHA->>ALB: curl https://clarkfoster.com
        GHA->>ALB: curl https://shop.clarkfoster.com
        GHA->>ALB: curl https://ats.clarkfoster.com
        ECS->>CW: Container logs (awslogs driver)
    end
```

### 4.4 Data Flow Diagram — Request Path (End-to-End)

```mermaid
graph LR
    subgraph Client
        B["Browser"]
    end

    subgraph DNS
        R53["Route 53<br/>A Record → ALB"]
    end

    subgraph Edge
        WAF["WAF<br/>1. Rate limit check<br/>2. Auth rate limit<br/>3. OWASP rules<br/>4. Bad input scan<br/>5. SQLi scan<br/>6. Geo-block"]
    end

    subgraph LB["Load Balancer"]
        HTTPS["HTTPS :443<br/>TLS 1.3 termination"]
        Rules["Host + Path<br/>Routing Rules"]
    end

    subgraph Compute["ECS Fargate"]
        NGX["Nginx<br/>Security Headers<br/>SPA Routing<br/>Rate Limiting (10 req/s)"]
        SB["Spring Boot<br/>JWT Validation<br/>Business Logic"]
        DB["Database<br/>MySQL or PostgreSQL"]
    end

    subgraph Obs["Observability"]
        CW["CloudWatch Logs"]
        CI["Container Insights"]
        WM["WAF Metrics"]
    end

    B -->|"HTTPS"| R53
    R53 --> WAF
    WAF -->|"Pass"| HTTPS
    HTTPS --> Rules
    Rules -->|"/* path"| NGX
    Rules -->|"/api/* path"| SB
    SB -->|"localhost"| DB

    NGX -.-> CW
    SB -.-> CW
    DB -.-> CW
    WAF -.-> WM
    Compute -.-> CI
```

### 4.5 Component Explanations

| Component | Purpose |
|-----------|---------|
| **Route 53** | DNS resolution for all four hostnames (apex, www, shop, ats). Alias records point directly to the ALB, avoiding an extra CNAME hop. |
| **AWS WAF** | First line of defense. Six rules in priority order: general rate limiting, auth-specific rate limiting, three AWS managed rule sets (OWASP common, known bad inputs, SQLi), and a geo-block for non-US traffic. All rules emit CloudWatch metrics. |
| **ACM Certificate** | Single certificate with four SANs (clarkfoster.com, www, shop, ats). DNS-validated via Route 53 records. Uses create-before-destroy lifecycle to avoid downtime during renewal. |
| **ALB** | Layer 7 load balancer performing host-based and path-based routing. TLS 1.3 termination. HTTP listener redirects all traffic to HTTPS. Cross-zone load balancing across two availability zones. Six target groups (3 frontends on port 80, 3 backends on port 8080). |
| **ECS Fargate** | Serverless container runtime. Six services, each running one task (desired count: 1). No EC2 instances to manage. Backend tasks include sidecar database containers for e-commerce (MySQL) and ATS (PostgreSQL). Portfolio backend is stateless with no sidecar. |
| **ECR** | Container image registry with 8 repositories. Lifecycle policies keep only the 10 most recent images per repository to control storage costs. Images are scanned on push for known vulnerabilities. |
| **Secrets Manager** | Stores 8 secrets (JWT key, admin credentials, SMTP credentials). Injected into the portfolio backend task as environment variables at startup via the ECS task execution role. Other backends use environment variables defined in task definitions. |
| **CloudWatch** | Centralized logging for all 8 containers via the `awslogs` driver. 7-day retention balances troubleshooting access with storage cost. Container Insights provides cluster-level CPU, memory, and networking metrics. |
| **GitHub Actions (OIDC)** | CI/CD pipeline with keyless AWS authentication. The OIDC provider trusts the GitHub repository and branch. No long-lived AWS access keys are stored in GitHub. The IAM role grants permissions for ECR push, ECS service updates, Terraform state access, and infrastructure management. |
| **Terraform Remote State** | S3 bucket in eu-west-2 with versioning and AES256 encryption. DynamoDB table provides state locking to prevent concurrent Terraform runs. Bootstrap module creates these resources before the main configuration is applied. |

### 4.6 Architecture Rationale

**Why this architecture:**

A single ALB with host-based routing serves three applications from one load balancer, avoiding the cost of three separate ALBs (~$16/month each). ECS Fargate eliminates EC2 management overhead — no patching, no capacity planning, no idle costs. The sidecar database pattern avoids RDS charges while keeping each application's data co-located with its backend. Terraform codifies the entire stack, and GitHub Actions OIDC removes the need for stored AWS credentials.

**Key tradeoffs:**

| Decision | Benefit | Cost |
|----------|---------|------|
| Single ALB for 3 applications vs. one ALB per app | ~$32/month savings (2 fewer ALBs). Simpler DNS — all domains point to one endpoint. Single WAF attachment covers everything. | Shared blast radius — ALB misconfiguration or limit exhaustion affects all three apps. Listener rule management grows with each new app. |
| ECS Fargate vs. EC2-backed ECS | No server management, exact resource billing, automatic security patching of the underlying host. | Higher per-unit cost than reserved EC2 instances for sustained workloads. No SSH access for debugging — must rely on CloudWatch logs and exec. |
| Sidecar databases vs. RDS | Eliminates ~$30+/month in RDS costs. Simpler deployment — database is part of the task definition. | No managed backups, no failover, no point-in-time recovery. Database restarts with the task. Acceptable for demonstration projects with seeded data. |
| GitHub Actions OIDC vs. stored IAM access keys | No long-lived credentials to rotate or leak. Token scoped to specific repo and branch. | Slightly more complex IAM trust policy. Debugging OIDC failures is less intuitive than key-based auth. |
| Single VPC with public subnets only vs. public/private subnet layout | Simpler networking, fewer NAT Gateway costs ($32+/month). All containers get public IPs. | ECS tasks are directly reachable if security groups are misconfigured. A private subnet + NAT Gateway would add defense-in-depth. Mitigated by restricting ECS SG ingress to ALB SG only. |
| 7-day CloudWatch log retention vs. longer | Low storage cost. | Limited historical debugging. Acceptable for a portfolio site — production systems would use 30–90 days or archive to S3. |
| Geo-blocking non-US traffic via WAF | Reduces attack surface from regions without expected users. | Blocks legitimate international visitors (recruiters, peers). Can be toggled off if needed. |
| Terraform remote state in eu-west-2 vs. us-east-1 | Separates state from application infrastructure. Reduces risk of accidental deletion when working in us-east-1. | Cross-region latency on `terraform plan/apply` (minimal in practice). |
