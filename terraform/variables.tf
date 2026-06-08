variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "clarkfoster.com"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnets" {
  description = "List of public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnets" {
  description = "List of private subnet CIDR blocks for Lambda and Aurora"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "github_repository" {
  description = "GitHub repository in format 'owner/repo'"
  type        = string
  default     = "clark22134/MyPortfolioWebsite"
}

# SES SMTP credentials for contact form email
variable "ses_smtp_username" {
  description = "SES SMTP username (IAM access key ID)"
  type        = string
  sensitive   = true
}

variable "ses_smtp_password" {
  description = "SES SMTP password (derived from IAM secret access key)"
  type        = string
  sensitive   = true
}

variable "ecommerce_jwt_secret" {
  description = "Base64-encoded JWT secret for ecommerce backend"
  type        = string
  sensitive   = true
}

variable "portfolio_jwt_secret" {
  description = "JWT secret for portfolio backend"
  type        = string
  sensitive   = true
}

variable "ats_jwt_secret" {
  description = "JWT secret for the HireFlow ATS backend (HMAC-SHA256, ≥ 32 bytes)"
  type        = string
  sensitive   = true
}

# SECURITY: these were previously defaulted to literal `admin123` / `recruiter123`
# / `manager123`. The deploy workflow does NOT pass overrides, so those defaults
# would flow straight into the production Lambda env, and `DemoUserInitializer`
# would seed real, internet-reachable accounts with those passwords. To re-enable
# the public demo, the operator MUST supply strong values via TF_VAR_ats_*_password
# in the deploy workflow AND set ATS_DEMO_ACCOUNTS_ENABLED to "true" in main.tf.
variable "ats_admin_password" {
  description = "Initial password for the seeded ATS admin demo account. Empty by default; must be a strong value if demo seeding is re-enabled."
  type        = string
  sensitive   = true
  default     = ""
}

variable "ats_recruiter_password" {
  description = "Initial password for the seeded ATS recruiter demo account. Empty by default; must be a strong value if demo seeding is re-enabled."
  type        = string
  sensitive   = true
  default     = ""
}

variable "ats_manager_password" {
  description = "Initial password for the seeded ATS hiring-manager demo account. Empty by default; must be a strong value if demo seeding is re-enabled."
  type        = string
  sensitive   = true
  default     = ""
}

variable "admin_password" {
  description = "Admin user password for portfolio backend"
  type        = string
  sensitive   = true
}

# OpenAI API key used by the portfolio RAG chatbot. Stored in AWS Secrets
# Manager (see main.tf) — never committed to source control. Provide via
# TF_VAR_openai_api_key in CI or `terraform.tfvars` (gitignored).
variable "openai_api_key" {
  description = "OpenAI API key for the portfolio RAG chatbot. Leave empty to disable the chatbot in this environment."
  type        = string
  sensitive   = true
  default     = ""
}

# ---------------------------------------------------------------------------
# RDS IAM database authentication (per app, default off).
# See terraform/RDS_IAM_AUTH_RUNBOOK.md. Flip an app's flag to true only AFTER
# its IAM DB role has been created (provisioning SQL in terraform/rds-iam/).
# ---------------------------------------------------------------------------
variable "enable_data_api" {
  description = "Transiently enable the Aurora RDS Data API to run one-time IAM-role provisioning SQL. Keep false in steady state to preserve VPC isolation."
  type        = bool
  default     = false
}

variable "portfolio_db_iam_auth" {
  description = "When true, the portfolio Lambda authenticates to Aurora with RDS IAM tokens (no DB password) and is granted rds-db:connect. When false, it uses the master password as before."
  type        = bool
  default     = false
}

variable "portfolio_db_iam_user" {
  description = "PostgreSQL role the portfolio Lambda assumes for IAM auth (must exist with 'GRANT rds_iam' and privileges on the portfolio database)."
  type        = string
  default     = "portfolio_app"
}

variable "ecommerce_db_iam_auth" {
  description = "When true, the ecommerce Lambda authenticates to Aurora with RDS IAM tokens (no DB password) and is granted rds-db:connect."
  type        = bool
  default     = false
}

variable "ecommerce_db_iam_user" {
  description = "PostgreSQL role the ecommerce Lambda assumes for IAM auth (must exist with 'GRANT rds_iam' and privileges on the ecommerce database)."
  type        = string
  default     = "ecommerce_app"
}

variable "ats_db_iam_auth" {
  description = "When true, the ATS Lambda authenticates to Aurora with RDS IAM tokens (no DB password) and is granted rds-db:connect."
  type        = bool
  default     = false
}

variable "ats_db_iam_user" {
  description = "PostgreSQL role the ATS Lambda assumes for IAM auth (must exist with 'GRANT rds_iam', CREATE on schema public for Flyway, and privileges on the ats database)."
  type        = string
  default     = "ats_app"
}
