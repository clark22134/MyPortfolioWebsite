terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.31"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
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

# Provider for us-east-1 (required for ACM certificates and CloudFront WAF)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# VPC and Networking
module "networking" {
  source = "./modules/networking"
  
  environment      = var.environment
  vpc_cidr         = var.vpc_cidr
  public_subnets   = var.public_subnets
  private_subnets  = var.private_subnets
}

# ACM Certificate for SSL/TLS (must be in us-east-1 for CloudFront)
module "acm" {
  source = "./modules/acm"
  providers = {
    aws.us_east_1 = aws.us_east_1
  }
  
  domain_name = var.domain_name
  environment = var.environment
}

# CloudFront WAF (must be in us-east-1)
module "cloudfront_waf" {
  source = "./modules/cloudfront-waf"
  providers = {
    aws.us_east_1 = aws.us_east_1
  }
  
  environment = var.environment
}

# API Gateway CloudWatch Logs IAM Role (account-level setting)
resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "${var.environment}-api-gateway-cloudwatch-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
  
  depends_on = [aws_iam_role_policy_attachment.api_gateway_cloudwatch]
}

# =========================================================================
# SHARED AURORA SERVERLESS V2 CLUSTER
# =========================================================================

# Single Aurora cluster shared by all three applications.
# Each app uses a separate database within this cluster:
#   - portfolio (default, created by Aurora)
#   - ecommerce (created post-apply via temp seeder Lambda)
#   - ats       (created post-apply via temp seeder Lambda)
module "shared_aurora" {
  source = "./modules/aurora"

  environment              = var.environment
  cluster_identifier       = "shared"
  database_name            = "portfolio"
  vpc_id                   = module.networking.vpc_id
  subnet_ids               = module.networking.private_subnet_ids
  allowed_security_groups  = [
    aws_security_group.portfolio_lambda.id,
    aws_security_group.ecommerce_lambda.id,
    aws_security_group.ats_lambda.id,
  ]
  min_capacity             = 0.5
  max_capacity             = 4
}

# =========================================================================
# PORTFOLIO APPLICATION
# =========================================================================

# Security group for Portfolio Lambda
resource "aws_security_group" "portfolio_lambda" {
  name        = "${var.environment}-portfolio-lambda-sg"
  description = "Security group for Portfolio Lambda function"
  vpc_id      = module.networking.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "${var.environment}-portfolio-lambda-sg"
    Environment = var.environment
  }
}

# Lambda function for Portfolio Backend
module "portfolio_lambda" {
  source = "./modules/lambda"
  
  environment        = var.environment
  function_name      = "portfolio-backend"
  runtime            = "java21"
  handler            = "com.portfolio.backend.StreamLambdaHandler::handleRequest"
  memory_size        = 1024
  timeout            = 30
  enable_snapstart   = true
  
  vpc_id                 = module.networking.vpc_id
  vpc_subnet_ids         = module.networking.private_subnet_ids
  vpc_security_group_ids = [aws_security_group.portfolio_lambda.id]
  database_secret_arn    = module.shared_aurora.secret_arn
  enable_database_access = true
  
  environment_variables = {
    SPRING_PROFILES_ACTIVE = "prod"
    SPRING_DATASOURCE_URL  = "jdbc:postgresql://${module.shared_aurora.cluster_endpoint}:5432/portfolio"
    DATABASE_SECRET_ARN    = module.shared_aurora.secret_arn
    DB_USERNAME            = module.shared_aurora.master_username
    DB_PASSWORD            = module.shared_aurora.master_password
    MAIL_HOST              = "email-smtp.us-east-1.amazonaws.com"
    MAIL_PORT              = "587"
    MAIL_USERNAME          = var.ses_smtp_username
    MAIL_PASSWORD          = var.ses_smtp_password
    CONTACT_EMAIL          = "clark@clarkfoster.com"
    JWT_SECRET             = var.portfolio_jwt_secret
    ADMIN_PASSWORD         = var.admin_password
  }
}

# API Gateway for Portfolio Backend
module "portfolio_api_gateway" {
  source = "./modules/api-gateway"
  
  environment          = var.environment
  api_name             = "portfolio-api"
  lambda_invoke_arn    = module.portfolio_lambda.function_invoke_arn
  lambda_function_name = module.portfolio_lambda.function_name
}

# S3 bucket for Portfolio Frontend
module "portfolio_s3" {
  source = "./modules/s3-static"
  
  environment = var.environment
  bucket_name = "${var.environment}-portfolio-frontend-010438493245"
}

# CloudFront for Portfolio Frontend
module "portfolio_cloudfront" {
  source = "./modules/cloudfront"
  
