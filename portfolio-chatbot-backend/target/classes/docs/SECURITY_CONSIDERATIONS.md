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

### 1.3 Demo Mode (ATS)

The Applicant Tracking System is deployed as a public demo — all endpoints are unauthenticated, with CORS restricted to known origins. This is an intentional trade-off for portfolio demonstration purposes.

### 1.4 Frontend Route Guards

Angular route guards (`authGuard`) protect client-side routes (`/admin/*` in Portfolio, `/cart`, `/orders`, `/profile` in E-Commerce). Guards check authentication state and redirect unauthenticated users to the login page.

### 1.5 CORS Configuration

All backends use explicit origin allowlists injected via environment variables. Credentials (`Access-Control-Allow-Credentials`) are enabled only for trusted origins. Wildcard origins are never used.

---

## 2. Data Protection

### 2.1 Password Hashing

All projects use Spring Security's `BCryptPasswordEncoder` (work factor 10). BCrypt incorporates per-hash salting, making precomputed rainbow-table attacks infeasible.

### 2.2 Secrets Management

| Environment | Mechanism |
|-------------|-----------|
| Production (AWS) | AWS Secrets Manager for database credentials (Aurora-managed rotation); JWT keys, admin credentials, and SMTP credentials are Terraform variables injected as Lambda environment variables |
| Local development | Environment variables via `docker-compose.yml` |

Only database credentials remain in AWS Secrets Manager (managed automatically by Aurora). JWT signing keys, admin credentials, and SMTP credentials are defined as Terraform variables and injected directly into Lambda function environment variables at deployment time.

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
| **A02 — Cryptographic Failures** | BCrypt password hashing; TLS in transit via CloudFront (ACM + HSTS); secrets stored in AWS Secrets Manager, never in source; credit card numbers truncated before storage |
| **A03 — Injection** | All database access via Spring Data JPA with parameterized `@Query` methods — no string concatenation in SQL; Angular's built-in DOM sanitizer escapes template bindings |
| **A04 — Insecure Design** | Refresh token rotation with session limits; short-lived access tokens (15 min); defense-in-depth with rate limiting at both application and proxy layers |
| **A05 — Security Misconfiguration** | Infrastructure defined as code (Terraform); explicit CORS allowlists; restrictive CSP; security headers enforced at the CloudFront layer (production) and Nginx (local development only); no default credentials |
| **A06 — Vulnerable Components** | CI pipeline runs `npm audit` (moderate+), Maven dependency-check (CVSS ≥ 7), and Trivy container image scanning (Critical/High); SonarCloud continuous analysis across all six source modules |
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
- **Least-privilege function roles** — Lambda functions assume IAM roles limited to Secrets Manager read, Aurora database access (via Secrets Manager), and CloudWatch log write.

### 5.3 Dependency & Artifact Security

- **Lambda JARs** — backends are packaged as uber JARs via maven-shade-plugin. No unnecessary build tools are included. Dockerfiles are used only for local development environments (no ECS, no sidecar containers in production).
- **Trivy scanning** — container images (local dev) and Maven dependencies are scanned for Critical and High CVEs in CI before deployment.

### 5.4 Secrets Rotation

Dedicated shell scripts (`rotate-all-secrets.sh`, `setup-jwt-secret.sh`) automate secret generation and rotation. Database credentials are managed by Aurora's built-in secret rotation via Secrets Manager. JWT signing keys and other application secrets are defined as Terraform variables and updated through Terraform apply.

---

## 6. Project-Specific Notes

| Concern | Portfolio | E-Commerce | ATS |
|---------|-----------|------------|-----|
| Authentication | JWT + refresh token rotation | JWT (1-hour, single token) | None (public demo) |
| CSRF protection | Cookie-based XSRF token | Disabled (stateless API) | N/A |
| Rate limiting | Application + CloudFront WAF | CloudFront WAF only | CloudFront WAF only |
| Input validation | Jakarta Bean Validation | Jakarta Bean Validation | Jakarta Bean Validation |
| Secrets management | AWS Secrets Manager | AWS Secrets Manager | Environment variables |
| Security scanning | Trivy + TruffleHog + SonarCloud | Trivy + TruffleHog + SonarCloud | Trivy + TruffleHog + SonarCloud |
