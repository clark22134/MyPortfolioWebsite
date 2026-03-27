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

variable "backend_port" {
  description = "Backend application port"
  type        = number
  default     = 8080
}

variable "frontend_port" {
  description = "Frontend application port"
  type        = number
  default     = 80
}

variable "backend_cpu" {
  description = "CPU units for backend container (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Memory for backend container in MB (512, 1024, 2048, 4096, 8192)"
  type        = number
  default     = 1024
}

variable "frontend_cpu" {
  description = "CPU units for frontend container"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memory for frontend container in MB"
  type        = number
  default     = 512
}

variable "github_repository" {
  description = "GitHub repository in format 'owner/repo'"
  type        = string
  default     = "clark22134/MyPortfolioWebsite"
}

# ATS ECS sizing
variable "ats_backend_cpu" {
  description = "CPU units for ATS backend container (includes PostgreSQL sidecar)"
  type        = number
  default     = 512
}

variable "ats_backend_memory" {
  description = "Memory for ATS backend container in MB (includes PostgreSQL sidecar)"
  type        = number
  default     = 1024
}

variable "ats_frontend_cpu" {
  description = "CPU units for ATS frontend container"
  type        = number
  default     = 256
}

variable "ats_frontend_memory" {
  description = "Memory for ATS frontend container in MB"
  type        = number
  default     = 512
}

# E-Commerce ECS sizing
variable "ecommerce_backend_cpu" {
  description = "CPU units for e-commerce backend container"
  type        = number
  default     = 512
}

variable "ecommerce_backend_memory" {
  description = "Memory for e-commerce backend container in MB (includes MySQL sidecar)"
  type        = number
  default     = 2048
}

variable "ecommerce_frontend_cpu" {
  description = "CPU units for e-commerce frontend container"
  type        = number
  default     = 256
}

variable "ecommerce_frontend_memory" {
  description = "Memory for e-commerce frontend container in MB"
  type        = number
  default     = 512
}