  environment                    = var.environment
  domain_name                    = "clarkfoster.com"
  additional_aliases             = ["www.clarkfoster.com"]
  s3_bucket_regional_domain_name = module.portfolio_s3.bucket_regional_domain_name
  certificate_arn                = module.acm.certificate_arn
  api_gateway_domain             = module.portfolio_api_gateway.api_domain
  enable_waf                     = true
  waf_web_acl_id                 = module.cloudfront_waf.web_acl_arn
}

# Update S3 bucket policy after CloudFront is created
resource "aws_s3_bucket_policy" "portfolio_cloudfront" {
  bucket = module.portfolio_s3.bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${module.portfolio_s3.bucket_arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = module.portfolio_cloudfront.distribution_arn
          }
        }
      }
    ]
  })
}

# =========================================================================
# E-COMMERCE APPLICATION
# =========================================================================

# Security group for E-Commerce Lambda
resource "aws_security_group" "ecommerce_lambda" {
  name        = "${var.environment}-ecommerce-lambda-sg"
  description = "Security group for E-Commerce Lambda function"
  vpc_id      = module.networking.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "${var.environment}-ecommerce-lambda-sg"
    Environment = var.environment
  }
}

# Lambda function for E-Commerce Backend
module "ecommerce_lambda" {
  source = "./modules/lambda"
  
  environment        = var.environment
  function_name      = "ecommerce-backend"
  runtime            = "java21"
  handler            = "com.clarksprojects.ecommerce.StreamLambdaHandler::handleRequest"
  memory_size        = 2048
  timeout            = 30
  enable_snapstart   = true
  
  vpc_id                 = module.networking.vpc_id
  vpc_subnet_ids         = module.networking.private_subnet_ids
  vpc_security_group_ids = [aws_security_group.ecommerce_lambda.id]
  database_secret_arn    = module.shared_aurora.secret_arn
  enable_database_access = true
  
  environment_variables = {
    SPRING_PROFILES_ACTIVE  = "prod"
    SPRING_DATASOURCE_URL   = "jdbc:postgresql://${module.shared_aurora.cluster_endpoint}:5432/ecommerce"
    DATABASE_SECRET_ARN     = module.shared_aurora.secret_arn
    DB_USERNAME             = module.shared_aurora.master_username
    DB_PASSWORD             = module.shared_aurora.master_password
    ECOMMERCE_JWT_SECRET    = var.ecommerce_jwt_secret
  }
}

# API Gateway for E-Commerce Backend
# Use the SnapStart alias invoke ARN so cold starts use the pre-initialized snapshot.
module "ecommerce_api_gateway" {
  source = "./modules/api-gateway"
  
  environment          = var.environment
  api_name             = "ecommerce-api"
  lambda_invoke_arn    = module.ecommerce_lambda.alias_invoke_arn
  lambda_function_name = module.ecommerce_lambda.function_name
  lambda_alias         = module.ecommerce_lambda.alias_name
}

# S3 bucket for E-Commerce Frontend
module "ecommerce_s3" {
  source = "./modules/s3-static"
  
  environment = var.environment
  bucket_name = "${var.environment}-ecommerce-frontend-010438493245"
}

# CloudFront for E-Commerce Frontend
module "ecommerce_cloudfront" {
  source = "./modules/cloudfront"
  
  environment                    = var.environment
  domain_name                    = "shop.clarkfoster.com"
  s3_bucket_regional_domain_name = module.ecommerce_s3.bucket_regional_domain_name
  certificate_arn                = module.acm.certificate_arn
  api_gateway_domain             = module.ecommerce_api_gateway.api_domain
  enable_waf                     = true
  waf_web_acl_id                 = module.cloudfront_waf.web_acl_arn
}

# Update S3 bucket policy after CloudFront is created
resource "aws_s3_bucket_policy" "ecommerce_cloudfront" {
  bucket = module.ecommerce_s3.bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${module.ecommerce_s3.bucket_arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = module.ecommerce_cloudfront.distribution_arn
          }
        }
      }
    ]
  })
}

# =========================================================================
# ATS APPLICATION
# =========================================================================

# Security group for ATS Lambda
resource "aws_security_group" "ats_lambda" {
  name        = "${var.environment}-ats-lambda-sg"
  description = "Security group for ATS Lambda function"
  vpc_id      = module.networking.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "${var.environment}-ats-lambda-sg"
    Environment = var.environment
  }
}

# Lambda function for ATS Backend
module "ats_lambda" {
  source = "./modules/lambda"
  
  environment        = var.environment
  function_name      = "ats-backend"
  runtime            = "java21"
  handler            = "com.clarksprojects.ats.StreamLambdaHandler::handleRequest"
  memory_size        = 1024
  timeout            = 30
  enable_snapstart   = true
  
