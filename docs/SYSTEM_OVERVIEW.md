# System Overview

---

## 1. Portfolio Website

**Domain:** clarkfoster.com

### What It Does

A personal portfolio website that presents professional work, technical skills, and interactive AI/ML projects. It serves as both a public-facing resume and a private workspace for demonstrating applied machine learning capabilities.

### Key Features

- **Project showcase** with featured highlights on the homepage and a dedicated browse page
- **Contact form** backed by SMTP email delivery
- **JWT authentication** with refresh token rotation, HTTP-only cookies, and per-user session limits (max 5 devices)
- **Admin-only interactive projects:** RAG-powered chatbot, multimodal search engine (CLIP-based), ML pipeline with MLflow, and LLM fine-tuning — each with drag-and-drop file upload
- **Accessibility toolkit:** screen reader support, font size adjustment, contrast options, WCAG compliance validated with axe-core and Puppeteer
- **Animated terminal loader** on first visit (Kali-style typing effect)

### Target Users

- Recruiters, hiring managers, and peers evaluating technical capability
- The site owner, as an admin managing project entries and running AI/ML demonstrations

### Business Value

Acts as a living technical portfolio. The interactive AI/ML section goes beyond a static resume — it demonstrates hands-on ability with retrieval-augmented generation, multimodal embeddings, and end-to-end ML pipelines. The authentication and admin layer shows full-stack security implementation.

### Architecture

| Layer | Stack |
|-------|-------|
| Frontend | Angular 21, TypeScript 5.9, SCSS, standalone components |
| Backend | Spring Boot 4.0.4, Java 25, Spring Security, Spring Mail |
| Database | PostgreSQL (production), H2 (development) |
| Auth | JWT access tokens (15 min) + refresh tokens (7 days), BCrypt, CSRF via XSRF-TOKEN |
| Infrastructure | Docker, Nginx, AWS ECS Fargate, ALB, Route53, ACM |

```
Browser → ALB (clarkfoster.com)
             ├─ /api/* → Spring Boot (port 8080)
             └─ /*     → Nginx → Angular SPA (port 80)
```

---

## 2. E-Commerce Platform

**Domain:** shop.clarkfoster.com

### What It Does

A full-stack online storefront where customers can browse a product catalog, manage a shopping cart, create accounts, place orders, and review their order history. Supports both guest and authenticated checkout flows.

### Key Features

- **Product catalog** with category filtering, keyword search, and pagination (100+ seeded products across multiple categories)
- **Persistent shopping cart** — stored in localStorage for guests, synced to the database on login, with automatic merge of guest cart items into the user's account
- **Checkout flow** with shipping/billing address forms, country/state cascade dropdowns, and credit card entry (last 4 digits stored only — no payment processor integrated)
- **Order lifecycle tracking** with statuses: PROCESSING → SHIPPED → DELIVERED → CANCELLED
- **Order history** with client-side search (by tracking number, status, date) and sorting
- **User profiles** with saved addresses and masked card information for repeat purchases
- **Guest checkout** — no account required to place an order

### Target Users

- End users browsing and purchasing products
- Returning customers managing orders and saved payment details

### Business Value

Demonstrates a production-grade e-commerce implementation covering the full purchase lifecycle: catalog browsing, cart management, authenticated checkout, and order tracking. The cart merge logic (guest → authenticated) and profile auto-fill show attention to real user experience concerns. PCI-aware card handling (last 4 digits only) reflects security discipline without a live payment gateway.

### Architecture

| Layer | Stack |
|-------|-------|
| Frontend | Angular 21, TypeScript 5.9, Bootstrap 5.3, FontAwesome 7, ng-bootstrap |
| Backend | Spring Boot 4.0.4, Java 25, Spring Data REST, Spring Security |
| Database | MySQL (sidecar container in ECS task) |
| Auth | JWT (1-hour expiration), HTTP-only cookies, BCrypt |
| Infrastructure | Docker, Nginx, AWS ECS Fargate, ALB, Route53, ACM |

```
Browser → ALB (shop.clarkfoster.com)
             ├─ /api/* → Spring Boot (port 8080) ↔ MySQL (localhost:3306, sidecar)
             └─ /*     → Nginx → Angular SPA (port 80)
```

Spring Data REST auto-exposes read-only endpoints for products, categories, countries, and states. Write operations (cart, checkout, orders) go through explicit controllers.

---

## 3. HireFlow — Applicant Tracking System

**Domain:** ats.clarkfoster.com

### What It Does

A recruitment management system for posting jobs, tracking candidates through a hiring pipeline, parsing resumes, and surfacing top candidate matches using a weighted scoring algorithm.

