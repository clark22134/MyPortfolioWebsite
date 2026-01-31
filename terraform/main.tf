terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment to use S3 backend for state management
  # backend "s3" {
  #   bucket = "portfolio-terraform-state"
  #   key    = "portfolio/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
}

# VPC and Networking
module "networking" {
  source = "./modules/networking"
  
  environment    = var.environment
  vpc_cidr       = var.vpc_cidr
  public_subnets = var.public_subnets
}

# ACM Certificate for SSL/TLS
module "acm" {
  source = "./modules/acm"
  
  domain_name = var.domain_name
  environment = var.environment
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"
  
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  public_subnet_ids  = module.networking.public_subnet_ids
  certificate_arn    = module.acm.certificate_arn
}

# ECS Fargate Cluster and Services
module "ecs" {
  source = "./modules/ecs"
  
  environment           = var.environment
  vpc_id                = module.networking.vpc_id
  public_subnet_ids     = module.networking.public_subnet_ids
  backend_port          = var.backend_port
  frontend_port         = var.frontend_port
  backend_cpu           = var.backend_cpu
  backend_memory        = var.backend_memory
  frontend_cpu          = var.frontend_cpu
  frontend_memory       = var.frontend_memory
  alb_target_group_backend_arn  = module.alb.backend_target_group_arn
  alb_target_group_frontend_arn = module.alb.frontend_target_group_arn
  alb_security_group_id = module.alb.alb_security_group_id
}

# Route53 DNS
module "route53" {
  source = "./modules/route53"
  
  domain_name    = var.domain_name
  alb_dns_name   = module.alb.alb_dns_name
  alb_zone_id    = module.alb.alb_zone_id
}
