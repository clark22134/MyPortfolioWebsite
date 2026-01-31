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

# EC2 Compute Resources
module "compute" {
  source = "./modules/compute"
  
  environment         = var.environment
  vpc_id              = module.networking.vpc_id
  public_subnet_ids   = module.networking.public_subnet_ids
  instance_type       = var.instance_type
  key_name            = var.key_name
  backend_port        = var.backend_port
  frontend_port       = var.frontend_port
}

# RDS Database (Optional - using H2 in memory for demo)
# module "database" {
#   source = "./modules/database"
#   
#   environment        = var.environment
#   vpc_id             = module.networking.vpc_id
#   private_subnet_ids = module.networking.private_subnet_ids
#   db_username        = var.db_username
#   db_password        = var.db_password
# }
