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

variable "admin_password" {
  description = "Admin user password for portfolio backend"
  type        = string
  sensitive   = true
}