### Key Features

- **Job management** with lifecycle statuses (DRAFT → OPEN → CLOSED / ON_HOLD) and support for multiple employment types (full-time, part-time, contract, internship)
- **7-stage candidate pipeline:** APPLIED → SCREENING → INTERVIEW → ASSESSMENT → OFFER → HIRED / REJECTED — managed via a drag-and-drop Kanban board
- **Resume parsing** from PDF, DOCX, and TXT files using Apache Tika, PDFBox, and POI — auto-extracts name, email, phone, and matches against 60+ recognized technical skills
- **Intelligent candidate matching** per job opening, scored on three factors:
  - Skills overlap (50% weight)
  - Availability based on days since last assignment (25% weight)
  - Geographic proximity via Haversine distance calculation (25% weight)
- **Talent pool** — a centralized candidate database independent of specific job postings, populated via resume upload or manual entry
- **Dashboard analytics** — total jobs, open positions, candidate distribution across pipeline stages, job counts by employer

### Target Users

- Recruiters and hiring managers tracking applicants across open positions
- HR teams maintaining a talent pool and reviewing candidate fit

### Business Value

Covers the core workflow of applicant tracking: posting roles, collecting candidates, moving them through stages, and identifying top matches. The resume parser eliminates manual data entry for new candidates. The matching algorithm provides a defensible, multi-factor ranking rather than simple keyword filtering. The drag-and-drop pipeline gives recruiters a visual, low-friction way to manage candidate progression.

### Architecture

| Layer | Stack |
|-------|-------|
| Frontend | Angular 21, TypeScript 5.9, Angular CDK (drag-drop) |
| Backend | Spring Boot 4.0.4, Java 25, Spring Data JPA, Apache Tika/PDFBox/POI |
| Database | PostgreSQL 16 (sidecar container in ECS task) |
| Auth | Stateless API, CORS configured (demo mode — no auth enforcement) |
| Infrastructure | Docker, Nginx, AWS ECS Fargate, ALB, Route53, ACM |

```
Browser → ALB (ats.clarkfoster.com)
             ├─ /api/* → Spring Boot (port 8080) ↔ PostgreSQL (localhost:5432, sidecar)
             └─ /*     → Nginx → Angular SPA (port 80)
```

Database is seeded with 6 jobs and 100 candidates across realistic profiles (skills, locations, pipeline stages) for immediate demonstration.

---

## 4. Shared Cloud Infrastructure

All three systems run on a single AWS infrastructure stack, managed entirely through Terraform with remote state in S3 and DynamoDB locking.

### Compute

- **AWS ECS Fargate** — 6 services (3 frontends, 3 backends) running as serverless containers on a single cluster (`prod-portfolio-cluster`)
- **Databases** run as sidecar containers within backend tasks (MySQL for e-commerce, PostgreSQL for ATS) — no managed RDS
- **ECR** hosts 8 container images with lifecycle policies retaining the last 10 images per repository

### Networking

- **VPC** (10.0.0.0/16) with 2 public subnets across availability zones
- **Application Load Balancer** with host-based and path-based routing rules directing traffic to the correct frontend or backend target group
- **HTTP → HTTPS redirect** enforced at the ALB listener level
- **ACM certificate** covering clarkfoster.com + www, shop, and ats subdomains, DNS-validated via Route53

### Security

- **WAF** with 5 rules: general rate limiting (2000 req/5 min), auth endpoint rate limiting (20 req/5 min), and three AWS managed rule sets (common vulnerabilities, known bad inputs, SQL injection)
- **Security groups** restrict ECS task ingress to ALB-originated traffic only
- **Nginx** adds security headers on all frontends: HSTS, CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff
- **Secrets Manager** stores JWT signing keys, admin credentials, and SMTP credentials — injected as environment variables into ECS tasks

### CI/CD

- **GitHub Actions** with OIDC federation (no stored AWS credentials)
- **Deployment script** builds images, pushes to ECR, registers new task definitions, updates ECS services, and waits for stabilization with a 15-minute timeout
- **SonarQube** configured for static analysis across all 6 codebases

### Observability

- **CloudWatch Logs** for all 8 containers (7-day retention)
- **Container Insights** enabled on the ECS cluster
- **WAF metrics** with sampled request logging
- **Spring Actuator** health endpoints on all backends (`/actuator/health`)

### Cost Controls

- Fargate billing: pay per vCPU-second and GB-second (no idle EC2 instances)
- Sidecar databases avoid managed RDS costs
- ECR lifecycle policies auto-delete old images
- 7-day log retention limits CloudWatch storage
