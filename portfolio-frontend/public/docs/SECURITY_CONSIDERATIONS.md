# Security Considerations

**Author:** Clark Foster
**Last Updated:** April 2026

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [Data Protection](#2-data-protection)
3. [API Security](#3-api-security)
4. [Common Vulnerabilities Mitigated (OWASP)](#4-common-vulnerabilities-mitigated-owasp)
5. [Infrastructure Security](#5-infrastructure-security)
6. [Project-Specific Notes](#6-project-specific-notes)

---

## 1. Authentication & Authorization

### 1.1 JWT with Refresh Token Rotation (Portfolio)

The Portfolio backend implements a dual-token authentication scheme:

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access token | 15 minutes | HTTP-only cookie | Short-lived API authorization |
| Refresh token | 7 days | HTTP-only cookie + DB record | Silent re-authentication |

Key properties:

- **Refresh token rotation** — each refresh request revokes the old token and issues a new one, limiting the window for token replay attacks.
- **Device session limits** — a maximum of 5 active refresh tokens per user. Exceeding the limit revokes all existing tokens, forcing re-authentication.
- **Per-token metadata** — user agent and IP address are recorded for audit trails.
- **Scheduled cleanup** — a daily cron job purges expired tokens from the database (2:00 AM UTC).
- **Logout-all** — a dedicated endpoint revokes every active refresh token for a user across all devices.

### 1.2 Standard JWT (E-Commerce)

The E-Commerce backend uses a single JWT with a 1-hour expiration, stored in an HTTP-only cookie (`ecommerce_jwt`). The simpler model is appropriate for a storefront where session state is less sensitive.

### 1.3 ATS (HireFlow) — Role-Based JWT Auth

The Applicant Tracking System now ships with **cookie-based JWT authentication mirroring the Portfolio's pattern**, plus role-based authorization:

| Cookie | TTL | Notes |
|--------|----:|-------|
| `ats_access_token` | 15 min | `HttpOnly`, `Secure` (in prod), `SameSite=Lax`. |
| `ats_refresh_token` | 7 days | Server-side `refresh_token` table tracks revocation; rotated on every refresh; max 5 active sessions per user. |

**Roles** (`Role` enum): `ADMIN`, `RECRUITER`, `HIRING_MANAGER`. Authorization is path-based in `SecurityConfig`. Reads on operational data are open to all three roles; mutations require `ADMIN` or `RECRUITER`; user management is `ADMIN` only via `@PreAuthorize("hasRole('ADMIN')")` on `UserController`. Hiring managers can post notes and complete tasks assigned to them.

**Demo accounts** (`admin`, `recruiter`, `manager`) are **disabled in production** (`ATS_DEMO_ACCOUNTS_ENABLED=false`). They are seeded by `DemoUserInitializer` only in local development when explicitly enabled, and only with strong passwords supplied at runtime. Passwords are BCrypt-hashed at runtime — no pre-baked hashes in SQL.

**Unauthenticated requests** hit `HttpStatusEntryPoint(401)` instead of redirecting, so the SPA can detect 401 and silently refresh once before bouncing the user to `/login`.

**CORS** remains restricted to known origins (`app.cors.allowed-origins`).

**CSRF** is disabled for the ATS — the SPA uses HTTP-only cookies and the auth interceptor sets `withCredentials: true` only for first-party `/api/*` requests; the CORS allowlist + `SameSite=Lax` cookies provide the equivalent guarantee without needing a CSRF token round-trip.

### 1.4 Frontend Route Guards

Angular route guards (`authGuard`) protect client-side routes (`/admin/*` in Portfolio, `/cart`, `/orders`, `/profile` in E-Commerce). Guards check authentication state and redirect unauthenticated users to the login page.

### 1.5 CORS Configuration

All backends use explicit origin allowlists injected via environment variables. Credentials (`Access-Control-Allow-Credentials`) are enabled only for trusted origins. Wildcard origins are never used.

### 1.6 Portfolio Assistant — Public Chatbot Endpoints

The Portfolio Assistant (`portfolio-chatbot-backend`) exposes three public endpoints with no authentication requirement:

| Endpoint | Auth | CSRF | Justification |
|---|---|---|---|
| `GET /api/chatbot/health` | None | Exempt | Read-only status check; no state change |
| `POST /api/chatbot/message` | None | Exempt | No session state; per-IP rate limited; read-only retrieval |
| `POST /api/chatbot/stream` | None | Exempt | SSE stream; no session state; per-IP rate limited; read-only retrieval |

**Why no authentication:** The chatbot answers publicly available information about the portfolio. Requiring login would add friction with no security benefit — there is no private data to protect.

**Why CSRF-exempt:** CSRF attacks require a victim with an active session who can be tricked into making a cross-site request. The chatbot endpoints have no session state. An attacker who tricks a user into sending a POST to `/api/chatbot/message` gains nothing — the response returns to the victim's browser, not the attacker. Per-IP rate limiting (`chatbot.rate-limit.per-minute`, default 20) prevents the only realistic abuse vector (using a victim's IP to exhaust rate limits).

**Input validation:** `@NotBlank @Size(max=1000)` on `message`; `conversationId` truncated at 64 characters. Validated at the controller boundary before any AI processing.

**API key isolation:** The OpenAI API key is fetched from AWS Secrets Manager at startup — the Lambda receives only the secret ARN via the `OPENAI_SECRET_ARN` environment variable, which `OpenAiKeyResolver` resolves to the key at boot. The plaintext key is never stored as a Lambda environment variable, never logged, never returned in responses, and never accessible from the frontend.

**Output escaping:** The Angular frontend renders chatbot responses using `marked` with its default HTML-escaping behaviour, preventing any `<script>` injection in generated text.

**Graceful degradation:** `@ConditionalOnExpression` skips all AI beans if the API key is absent or `chatbot.enabled=false`. The `/api/chatbot/health` endpoint returns `{ "available": false }`. No `NullPointerException` surfaces; the Lambda starts normally.

---

## 2. Data Protection

### 2.1 Password Hashing

All projects use Spring Security's `BCryptPasswordEncoder` (work factor 10). BCrypt incorporates per-hash salting, making precomputed rainbow-table attacks infeasible.

### 2.2 Secrets Management

| Environment | Mechanism |
|-------------|-----------|
| Production (AWS) | App backends authenticate to Aurora with short-lived **RDS IAM tokens** (signed locally via SigV4 — no plaintext `DB_PASSWORD` in any Lambda environment); the chatbot fetches its OpenAI key from AWS Secrets Manager at startup; JWT keys, admin credentials, and SMTP credentials are Terraform variables injected as Lambda environment variables |
| Local development | Environment variables via `docker-compose.yml` |

App backends do not read database credentials from Secrets Manager at runtime — they connect to Aurora using locally-signed RDS IAM authentication tokens, so no plaintext database password exists in any Lambda environment. AWS Secrets Manager still stores the Aurora master credential, but only as a break-glass / one-time provisioning credential. JWT signing keys, admin credentials, and SMTP credentials are defined as Terraform variables and injected directly into Lambda function environment variables at deployment time.

No secrets are committed to version control. The CI pipeline runs TruffleHog secret scanning on every push.

### 2.3 Transport Encryption

- **TLS termination** at CloudFront edge locations using an ACM-managed wildcard certificate (`*.clarkfoster.com`) with automatic renewal.
- **HSTS** enforced via CloudFront response headers policies with a 1-year `max-age`, `includeSubDomains`, and `preload` directives.

### 2.4 Sensitive Data Handling

- **Credit card numbers** (E-Commerce) are truncated to the last 4 digits before persistence — full PANs are never stored.
- **Tokens** are stored exclusively in HTTP-only, `Secure`, `SameSite` cookies — never in `localStorage` or JavaScript-accessible storage.

### 2.5 Cookie Attributes

| Attribute | Value | Rationale |
|-----------|-------|-----------|
| `HttpOnly` | `true` | Prevents JavaScript access (XSS mitigation) |
| `Secure` | `true` (production) | Transmitted only over HTTPS |
| `SameSite` | `Strict` / `Lax` | Mitigates CSRF via same-origin enforcement |
| `Path` | `/` | Scoped to application root |

---

## 3. API Security

### 3.1 Input Validation

All request DTOs use Jakarta Bean Validation annotations (`@NotBlank`, `@Email`, `@Size`, `@Pattern`) and are triggered by `@Valid` on controller method parameters. Validation occurs before any business logic executes.

Representative constraints:

- **Email**: `@Email` + `@Size(max = 255)`
- **Password**: `@Size(min = 8, max = 128)`
- **Card number**: `@Pattern(regexp = "^$|^[0-9]{13,19}$")`
- **Free-text fields**: `@Size(max = 2000)` to prevent oversized payloads

### 3.2 Rate Limiting

Rate limiting is enforced at two layers:

**Application layer (Portfolio backend):**

| Parameter | Value |
|-----------|-------|
| Max attempts | 5 per key |
| Window | 15 minutes (sliding) |
| Lockout | 30 minutes |

The rate-limit key combines the client IP and username, preventing both credential stuffing and distributed brute-force attacks against a single account.

**Reverse proxy layer (Nginx — local development only):**

| Zone | Rate | Burst |
|------|------|-------|
| `general` | 30 req/s per IP | 60 |
| `api` | 10 req/s per IP | 20 |

### 3.3 CSRF Protection

The Portfolio backend uses Spring Security's `CookieCsrfTokenRepository`. The `XSRF-TOKEN` cookie is readable by JavaScript (not `HttpOnly`), and the Angular frontend reads it to set the `X-XSRF-TOKEN` header on all state-changing requests (`POST`, `PUT`, `DELETE`, `PATCH`). Login and registration endpoints are excluded from CSRF enforcement to allow initial authentication.

### 3.4 Security Headers

CloudFront response headers policies (production) and Nginx (local development only) set the following response headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

---

## 4. Common Vulnerabilities Mitigated (OWASP)

| OWASP Top 10 (2021) | Mitigation |
|----------------------|------------|
| **A01 — Broken Access Control** | Role-based endpoint restrictions via Spring Security filter chains; Angular route guards enforce client-side access boundaries; `X-Frame-Options: DENY` prevents clickjacking; `frame-ancestors 'none'` in CSP |
| **A02 — Cryptographic Failures** | BCrypt password hashing; TLS in transit via CloudFront (ACM + HSTS); database access via short-lived RDS IAM tokens (no plaintext DB password in any Lambda environment); secrets never committed to source; credit card numbers truncated before storage |
| **A03 — Injection** | All database access via Spring Data JPA with parameterized `@Query` methods — no string concatenation in SQL; Angular's built-in DOM sanitizer escapes template bindings |
| **A04 — Insecure Design** | Refresh token rotation with session limits; short-lived access tokens (15 min); defense-in-depth with rate limiting at both application and proxy layers |
| **A05 — Security Misconfiguration** | Infrastructure defined as code (Terraform); explicit CORS allowlists; restrictive CSP; security headers enforced at the CloudFront layer (production) and Nginx (local development only); no default credentials |
| **A06 — Vulnerable Components** | CI pipeline runs `npm audit` (moderate+), Maven dependency-check (CVSS ≥ 7), and Trivy container image scanning (Critical/High); SonarCloud continuous analysis across all seven source modules |
| **A07 — Auth & Session Failures** | HTTP-only/Secure/SameSite cookies; CSRF tokens on state-changing requests; automatic token refresh with silent re-authentication; brute-force lockout after 5 failed attempts |
| **A08 — Software & Data Integrity** | GitHub Actions deployment via OIDC federation (no long-lived AWS credentials); CI/CD pipeline enforces build-test-scan-deploy sequence; maven-shade-plugin produces deployable Lambda JARs from verified Maven builds |
| **A09 — Logging & Monitoring** | CloudWatch log groups for all Lambda functions and API Gateways (7-day retention); refresh token audit metadata (IP, user agent) for session forensics |
| **A10 — SSRF** | No user-supplied URLs are fetched server-side; `connect-src 'self'` in CSP restricts frontend outbound requests to the origin |

---

## 5. Infrastructure Security

### 5.1 Network Architecture

- **VPC isolation** — all backend services (Lambda functions, Aurora clusters) run in a dedicated VPC (`10.0.0.0/16`) with private subnets only.
- **CloudFront + API Gateway ingress** — CloudFront is the sole public entry point for all traffic; Lambda functions are not directly internet-facing.
- **AWS WAF** — attached to the CloudFront distribution (us-east-1) with geo-restriction rules and managed rule sets applied globally at edge before traffic reaches origin.

### 5.2 IAM & Deployment

- **GitHub Actions OIDC** — CI/CD authenticates to AWS using short-lived OIDC tokens scoped to `refs/heads/main` and pull requests. No static access keys exist.
- **Least-privilege function roles** — app backend Lambda roles are limited to `rds-db:connect` on their own database user (RDS IAM auth) and CloudWatch log write; the chatbot Lambda role additionally holds Secrets Manager read on the OpenAI key secret only.

### 5.3 Dependency & Artifact Security

- **Lambda JARs** — backends are packaged as uber JARs via maven-shade-plugin. No unnecessary build tools are included. Dockerfiles are used only for local development environments (no ECS, no sidecar containers in production).
- **Trivy scanning** — container images (local dev) and Maven dependencies are scanned for Critical and High CVEs in CI before deployment.

### 5.4 Secrets Rotation

Dedicated shell scripts (`rotate-all-secrets.sh`, `setup-jwt-secret.sh`) automate secret generation and rotation. App backends authenticate to Aurora with short-lived RDS IAM tokens rather than a stored password, so there is no runtime database credential to rotate; the Aurora master credential in Secrets Manager is retained only as a break-glass / provisioning credential. JWT signing keys and other application secrets are defined as Terraform variables and updated through Terraform apply.

---

## 6. Project-Specific Notes

| Concern | Portfolio | Portfolio Assistant | E-Commerce | ATS |
|---------|-----------|---------------------|------------|-----|
| Authentication | JWT + refresh token rotation | None (public, read-only) | JWT (1-hour, single token) | JWT (HTTP-only cookie) + role-based (ADMIN/RECRUITER/HIRING_MANAGER) |
| CSRF protection | Cookie-based XSRF token | Disabled (no session state) | Disabled (stateless API) | Disabled (`SameSite=Lax` cookie) |
| Rate limiting | Application + CloudFront WAF | Per-IP sliding window (20 req/min) + CloudFront WAF | CloudFront WAF only | CloudFront WAF only |
| Input validation | Jakarta Bean Validation | `@NotBlank @Size(max=1000)` + 64-char conversationId cap | Jakarta Bean Validation | Jakarta Bean Validation |
| Secrets management | RDS IAM tokens (DB); Terraform-injected env vars | OpenAI key via AWS Secrets Manager (`OPENAI_SECRET_ARN`) | RDS IAM tokens (DB); Terraform-injected env vars | RDS IAM tokens (DB); Terraform-injected env vars |
| Security scanning | Trivy + TruffleHog + SonarCloud | Trivy + TruffleHog + SonarCloud | Trivy + TruffleHog + SonarCloud | Trivy + TruffleHog + SonarCloud |
