terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.47"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.9"
    }
  }

  # S3 backend for remote state management with DynamoDB locking
  backend "s3" {
    bucket         = "clarkfoster-portfolio-tf-state-use1"
    key            = "portfolio/terraform.tfstate"
    region         = "us-east-1"
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

# Account ID, used to build rds-db:connect ARNs for IAM database auth.
data "aws_caller_identity" "current" {}

# rds-db:connect ARNs for each app's IAM database role. Empty unless that app's
# *_db_iam_auth flag is enabled, which keeps the IAM grant off until cutover.
locals {
  rds_db_arn_prefix            = "arn:aws:rds-db:${var.aws_region}:${data.aws_caller_identity.current.account_id}:dbuser:${module.shared_aurora.cluster_resource_id}"
  portfolio_db_iam_connect_arn = var.portfolio_db_iam_auth ? "${local.rds_db_arn_prefix}/${var.portfolio_db_iam_user}" : ""
  ecommerce_db_iam_connect_arn = var.ecommerce_db_iam_auth ? "${local.rds_db_arn_prefix}/${var.ecommerce_db_iam_user}" : ""
  ats_db_iam_connect_arn       = var.ats_db_iam_auth ? "${local.rds_db_arn_prefix}/${var.ats_db_iam_user}" : ""
}

# VPC and Networking
module "networking" {
  source = "./modules/networking"

  environment     = var.environment
  vpc_cidr        = var.vpc_cidr
  public_subnets  = var.public_subnets
  private_subnets = var.private_subnets
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

  environment        = var.environment
  cluster_identifier = "shared"
  database_name      = "portfolio"
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnet_ids
  allowed_security_groups = [
    aws_security_group.portfolio_lambda.id,
    aws_security_group.ecommerce_lambda.id,
    aws_security_group.ats_lambda.id,
  ]
  min_capacity = 0.5
  max_capacity = 4

  # Off by default. Set TF_VAR_enable_data_api=true only while running one-time
  # IAM-role provisioning SQL, then unset it (see RDS_IAM_AUTH_RUNBOOK.md).
  enable_data_api = var.enable_data_api
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

  environment      = var.environment
  function_name    = "portfolio-backend"
  runtime          = "java21"
  handler          = "com.portfolio.backend.StreamLambdaHandler::handleRequest"
  memory_size      = 1024
  timeout          = 30
  enable_snapstart = true

  vpc_id                 = module.networking.vpc_id
  vpc_subnet_ids         = module.networking.private_subnet_ids
  vpc_security_group_ids = [aws_security_group.portfolio_lambda.id]
  database_secret_arn    = module.shared_aurora.secret_arn
  enable_database_access = true

  # Chatbot now lives in module.portfolio_chatbot_lambda (non-VPC). The
  # portfolio Lambda no longer needs OpenAI access — leaving extra_secret_arns
  # empty removes the IAM grant.
  extra_secret_arns = []

  # Grants rds-db:connect only while IAM auth is enabled (empty otherwise).
  db_iam_connect_arn = local.portfolio_db_iam_connect_arn

  # DB auth is env-driven so the artifact never changes between modes:
  #   - IAM auth: jdbc:aws-wrapper:// URL + wrapper driver + IAM dbuser, no password.
  #   - Password auth (default): plain jdbc:postgresql:// URL + master creds.
  # See terraform/RDS_IAM_AUTH_RUNBOOK.md for the cutover/rollback procedure.
  environment_variables = merge(
    {
      SPRING_PROFILES_ACTIVE = "prod"
      SPRING_DATASOURCE_URL  = var.portfolio_db_iam_auth ? "jdbc:aws-wrapper:postgresql://${module.shared_aurora.cluster_endpoint}:5432/portfolio?wrapperPlugins=iam&sslmode=require" : "jdbc:postgresql://${module.shared_aurora.cluster_endpoint}:5432/portfolio"
      DATABASE_SECRET_ARN    = module.shared_aurora.secret_arn
      DB_USERNAME            = var.portfolio_db_iam_auth ? var.portfolio_db_iam_user : module.shared_aurora.master_username
      MAIL_HOST              = "email-smtp.us-east-1.amazonaws.com"
      MAIL_PORT              = "587"
      MAIL_USERNAME          = var.ses_smtp_username
      MAIL_PASSWORD          = var.ses_smtp_password
      CONTACT_EMAIL          = "clark@clarkfoster.com"
      JWT_SECRET             = var.portfolio_jwt_secret
      ADMIN_PASSWORD         = var.admin_password
      # Chatbot is permanently disabled in this Lambda — its code path now
      # lives in portfolio-chatbot-backend / module.portfolio_chatbot_lambda
      # which runs OUTSIDE the VPC so it can reach api.openai.com.
      CHATBOT_ENABLED           = "false"
      OPENAI_API_KEY            = ""
      SPRING_AI_MODEL_CHAT      = "none"
      SPRING_AI_MODEL_EMBEDDING = "none"
    },
    # IAM mode selects the wrapper driver; password mode supplies the master password.
    var.portfolio_db_iam_auth
    ? { DB_DRIVER_CLASS = "software.amazon.jdbc.Driver" }
    : { DB_PASSWORD = module.shared_aurora.master_password }
  )
}

# ---------------------------------------------------------------------------
# OpenAI API key — AWS Secrets Manager
# ---------------------------------------------------------------------------
# Stored centrally so it can be rotated, audited (CloudTrail logs every
# GetSecretValue call), and IAM-gated. Created only when an actual key has
# been supplied via TF_VAR_openai_api_key, so dev/staging environments that
# don't need the chatbot incur no extra cost or attack surface.
resource "aws_secretsmanager_secret" "openai_api_key" {
  count       = var.openai_api_key != "" ? 1 : 0
  name        = "${var.environment}/portfolio/openai-api-key"
  description = "OpenAI API key consumed by the portfolio RAG chatbot Lambda."

  # 0 = immediate hard delete on destroy. We previously used 7 days, but that
  # caused `CreateSecret … already scheduled for deletion` errors whenever the
  # secret was destroyed (because TF_VAR_openai_api_key was empty in CI) and
  # then recreated within the recovery window. Combined with prevent_destroy
  # below, this means the secret can only be removed by an explicit operator
  # action — and when that happens it's gone cleanly with no name reservation.
  recovery_window_in_days = 0

  tags = {
    Name        = "${var.environment}-portfolio-openai-api-key"
    Environment = var.environment
  }

  # Guardrail: this secret backs the production chatbot. Refuse to destroy it
  # automatically — including when var.openai_api_key flips to empty in CI,
  # which would otherwise toggle `count` from 1 to 0 and tear the resource
  # down. To intentionally remove it, comment this block out, apply, then
  # remove the resource.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  count         = var.openai_api_key != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.openai_api_key[0].id
  secret_string = var.openai_api_key
}

# Re-read the latest version so the Lambda env var always reflects the
# current value, even if rotated outside this Terraform run.
data "aws_secretsmanager_secret_version" "openai_api_key" {
  count      = var.openai_api_key != "" ? 1 : 0
  secret_id  = aws_secretsmanager_secret.openai_api_key[0].id
  depends_on = [aws_secretsmanager_secret_version.openai_api_key]
}

# ---------------------------------------------------------------------------
# Portfolio CHATBOT Lambda (separate function, no VPC)
# ---------------------------------------------------------------------------
# The chatbot needs internet egress to api.openai.com. Putting it inside the
# VPC (like portfolio-backend) would require a NAT Gateway (~$32/mo) just to
# reach OpenAI. Instead we run it as a SECOND Lambda outside the VPC. It has
# no DB access — its knowledge base is bundled markdown — so VPC isolation
# is not required for security. API Gateway routes /api/chatbot/{proxy+} to
# this function; everything else still flows to portfolio_lambda above.
module "portfolio_chatbot_lambda" {
  source = "./modules/lambda"

  environment      = var.environment
  function_name    = "portfolio-chatbot"
  runtime          = "java21"
  handler          = "com.portfolio.chatbot.StreamLambdaHandler::handleRequest"
  memory_size      = 1024
  timeout          = 30
  enable_snapstart = true

  # Deliberately NOT in the VPC — needs egress to api.openai.com and has no
  # database to talk to.
  vpc_id                 = ""
  vpc_subnet_ids         = []
  vpc_security_group_ids = []
  enable_database_access = false

  extra_secret_arns = var.openai_api_key != "" ? [aws_secretsmanager_secret.openai_api_key[0].arn] : []

  environment_variables = {
    SPRING_PROFILES_ACTIVE = "prod"
    OPENAI_API_KEY         = var.openai_api_key != "" ? data.aws_secretsmanager_secret_version.openai_api_key[0].secret_string : ""
    OPENAI_SECRET_ARN      = var.openai_api_key != "" ? aws_secretsmanager_secret.openai_api_key[0].arn : ""
    CHATBOT_ENABLED        = var.openai_api_key != "" ? "true" : "false"
    # Keep the Lambda bootable when OpenAI is intentionally unset. Spring AI's
    # OpenAI auto-config defaults to chat+embedding=openai and throws at startup
    # if api-key is blank unless these are pinned to `none`.
    SPRING_AI_MODEL_CHAT      = var.openai_api_key != "" ? "openai" : "none"
    SPRING_AI_MODEL_EMBEDDING = var.openai_api_key != "" ? "openai" : "none"
  }
}

# API Gateway for Portfolio Backend
# Use the SnapStart alias invoke ARN so cold starts use the pre-initialized snapshot.
module "portfolio_api_gateway" {
  source = "./modules/api-gateway"

  environment          = var.environment
  api_name             = "portfolio-api"
  lambda_invoke_arn    = module.portfolio_lambda.alias_invoke_arn
  lambda_function_name = module.portfolio_lambda.function_name
  lambda_alias         = module.portfolio_lambda.alias_name

  # Route /api/chatbot/{proxy+} to the dedicated, non-VPC chatbot Lambda.
  # All other paths still hit module.portfolio_lambda via the catch-all
  # {proxy+} integration.
  enable_chatbot               = true
  chatbot_lambda_invoke_arn    = module.portfolio_chatbot_lambda.alias_invoke_arn
  chatbot_lambda_function_name = module.portfolio_chatbot_lambda.function_name
  chatbot_lambda_alias         = module.portfolio_chatbot_lambda.alias_name
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

  environment      = var.environment
  function_name    = "ecommerce-backend"
  runtime          = "java21"
  handler          = "com.clarksprojects.ecommerce.StreamLambdaHandler::handleRequest"
  memory_size      = 2048
  timeout          = 30
  enable_snapstart = true

  vpc_id                 = module.networking.vpc_id
  vpc_subnet_ids         = module.networking.private_subnet_ids
  vpc_security_group_ids = [aws_security_group.ecommerce_lambda.id]
  database_secret_arn    = module.shared_aurora.secret_arn
  enable_database_access = true

  # Grants rds-db:connect only while IAM auth is enabled (empty otherwise).
  db_iam_connect_arn = local.ecommerce_db_iam_connect_arn

  # Env-driven DB auth (see terraform/RDS_IAM_AUTH_RUNBOOK.md).
  environment_variables = merge(
    {
      SPRING_PROFILES_ACTIVE = "prod"
      SPRING_DATASOURCE_URL  = var.ecommerce_db_iam_auth ? "jdbc:aws-wrapper:postgresql://${module.shared_aurora.cluster_endpoint}:5432/ecommerce?wrapperPlugins=iam&sslmode=require" : "jdbc:postgresql://${module.shared_aurora.cluster_endpoint}:5432/ecommerce"
      DATABASE_SECRET_ARN    = module.shared_aurora.secret_arn
      DB_USERNAME            = var.ecommerce_db_iam_auth ? var.ecommerce_db_iam_user : module.shared_aurora.master_username
      ECOMMERCE_JWT_SECRET   = var.ecommerce_jwt_secret
    },
    var.ecommerce_db_iam_auth
    ? { DB_DRIVER_CLASS = "software.amazon.jdbc.Driver" }
    : { DB_PASSWORD = module.shared_aurora.master_password }
  )
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

  environment      = var.environment
  function_name    = "ats-backend"
  runtime          = "java21"
  handler          = "com.clarksprojects.ats.StreamLambdaHandler::handleRequest"
  memory_size      = 1024
  timeout          = 30
  enable_snapstart = true

  vpc_id                 = module.networking.vpc_id
  vpc_subnet_ids         = module.networking.private_subnet_ids
  vpc_security_group_ids = [aws_security_group.ats_lambda.id]
  database_secret_arn    = module.shared_aurora.secret_arn
  enable_database_access = true

  # Grants rds-db:connect only while IAM auth is enabled (empty otherwise).
  db_iam_connect_arn = local.ats_db_iam_connect_arn

  # Env-driven DB auth (see terraform/RDS_IAM_AUTH_RUNBOOK.md). Flyway runs as
  # the IAM role, so ats_app needs CREATE on schema public (see the SQL).
  environment_variables = merge(
    {
      SPRING_PROFILES_ACTIVE = "prod"
      SPRING_DATASOURCE_URL  = var.ats_db_iam_auth ? "jdbc:aws-wrapper:postgresql://${module.shared_aurora.cluster_endpoint}:5432/ats?wrapperPlugins=iam&sslmode=require" : "jdbc:postgresql://${module.shared_aurora.cluster_endpoint}:5432/ats"
      DATABASE_SECRET_ARN    = module.shared_aurora.secret_arn
      DB_USERNAME            = var.ats_db_iam_auth ? var.ats_db_iam_user : module.shared_aurora.master_username
      # Required: JwtUtil @PostConstruct fails fast without this, which kills
      # SnapStart pre-init and the Lambda waiter reports "Failed".
      JWT_SECRET    = var.ats_jwt_secret
      COOKIE_DOMAIN = ".clarkfoster.com"
      # Demo accounts disabled in prod (SECURITY: previously defaulted to seeding
      # admin/admin123, recruiter/recruiter123, manager/manager123 — anyone on the
      # internet could log in with full ADMIN privileges). To re-enable the public
      # demo, set this to "true" AND supply strong, non-empty values for
      # TF_VAR_ats_admin_password / TF_VAR_ats_recruiter_password /
      # TF_VAR_ats_manager_password in the deploy workflow. `DemoUserInitializer`
      # also refuses to seed a user whose configured password is blank, as a
      # belt-and-suspenders guard.
      ATS_DEMO_ACCOUNTS_ENABLED = "false"
      ATS_ADMIN_PASSWORD        = var.ats_admin_password
      ATS_RECRUITER_PASSWORD    = var.ats_recruiter_password
      ATS_MANAGER_PASSWORD      = var.ats_manager_password
    },
    var.ats_db_iam_auth
    ? { DB_DRIVER_CLASS = "software.amazon.jdbc.Driver" }
    : { DB_PASSWORD = module.shared_aurora.master_password }
  )
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
          module.portfolio_chatbot_lambda.function_arn,
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
          "arn:aws:s3:::clarkfoster-portfolio-tf-state-use1",
          "arn:aws:s3:::clarkfoster-portfolio-tf-state-use1/*"
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
        Resource = "arn:aws:dynamodb:us-east-1:010438493245:table/portfolio-terraform-locks"
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
          "iam:PassRole",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:UpdateRole",
          "iam:UpdateRoleDescription",
          "iam:UpdateAssumeRolePolicy",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:TagRole",
          "iam:UntagRole",
          "iam:ListInstanceProfilesForRole",
          "iam:CreatePolicy",
          "iam:DeletePolicy",
          "iam:GetPolicy",
          "iam:GetPolicyVersion",
          "iam:ListPolicyVersions",
          "iam:CreatePolicyVersion",
          "iam:DeletePolicyVersion",
          "iam:CreateOpenIDConnectProvider",
          "iam:DeleteOpenIDConnectProvider",
          "iam:UpdateOpenIDConnectProviderThumbprint",
          "iam:TagOpenIDConnectProvider",
          "iam:UntagOpenIDConnectProvider",
          "iam:CreateServiceLinkedRole"
        ]
        Resource = "*"
      }
    ]
  })
}
