# API Documentation

> **Platform**: Multi-application portfolio deployed on **AWS Lambda** + **API Gateway** + **CloudFront** with **WAF**, **ACM TLS**, **Aurora Serverless v2**, and **Route53** DNS routing.

---

## Table of Contents

- [Infrastructure Overview](#infrastructure-overview)
- [Global Rate Limiting & Security](#global-rate-limiting--security)
- [1 — Portfolio API](#1--portfolio-api)
- [2 — E-Commerce API](#2--e-commerce-api)
- [3 — ATS (Applicant Tracking System) API](#3--ats-applicant-tracking-system-api)
- [Common Error Formats](#common-error-formats)

---

## Infrastructure Overview

| Component | Detail |
|---|---|
| **Compute** | AWS Lambda (Java 21, SnapStart) + Spring Boot 3.5.13 |
| **API Gateway** | REST API Gateway (regional) per application |
| **CDN / Entry Point** | CloudFront distribution per application (with WAF) |
| **TLS** | ACM certificate — `clarkfoster.com`, `www.`, `shop.`, `ats.` SANs |
| **DNS** | Route53 Alias records → CloudFront distributions |
| **WAF** | AWS WAF v2 (CloudFront-attached) — rate limiting, AWS managed rulesets, geo-restriction |
| **Secrets** | AWS Secrets Manager (database credentials, Aurora-managed); JWT/admin/SMTP credentials via Terraform variables → Lambda env vars |
| **Logging** | CloudWatch Logs (7-day retention) — Lambda function logs + API Gateway access logs |
| **Database** | Aurora Serverless v2 (PostgreSQL 15.17, 0.5–4 ACU) — 1 shared cluster, 3 databases (portfolio, ecommerce, ats) |

### Domain Routing

| Host | Path | Target | Integration |
|---|---|---|---|
| `clarkfoster.com` / `www.clarkfoster.com` | `/api/*` | Portfolio Backend | CloudFront → API Gateway → Lambda proxy |
| `clarkfoster.com` / `www.clarkfoster.com` | `/*` | Portfolio Frontend | CloudFront → S3 origin |
| `shop.clarkfoster.com` | `/api/*` | E-Commerce Backend | CloudFront → API Gateway → Lambda proxy |
| `shop.clarkfoster.com` | `/*` | E-Commerce Frontend | CloudFront → S3 origin |
| `ats.clarkfoster.com` | `/api/*` | ATS Backend | CloudFront → API Gateway → Lambda proxy |
| `ats.clarkfoster.com` | `/*` | ATS Frontend | CloudFront → S3 origin |

---

## Global Rate Limiting & Security

Rate limiting is applied across **three layers**:

### Layer 1 — AWS WAF

| Rule | Limit | Scope | Action |
|---|---|---|---|
| General Rate Limit | 2,000 req / 5 min per IP | All endpoints | Block |
| Auth Rate Limit | 20 req / 5 min per IP | `/api/auth*` | Block |
| AWS Common Rule Set | — | All traffic | Managed rules (SQLi, XSS, LFI, RFI, protocol violations) |
| Known Bad Inputs | — | All traffic | Log4Shell, known malicious patterns |
| SQL Injection Rules | — | Headers, body, URI | Block |
| Geo-Restriction | — | Non-US traffic | Block |

### Layer 2 — Nginx (per frontend container)

| Zone | Rate | Burst | Behavior |
|---|---|---|---|
| `general` | 30 req/s per IP | 60 | `nodelay` (drop excess immediately) |
| `api` | 10 req/s per IP | — | Reserved for `/api/*` proxy routes |

### Layer 3 — Application (Portfolio Backend only)

| Scope | Limit | Lockout | Key |
|---|---|---|---|
| `/api/auth/login`, `/api/auth/register` | 5 attempts / 15 min | 30-minute lockout | `{IP}:{username}` |

### Security Headers (all frontends)

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: [strict per-app policy]
```

---

## 1 — Portfolio API

**Base URL**: `https://clarkfoster.com/api`
**Framework**: Spring Boot 3.5.13 · Java 21
**Database**: PostgreSQL (prod) / H2 (dev)
**Auth**: JWT via HTTP-only cookies (`access_token`, `refresh_token`)

### 1.1 Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | No | Authenticate user |
| `POST` | `/api/auth/register` | No | Register new user |
| `POST` | `/api/auth/refresh` | No | Refresh access token via refresh cookie |
| `POST` | `/api/auth/logout` | Yes | Logout (clear current session) |
| `POST` | `/api/auth/logout-all` | Yes | Logout from all devices |
| `GET` | `/api/auth/me` | Yes | Get current user profile |

#### Auth Mechanism

| Property | Value |
|---|---|
| Access Token | HTTP-only cookie `access_token`, 15 min TTL |
| Refresh Token | HTTP-only cookie `refresh_token`, 7 day TTL |
| Algorithm | HMAC-SHA256 |
| Cookie Flags | `HttpOnly`, `Secure`, `SameSite=Strict` |
| Max Refresh Tokens/User | 5 |
| Token Rotation | Refresh token rotated on each `/refresh` call |
| CSRF | Cookie-based token, `X-XSRF-TOKEN` header |

#### `POST /api/auth/login`

**Request**

```json
{
  "username": "johndoe",
  "password": "P@ssw0rd!"
}
```

| Field | Type | Validation |
|---|---|---|
| `username` | `string` | Required, 3–50 chars |
| `password` | `string` | Required, 8–128 chars |

**Response** `200 OK` + `Set-Cookie: access_token=...; refresh_token=...`

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "fullName": "John Doe"
}
```

**Errors**

| Status | Condition | Body |
|---|---|---|
| `401` | Invalid credentials | `{ "error": "INVALID_CREDENTIALS", "message": "Invalid credentials", "remainingAttempts": 3 }` |
| `429` | Rate limit exceeded | `{ "error": "RATE_LIMITED", "message": "Too many attempts", "retryAfterSeconds": 1800 }` |

#### `POST /api/auth/register`

**Request**

```json
{
  "username": "janedoe",
  "password": "Str0ng!Pass",
  "email": "jane@example.com",
  "fullName": "Jane Doe"
}
```

| Field | Type | Validation |
|---|---|---|
| `username` | `string` | Required, 3–50 chars, alphanumeric + underscore |
| `password` | `string` | Required, 8–128 chars, must include uppercase + lowercase + digit + special char |
| `email` | `string` | Required, valid email, max 100 chars |
| `fullName` | `string` | Required, 2–100 chars |

**Response** `200 OK` + `Set-Cookie`

```json
{
  "username": "janedoe",
  "email": "jane@example.com",
  "fullName": "Jane Doe"
}
```

**Errors**

| Status | Condition | Body |
|---|---|---|
| `400` | Validation failure | `{ "success": false, "data": { "email": "must be a valid email" }, "timestamp": "..." }` |
| `409` | Duplicate username/email | `{ "success": false, "error": "User already exists with username: janedoe", "timestamp": "..." }` |

#### `POST /api/auth/refresh`

**Request**: None (uses `refresh_token` cookie)

**Response** `200 OK` + new `Set-Cookie`

```json
{
  "message": "Token refreshed successfully"
}
```

**Errors**

| Status | Condition | Body |
|---|---|---|
| `401` | Expired/invalid refresh token | `{ "error": "REFRESH_TOKEN_EXPIRED", "message": "Refresh token has expired" }` |

#### `GET /api/auth/me`

**Response** `200 OK`

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "fullName": "John Doe"
}
```

---

### 1.2 Projects

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects` | No | List all projects |
| `GET` | `/api/projects/featured` | No | List featured projects |
| `GET` | `/api/projects/{id}` | No | Get project by ID |
| `POST` | `/api/projects` | Yes | Create a project |
| `PUT` | `/api/projects/{id}` | Yes | Update a project |
| `DELETE` | `/api/projects/{id}` | Yes | Delete a project |

#### `GET /api/projects`

**Response** `200 OK`

```json
[
  {
    "id": 1,
    "title": "E-Commerce Platform",
    "description": "Full-stack e-commerce application...",
    "imageUrl": "https://example.com/image.jpg",
    "githubUrl": "https://github.com/user/project",
    "demoUrl": "https://shop.clarkfoster.com",
    "technologies": ["Angular", "Spring Boot", "PostgreSQL"],
    "startDate": "2025-01-15",
    "endDate": "2025-06-30",
    "featured": true
  }
]
```

#### `POST /api/projects`

**Request** (requires `@Valid`)

```json
{
  "title": "New Project",
  "description": "Project description...",
  "imageUrl": "https://example.com/img.jpg",
  "githubUrl": "https://github.com/user/repo",
  "demoUrl": "https://demo.example.com",
  "technologies": ["Java", "Angular"],
  "startDate": "2026-01-01",
  "endDate": null,
  "featured": false
}
```

| Field | Type | Validation |
|---|---|---|
| `title` | `string` | Required, max 200 chars |
| `description` | `string` | Max 2,000 chars |
| `imageUrl` | `string` | Max 500 chars |
| `githubUrl` | `string` | Max 500 chars |
| `demoUrl` | `string` | Max 500 chars |
| `technologies` | `string[]` | Optional |
| `startDate` | `date` | ISO-8601 |
| `endDate` | `date` | ISO-8601, nullable |
| `featured` | `boolean` | Optional |

**Response** `200 OK` — created project with `id`

**Errors**

| Status | Condition | Body |
|---|---|---|
| `400` | Validation failure | `{ "success": false, "data": { "title": "must not be blank" }, "timestamp": "..." }` |
| `401` | Not authenticated | `{ "error": "NOT_AUTHENTICATED", "message": "Authentication required" }` |

#### `DELETE /api/projects/{id}`

**Response** `204 No Content`

**Errors**

| Status | Condition | Body |
|---|---|---|
| `404` | Not found | `{ "success": false, "error": "Project not found with id: 99", "timestamp": "..." }` |

---

### 1.3 Contact

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/contact` | No | Send contact form email |

#### `POST /api/contact`

**Request**

```json
{
  "name": "Alice Smith",
  "email": "alice@example.com",
  "subject": "Collaboration Inquiry",
  "message": "I'd love to discuss a potential project..."
}
```

| Field | Type | Validation |
|---|---|---|
| `name` | `string` | Required, 2–100 chars |
| `email` | `string` | Required, valid email |
| `subject` | `string` | Required, 5–200 chars |
| `message` | `string` | Required, 10–2,000 chars |

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Contact message sent successfully",
  "timestamp": "2026-03-30T12:00:00Z"
}
```

**Errors**

| Status | Condition | Body |
|---|---|---|
| `400` | Validation failure | `{ "success": false, "data": { "message": "size must be between 10 and 2000" }, "timestamp": "..." }` |
| `503` | Email service unavailable | `{ "success": false, "error": "Unable to send message. Please try again later.", "timestamp": "..." }` |

---

### 1.4 Version

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/version` | No | Get build version info |

**Response** `200 OK`

```json
{
  "version": "1.0.0",
  "commit": "a1b2c3d",
  "timestamp": "2026-03-30T08:00:00Z"
}
```

---

### 1.5 Interactive Projects (Coming Soon — Stub Endpoints)

These endpoints return `"status": "coming-soon"` and do not perform real operations yet.

#### Chatbot

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects/chatbot/status` | No | Get chatbot project status |
| `POST` | `/api/projects/chatbot/chat` | No | Send a chat message (stub) |

#### Code Playground

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects/playground/status` | No | Get playground status |
| `POST` | `/api/projects/playground/execute` | No | Execute code snippet (stub) |
| `GET` | `/api/projects/playground/languages` | No | List supported languages |

**Response** `200 OK`

```json
{
  "languages": ["java", "python", "javascript"],
  "status": "coming-soon"
}
```

#### Task Manager

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects/tasks/status` | No | Get task manager status |
| `GET` | `/api/projects/tasks/boards` | No | List boards (stub) |

#### Analytics Dashboard

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects/analytics/status` | No | Get analytics status |
| `GET` | `/api/projects/analytics/dashboard` | No | Get dashboard data (stub) |

**Stub Response Format** (all of the above)

```json
{
  "project": "chatbot",
  "status": "coming-soon",
  "message": "This feature is under development"
}
```

---

### 1.6 Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/actuator/health` | No | Spring Boot health indicator (used by ALB target group) |

**Response** `200 OK`

```json
{
  "status": "UP"
}
```

---

### Portfolio Error Response Formats

**Standard API response** (`ApiResponse<T>`)

```json
{
  "success": false,
  "message": null,
  "data": null,
  "error": "Descriptive error message",
  "timestamp": "2026-03-30T12:00:00Z"
}
```

**Auth error response** (`AuthErrorResponse`)

```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid credentials",
  "remainingAttempts": 4,
  "retryAfterSeconds": null
}
```

| Status | Exception | Response Format |
|---|---|---|
| `400` | Validation errors | `ApiResponse` with field-level error map in `data` |
| `400` | `IllegalArgumentException` | `ApiResponse` with `error` string |
| `401` | `AuthenticationException` | `AuthErrorResponse` |
| `401` | `BadCredentialsException` | `AuthErrorResponse` — `"Invalid credentials"` |
| `404` | `ResourceNotFoundException` | `ApiResponse` with `error` string |
| `409` | `DuplicateResourceException` | `ApiResponse` with `error` string |
| `429` | `RateLimitExceededException` | `AuthErrorResponse` with `retryAfterSeconds` |
| `503` | `EmailSendException` | `ApiResponse` — generic message (no internal detail) |
| `500` | Unhandled `Exception` | `ApiResponse` — `"An unexpected error occurred"` |

---

## 2 — E-Commerce API

**Base URL**: `https://shop.clarkfoster.com/api`
**Framework**: Spring Boot 3.5.13 · Java 21
**Database**: PostgreSQL 15.17 (Aurora Serverless v2)
**Auth**: JWT via HTTP-only cookie (`ecommerce_jwt`)

### 2.1 Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | No | Customer login |
| `POST` | `/api/auth/register` | No | Customer registration |
| `GET` | `/api/auth/profile` | Yes | Get customer profile |
| `POST` | `/api/auth/logout` | Yes | Logout (clear JWT cookie) |

#### Auth Mechanism

| Property | Value |
|---|---|
| Token | HTTP-only cookie `ecommerce_jwt`, 1 hour TTL |
| Algorithm | HMAC-SHA256 |
| Subject | Customer email |
| Cookie Flags (prod) | `HttpOnly`, `Secure`, `SameSite=Strict` |
| Cookie Flags (dev) | `HttpOnly`, `SameSite=Lax` |
| CSRF | Disabled |

#### `POST /api/auth/login`

**Request**

```json
{
  "email": "customer@example.com",
  "password": "SecurePass1"
}
```

| Field | Type | Validation |
|---|---|---|
| `email` | `string` | Required, valid email, max 255 chars |
| `password` | `string` | Required, 8–128 chars |

**Response** `200 OK` + `Set-Cookie: ecommerce_jwt=...`

```json
{
  "email": "customer@example.com"
}
```

**Errors**

| Status | Condition | Body |
|---|---|---|
| `401` | Invalid credentials | `{ "error": "Invalid credentials" }` |

#### `POST /api/auth/register`

**Request**

```json
{
  "email": "new@example.com",
  "password": "Str0ngP@ss",
  "firstName": "John",
  "lastName": "Doe",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Chicago",
    "state": "Illinois",
    "zipCode": "60601",
    "country": "United States"
  },
  "billingAddress": {
    "street": "456 Oak Ave",
    "city": "Chicago",
    "state": "Illinois",
    "zipCode": "60602",
    "country": "United States"
  },
  "cardType": "Visa",
  "nameOnCard": "John Doe",
  "cardNumber": "4111111111111111",
  "cardExpirationMonth": 12,
  "cardExpirationYear": 2027
}
```

| Field | Type | Validation |
|---|---|---|
| `email` | `string` | Required, valid email, max 255 |
| `password` | `string` | Required, 8–128 chars |
| `firstName` | `string` | Required, max 100 |
| `lastName` | `string` | Required, max 100 |
| `shippingAddress` | `object` | Required, `@Valid` |
| `shippingAddress.street` | `string` | Required, max 255 |
| `shippingAddress.city` | `string` | Required, max 100 |
| `shippingAddress.state` | `string` | Required, max 100 |
| `shippingAddress.zipCode` | `string` | Required, max 20 |
| `shippingAddress.country` | `string` | Required, max 100 |
| `billingAddress` | `object` | Optional, `@Valid` |
| `cardType` | `string` | Optional, max 50 |
| `nameOnCard` | `string` | Optional, max 100 |
| `cardNumber` | `string` | Optional, 13–19 digits |
| `cardExpirationMonth` | `int` | Optional |
| `cardExpirationYear` | `int` | Optional |

**Response** `201 Created` + `Set-Cookie: ecommerce_jwt=...`

```json
{
  "email": "new@example.com"
}
```

**Errors**

| Status | Condition | Body |
|---|---|---|
| `400` | Duplicate email | `{ "message": "Email is already in use" }` |
| `400` | Validation failure | `{ "email": "Please provide a valid email address", "password": "..." }` |

#### `GET /api/auth/profile`

**Response** `200 OK`

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "customer@example.com",
  "defaultShippingAddress": {
    "street": "123 Main St",
    "city": "Chicago",
    "state": "Illinois",
    "zipCode": "60601",
    "country": "United States"
  },
  "defaultBillingAddress": {
    "street": "456 Oak Ave",
    "city": "Chicago",
    "state": "Illinois",
    "zipCode": "60602",
    "country": "United States"
  },
  "cardType": "Visa",
  "nameOnCard": "John Doe",
  "cardNumberLast4": "1111",
  "cardExpirationMonth": 12,
  "cardExpirationYear": 2027
}
```

#### `POST /api/auth/logout`

**Response** `200 OK` (empty body, clears `ecommerce_jwt` cookie)

---

### 2.2 Product Catalog (Spring Data REST — Read-Only)

All catalog endpoints are **auto-generated** by Spring Data REST. Write operations (POST, PUT, DELETE, PATCH) are **disabled**.

#### Product Categories

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/product-category` | No | List all categories (paginated) |
| `GET` | `/api/product-category/{id}` | No | Get category by ID |
| `GET` | `/api/product-category/{id}/products` | No | List products in category |

**Response** `GET /api/product-category` — `200 OK`

```json
{
  "_embedded": {
    "productCategory": [
      {
        "id": 1,
        "categoryName": "Books",
        "_links": {
          "self": { "href": "https://shop.clarkfoster.com/api/product-category/1" },
          "products": { "href": "https://shop.clarkfoster.com/api/product-category/1/products" }
        }
      }
    ]
  },
  "page": {
    "size": 20,
    "totalElements": 5,
    "totalPages": 1,
    "number": 0
  }
}
```

#### Countries & States

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/countries` | No | List all countries (paginated) |
| `GET` | `/api/countries/{id}` | No | Get country by ID |
| `GET` | `/api/countries/{id}/states` | No | Get states for a country |
| `GET` | `/api/states` | No | List all states |
| `GET` | `/api/states/search/findByCountryCode?code={code}` | No | Find states by 2-letter country code |

**Response** `GET /api/states/search/findByCountryCode?code=US` — `200 OK`

```json
{
  "_embedded": {
    "states": [
      { "id": 1, "name": "Alabama" },
      { "id": 2, "name": "Alaska" }
    ]
  }
}
```

---

### 2.3 Shopping Cart

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cart` | Yes | Get cart items for current user |
| `PUT` | `/api/cart` | Yes | Replace entire cart contents |

#### `GET /api/cart`

**Response** `200 OK`

```json
[
  {
    "productId": 1,
    "name": "Spring Boot in Action",
    "unitPrice": 29.99,
    "quantity": 2,
    "imageUrl": "https://example.com/book.jpg"
  },
  {
    "productId": 5,
    "name": "Angular Development",
    "unitPrice": 34.99,
    "quantity": 1,
    "imageUrl": "https://example.com/angular.jpg"
  }
]
```

#### `PUT /api/cart`

**Request** — replaces the entire cart

```json
[
  {
    "productId": 1,
    "name": "Spring Boot in Action",
    "unitPrice": 29.99,
    "quantity": 3,
    "imageUrl": "https://example.com/book.jpg"
  }
]
```

**Response** `200 OK` — updated cart items (same format as GET)

---

### 2.4 Checkout

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/checkout/purchase` | Yes | Place an order |

#### `POST /api/checkout/purchase`

**Request**

```json
{
  "customer": {
    "email": "customer@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Chicago",
    "state": "Illinois",
    "zipCode": "60601",
    "country": "United States"
  },
  "billingAddress": {
    "street": "456 Oak Ave",
    "city": "Chicago",
    "state": "Illinois",
    "zipCode": "60602",
    "country": "United States"
  },
  "order": {
    "totalPrice": 94.97,
    "totalQuantity": 3
  },
  "orderItems": [
    {
      "imageUrl": "https://example.com/book.jpg",
      "unitPrice": 29.99,
      "quantity": 2,
      "productId": 1
    },
    {
      "imageUrl": "https://example.com/angular.jpg",
      "unitPrice": 34.99,
      "quantity": 1,
      "productId": 5
    }
  ]
}
```

**Response** `201 Created`

```json
{
  "orderTrackingNumber": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Notes**: Authenticated user's email takes priority over the email in the request body. Card numbers are masked to last 4 digits before persistence. Order status is set to `PROCESSING`. Transactional (all-or-nothing).

---

### 2.5 Orders

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/orders` | Yes | Get order history (most recent first) |

#### `GET /api/orders`

**Response** `200 OK`

```json
[
  {
    "id": 1,
    "orderTrackingNumber": "550e8400-e29b-41d4-a716-446655440000",
    "totalPrice": 94.97,
    "status": "PROCESSING",
    "totalQuantity": 3,
    "dateCreated": "2026-03-30T10:30:00",
    "lastUpdated": "2026-03-30T10:30:00",
    "orderItems": [
      {
        "id": 1,
        "imageUrl": "https://example.com/book.jpg",
        "unitPrice": 29.99,
        "quantity": 2,
        "productId": 1,
        "productName": "Spring Boot in Action"
      }
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Chicago",
      "state": "Illinois",
      "zipCode": "60601",
      "country": "United States"
    },
    "billingAddress": {
      "street": "456 Oak Ave",
      "city": "Chicago",
      "state": "Illinois",
      "zipCode": "60602",
      "country": "United States"
    }
  }
]
```

---

### 2.6 Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/actuator/health` | No | Spring Boot health indicator |

---

### E-Commerce Error Response Formats

**Validation errors** — `400 Bad Request`

```json
{
  "email": "Please provide a valid email address",
  "password": "Password must be between 8 and 128 characters"
}
```

**Authentication errors** — `401 Unauthorized`

```json
{
  "error": "Invalid credentials"
}
```

**Runtime errors** — `500 Internal Server Error`

```json
{
  "error": "An unexpected error occurred"
}
```

| Status | Condition | Response |
|---|---|---|
| `400` | Validation failure | Field-level error map |
| `400` | Duplicate email on register | `{ "message": "Email is already in use" }` |
| `401` | Auth failure | `{ "error": "Invalid credentials" }` |
| `500` | Unhandled exception | `{ "error": "An unexpected error occurred" }` |

---

## 3 — ATS (Applicant Tracking System) API

**Base URL**: `https://ats.clarkfoster.com/api`
**Framework**: Spring Boot 3.5.13 · Java 21
**Database**: PostgreSQL 15.17 (Aurora Serverless v2)
**Auth**: **None** (demo application — all endpoints are public)

> **Note**: This is a demonstration application. All endpoints are publicly accessible with no authentication.

### 3.1 Jobs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/jobs` | No | List jobs (optional filters) |
| `GET` | `/api/jobs/{id}` | No | Get job by ID |
| `GET` | `/api/jobs/{id}/top-candidates` | No | Get AI-ranked top candidate matches |
| `POST` | `/api/jobs` | No | Create a job |
| `PUT` | `/api/jobs/{id}` | No | Update a job |
| `DELETE` | `/api/jobs/{id}` | No | Delete a job (cascades to candidates) |

#### `GET /api/jobs`

**Query Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `status` | `string` | No | Filter by status: `DRAFT`, `OPEN`, `CLOSED`, `ON_HOLD` |
| `employer` | `string` | No | Filter by employer name |

**Response** `200 OK`

```json
[
  {
    "id": 1,
    "employer": "Acme Technologies",
    "title": "Senior Software Engineer",
    "department": "Engineering",
    "location": "San Francisco, CA",
    "description": "We are looking for an experienced...",
    "requiredSkills": "Java, Spring Boot, AWS, Docker",
    "address": "100 Market St, San Francisco, CA 94105",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "status": "OPEN",
    "employmentType": "FULL_TIME",
    "candidateCount": 22,
    "createdAt": "2026-03-01T09:00:00",
    "updatedAt": "2026-03-28T14:30:00"
  }
]
```

#### `POST /api/jobs`

**Request**

```json
{
  "employer": "Acme Technologies",
  "title": "Backend Developer",
  "department": "Engineering",
  "location": "Austin, TX",
  "description": "Looking for a Java developer...",
  "requiredSkills": "Java, Spring Boot, PostgreSQL",
  "address": "200 Congress Ave, Austin, TX",
  "latitude": 30.2672,
  "longitude": -97.7431,
  "status": "OPEN",
  "employmentType": "FULL_TIME"
}
```

| Field | Type | Validation |
|---|---|---|
| `employer` | `string` | Required, max 200 |
| `title` | `string` | Required, max 200 |
| `department` | `string` | Required, max 200 |
| `location` | `string` | Required, max 200 |
| `description` | `string` | Optional, max 5,000 |
| `requiredSkills` | `string` | Optional, max 2,000 (comma-separated) |
| `address` | `string` | Optional, max 500 |
| `latitude` | `double` | Optional |
| `longitude` | `double` | Optional |
| `status` | `string` | Required — `DRAFT`, `OPEN`, `CLOSED`, `ON_HOLD` |
| `employmentType` | `string` | Required — `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERNSHIP` |

**Response** `200 OK` — created job with `id`

#### `GET /api/jobs/{id}/top-candidates`

**Response** `200 OK`

```json
[
  {
    "candidateId": 42,
    "firstName": "Alice",
    "lastName": "Johnson",
    "email": "alice@example.com",
    "skillsMatchPercent": 85,
    "daysWorkedScore": 7,
    "distanceMiles": 12.4,
    "matchedSkills": ["Java", "Spring Boot"],
    "candidateSkills": ["Java", "Spring Boot", "React", "Docker"]
  }
]
```

---

### 3.2 Candidates

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/candidates` | No | List candidates for a job (required `jobId`) |
| `GET` | `/api/candidates/search` | No | Search candidates (flexible filters) |
| `GET` | `/api/candidates/{id}` | No | Get candidate by ID |
| `POST` | `/api/candidates` | No | Create a candidate |
| `PUT` | `/api/candidates/{id}` | No | Update a candidate |
| `PATCH` | `/api/candidates/{id}/stage` | No | Move candidate to a new pipeline stage |
| `DELETE` | `/api/candidates/{id}` | No | Delete a candidate |

#### `GET /api/candidates`

**Query Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `jobId` | `long` | **Yes** | Job ID to filter candidates |
| `stage` | `string` | No | Pipeline stage filter |

**Response** `200 OK`

```json
[
  {
    "id": 1,
    "firstName": "Bob",
    "lastName": "Smith",
    "email": "bob@example.com",
    "phone": "+1-555-0100",
    "resumeUrl": "/api/talent-pool/resumes/a1b2c3d4-uuid.pdf",
    "notes": "Strong backend experience",
    "skills": "Java, Python, AWS",
    "address": "123 Elm St, Chicago, IL",
    "latitude": 41.8781,
    "longitude": -87.6298,
    "lastAssignmentDays": 30,
    "stage": "INTERVIEW",
    "stageOrder": 2,
    "jobId": 1,
    "jobTitle": "Senior Software Engineer",
    "talentPool": false,
    "appliedAt": "2026-03-15T10:00:00",
    "updatedAt": "2026-03-28T16:00:00"
  }
]
```

#### `GET /api/candidates/search`

**Query Parameters** (all optional)

| Param | Type | Description |
|---|---|---|
| `name` | `string` | Search by first/last name |
| `skills` | `string` | Comma-separated skills to match |
| `stage` | `string` | Pipeline stage: `APPLIED`, `SCREENING`, `INTERVIEW`, `ASSESSMENT`, `OFFER`, `HIRED`, `REJECTED` |
| `jobId` | `long` | Filter by job |

#### `POST /api/candidates`

**Request**

```json
{
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice@example.com",
  "phone": "+1-555-0200",
  "resumeUrl": null,
  "notes": "Referred by current employee",
  "skills": "Java, Spring Boot, Docker, Kubernetes",
  "address": "456 Oak Ave, Austin, TX",
  "latitude": 30.2672,
  "longitude": -97.7431,
  "lastAssignmentDays": null,
  "stage": "APPLIED",
  "jobId": 1
}
```

| Field | Type | Validation |
|---|---|---|
| `firstName` | `string` | Required, max 100 |
| `lastName` | `string` | Required, max 100 |
| `email` | `string` | Required, valid email, max 255 |
| `phone` | `string` | Optional, max 30 |
| `resumeUrl` | `string` | Optional, max 500 |
| `notes` | `string` | Optional, max 5,000 |
| `skills` | `string` | Optional, max 2,000 (comma-separated) |
| `address` | `string` | Optional, max 500 |
| `latitude` | `double` | Optional |
| `longitude` | `double` | Optional |
| `lastAssignmentDays` | `int` | Optional |
| `stage` | `string` | Required — `APPLIED`, `SCREENING`, `INTERVIEW`, `ASSESSMENT`, `OFFER`, `HIRED`, `REJECTED` |
| `jobId` | `long` | Required |

**Response** `200 OK` — created candidate

#### `PATCH /api/candidates/{id}/stage`

**Request**

```json
{
  "newStage": "INTERVIEW",
  "newOrder": 3
}
```

| Field | Type | Validation |
|---|---|---|
| `newStage` | `string` | Required — valid `PipelineStage` enum |
| `newOrder` | `int` | Optional — position within stage |

**Response** `200 OK` — updated candidate

---

### 3.3 Talent Pool (Resume Upload)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/talent-pool/upload` | No | Upload and parse a resume file |
| `GET` | `/api/talent-pool/resumes/{filename}` | No | Download a stored resume |

#### `POST /api/talent-pool/upload`

**Request** — `multipart/form-data`

| Part | Type | Constraints |
|---|---|---|
| `file` | Binary file | Max 10 MB. Allowed: `.pdf`, `.doc`, `.docx`, `.txt`, `.rtf` |

**Response** `200 OK` — auto-parsed candidate

```json
{
  "id": 101,
  "firstName": "Parsed",
  "lastName": "Name",
  "email": "parsed@resume.com",
  "phone": "+1-555-0300",
  "resumeUrl": "/api/talent-pool/resumes/f47ac10b-58cc-4372-a567-0e02b2c3d479.pdf",
  "skills": "Java, Python, Machine Learning",
  "stage": "APPLIED",
  "jobId": null,
  "talentPool": true,
  "appliedAt": "2026-03-30T12:00:00",
  "updatedAt": "2026-03-30T12:00:00"
}
```

**Errors**

| Status | Condition | Body |
|---|---|---|
| `400` | Unsupported file type | `{ "error": "File type .exe is not supported. Allowed: .pdf, .doc, .docx, .txt, .rtf" }` |
| `400` | File too large | `{ "error": "File is too large. Maximum upload size is 10 MB." }` |
| `500` | Processing failure | `{ "error": "Failed to process the uploaded file. Please try again." }` |

**Notes**: Resume parsing uses Apache Tika, PDFBox, and Apache POI. Filenames are UUID-based to prevent path traversal. The ATS frontend nginx config allows `client_max_body_size 12m` to accommodate the multipart overhead.

#### `GET /api/talent-pool/resumes/{filename}`

**Response** `200 OK` — file download (Content-Disposition: attachment)

| Status | Condition | Body |
|---|---|---|
| `400` | Invalid filename format | `{ "error": "Invalid filename" }` |
| `404` | File not found | `{ "error": "Resume not found: ..." }` |

---

### 3.4 Dashboard

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/dashboard` | No | Get aggregate pipeline statistics |

#### `GET /api/dashboard`

**Response** `200 OK`

```json
{
  "totalJobs": 6,
  "openJobs": 4,
  "totalCandidates": 100,
  "candidatesByStage": {
    "APPLIED": 25,
    "SCREENING": 20,
    "INTERVIEW": 18,
    "ASSESSMENT": 15,
    "OFFER": 10,
    "HIRED": 8,
    "REJECTED": 4
  },
  "jobsByEmployer": {
    "Acme Technologies": 3,
    "Pixel Creative": 1,
    "GrowthMedia": 1,
    "DataBridge Inc": 1
  }
}
```

---

### 3.5 Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/actuator/health` | No | Spring Boot health indicator |

---

### ATS Enumerations Reference

**PipelineStage**

| Value | Description |
|---|---|
| `APPLIED` | Initial application received |
| `SCREENING` | Resume/phone screening |
| `INTERVIEW` | Interview stage |
| `ASSESSMENT` | Technical/skill assessment |
| `OFFER` | Offer extended |
| `HIRED` | Candidate hired |
| `REJECTED` | Candidate rejected |

**JobStatus**

| Value | Description |
|---|---|
| `DRAFT` | Job not yet published |
| `OPEN` | Actively recruiting |
| `CLOSED` | Position filled or closed |
| `ON_HOLD` | Temporarily paused |

**EmploymentType**

| Value | Description |
|---|---|
| `FULL_TIME` | Full-time position |
| `PART_TIME` | Part-time position |
| `CONTRACT` | Contract/temporary |
| `INTERNSHIP` | Internship program |

---

### ATS Error Response Format

All errors return `Map<String, String>`:

```json
{
  "error": "Descriptive error message"
}
```

Validation errors return field-level map:

```json
{
  "firstName": "must not be blank",
  "email": "must be a well-formed email address",
  "stage": "must not be null"
}
```

| Status | Exception | Response |
|---|---|---|
| `400` | Validation failure | Field-level error map |
| `400` | `IllegalArgumentException` | `{ "error": "..." }` |
| `400` | `UnsupportedFileTypeException` | `{ "error": "..." }` |
| `400` | `MaxUploadSizeExceededException` | `{ "error": "File is too large. Maximum upload size is 10 MB." }` |
| `404` | `ResourceNotFoundException` | `{ "error": "..." }` |
| `500` | `IOException` | `{ "error": "Failed to process the uploaded file. Please try again." }` |

---

## Common Error Formats

### HTTP Status Codes Used Across All APIs

| Code | Meaning | When |
|---|---|---|
| `200` | OK | Successful read/update |
| `201` | Created | Successful resource creation |
| `204` | No Content | Successful deletion |
| `400` | Bad Request | Validation failure, invalid input |
| `401` | Unauthorized | Missing/invalid/expired auth token |
| `404` | Not Found | Resource does not exist |
| `409` | Conflict | Duplicate resource (Portfolio only) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unhandled server error |
| `503` | Service Unavailable | Downstream service failure (email) |

### CORS Summary

| App | Allowed Origins |
|---|---|
| Portfolio | `clarkfoster.com`, `www.clarkfoster.com`, `localhost`, `localhost:4200`, `localhost:3000` |
| E-Commerce | `shop.clarkfoster.com`, `localhost:4200`, `localhost` |
| ATS | `ats.clarkfoster.com`, `clarkfoster.com`, `localhost:4200`, `localhost:8084` |