  vpc_id                 = module.networking.vpc_id
  vpc_subnet_ids         = module.networking.private_subnet_ids
  vpc_security_group_ids = [aws_security_group.ats_lambda.id]
  database_secret_arn    = module.shared_aurora.secret_arn
  enable_database_access = true
  
  environment_variables = {
    SPRING_PROFILES_ACTIVE = "prod"
    SPRING_DATASOURCE_URL  = "jdbc:postgresql://${module.shared_aurora.cluster_endpoint}:5432/ats"
    DATABASE_SECRET_ARN    = module.shared_aurora.secret_arn
    DB_USERNAME            = module.shared_aurora.master_username
    DB_PASSWORD            = module.shared_aurora.master_password
  }
}

# API Gateway for ATS Backend
# Use the SnapStart alias invoke ARN so cold starts use the pre-initialized snapshot.
module "ats_api_gateway" {
  source = "./modules/api-gateway"
  
  environment          = var.environment
  api_name             = "ats-api"
  lambda_invoke_arn    = module.ats_lambda.alias_invoke_arn
  lambda_function_name = module.ats_lambda.function_name
  lambda_alias         = module.ats_lambda.alias_name
}

# S3 bucket for ATS Frontend
module "ats_s3" {
  source = "./modules/s3-static"
  
  environment = var.environment
  bucket_name = "${var.environment}-ats-frontend-010438493245"
}

# CloudFront for ATS Frontend
module "ats_cloudfront" {
  source = "./modules/cloudfront"
  
  environment                    = var.environment
  domain_name                    = "ats.clarkfoster.com"
  s3_bucket_regional_domain_name = module.ats_s3.bucket_regional_domain_name
  certificate_arn                = module.acm.certificate_arn
  api_gateway_domain             = module.ats_api_gateway.api_domain
  enable_waf                     = true
  waf_web_acl_id                 = module.cloudfront_waf.web_acl_arn
}

# Update S3 bucket policy after CloudFront is created
resource "aws_s3_bucket_policy" "ats_cloudfront" {
  bucket = module.ats_s3.bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${module.ats_s3.bucket_arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = module.ats_cloudfront.distribution_arn
          }
        }
      }
    ]
  })
}

# =========================================================================
# ROUTE53 DNS
# =========================================================================

# Route53 DNS records for all applications
resource "aws_route53_record" "portfolio" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "clarkfoster.com"
  type    = "A"

  alias {
    name                   = module.portfolio_cloudfront.distribution_domain_name
    zone_id                = module.portfolio_cloudfront.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "portfolio_www" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.clarkfoster.com"
  type    = "A"

  alias {
    name                   = module.portfolio_cloudfront.distribution_domain_name
    zone_id                = module.portfolio_cloudfront.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "ecommerce" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "shop.clarkfoster.com"
  type    = "A"

  alias {
    name                   = module.ecommerce_cloudfront.distribution_domain_name
    zone_id                = module.ecommerce_cloudfront.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "ats" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "ats.clarkfoster.com"
  type    = "A"

  alias {
    name                   = module.ats_cloudfront.distribution_domain_name
    zone_id                = module.ats_cloudfront.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

data "aws_route53_zone" "main" {
  name = var.domain_name
}

# =========================================================================
# IAM ROLES FOR GITHUB ACTIONS
# =========================================================================

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
        Sid    = "S3StaticWebsiteDeployment"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          module.portfolio_s3.bucket_arn,
          "${module.portfolio_s3.bucket_arn}/*",
          module.ecommerce_s3.bucket_arn,
          "${module.ecommerce_s3.bucket_arn}/*",
          module.ats_s3.bucket_arn,
          "${module.ats_s3.bucket_arn}/*"
        ]
      },
      {
        Sid    = "CloudFrontInvalidation"
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation"
        ]
        Resource = [
          module.portfolio_cloudfront.distribution_arn,
          module.ecommerce_cloudfront.distribution_arn,
          module.ats_cloudfront.distribution_arn
        ]
      },
      {
        Sid    = "LambdaDeployment"
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:GetFunction",
          "lambda:PublishVersion"
        ]
        Resource = [
          module.portfolio_lambda.function_arn,
          module.ecommerce_lambda.function_arn,
          module.ats_lambda.function_arn
        ]
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
          "rds:*",
          "secretsmanager:*",
          "cloudwatch:*",
          "events:*",
          "logs:*",
          "s3:*",
          "cloudfront:*",
          "route53:*",
          "acm:*",
          "wafv2:*",
          "apigateway:*",
          "lambda:*",
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:GetOpenIDConnectProvider",
          "iam:PassRole"
        ]
        Resource = "*"
      }
    ]
  })
}
