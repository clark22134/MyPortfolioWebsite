terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # S3 backend for remote state management with DynamoDB locking
  backend "s3" {
    bucket         = "clarkfoster-portfolio-tf-state"
    key            = "portfolio/terraform.tfstate"
    region         = "eu-west-2"
    encrypt        = true
    dynamodb_table = "portfolio-terraform-locks"
  }
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

# WAF for geo-restriction
module "waf" {
  source = "./modules/waf"
  
  environment = var.environment
  alb_arn     = module.alb.alb_arn
}

# IAM Roles and Policies
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]
}

resource "aws_iam_role" "github_actions" {
  name = "github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = [
            "repo:${var.github_repository}:ref:refs/heads/main",
            "repo:${var.github_repository}:ref:refs/heads/master",
            "repo:${var.github_repository}:pull_request",
            "repo:${var.github_repository}:environment:production"
          ]
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_actions" {
  name = "github-actions-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeClusters",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:ListTasks",
          "ecs:DescribeTasks"
        ]
        Resource = "*"
      },
      {
        Sid    = "TerraformStateS3"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::clarkfoster-portfolio-tf-state",
          "arn:aws:s3:::clarkfoster-portfolio-tf-state/*"
        ]
      },
      {
        Sid    = "TerraformStateLocking"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:eu-west-2:010438493245:table/portfolio-terraform-locks"
      },
      {
        Sid    = "TerraformInfrastructure"
        Effect = "Allow"
        Action = [
          "ec2:*",
          "elasticloadbalancing:*",
          "ecs:*",
          "wafv2:*",
          "route53:*",
          "acm:*",
          "logs:*",
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:GetOpenIDConnectProvider"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = [
          "arn:aws:iam::010438493245:role/${var.environment}-portfolio-ecs-task-execution"
        ]
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
      }
    ]
  })
}