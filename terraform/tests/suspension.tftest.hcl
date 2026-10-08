mock_provider "aws" {
  override_during = plan
  mock_data "aws_availability_zones" {
    defaults = { names = ["us-east-1a", "us-east-1b"] }
  }
  mock_data "aws_vpc_endpoint_service" {
    defaults = { availability_zones = ["us-east-1a", "us-east-1b"] }
  }
  mock_data "aws_caller_identity" {
    defaults = { account_id = "010438493245" }
  }
}

mock_provider "aws" {
  alias = "us_east_1"
}

mock_provider "random" {}

override_module {
  target = module.acm
  outputs = {
    certificate_arn = "arn:aws:acm:us-east-1:010438493245:certificate/00000000-0000-0000-0000-000000000000"
  }
}

variables {
  ses_smtp_username    = "test-mail-user"
  ses_smtp_password    = "test-mail-password"
  portfolio_jwt_secret = "test-portfolio-jwt"
  ecommerce_jwt_secret = "test-ecommerce-jwt"
  ats_jwt_secret       = "test-ats-jwt"
  admin_password       = "test-admin-password"
  openai_api_key       = "test-only-openai-key"
}

run "suspended_by_default" {
  command = plan

  assert {
    condition     = !output.website_enabled && output.website_url == null
    error_message = "The site must remain suspended unless explicitly enabled."
  }
  assert {
    condition     = length(module.portfolio_lambda) == 0 && length(module.ats_lambda) == 0 && length(module.ecommerce_lambda) == 0 && length(module.portfolio_chatbot_lambda) == 0
    error_message = "All four Lambda applications must be absent during suspension."
  }
  assert {
    condition     = length(module.cloudfront_waf) == 0 && length(aws_vpc_endpoint.ses_smtp) == 0 && module.shared_aurora.cluster_endpoint == null
    error_message = "Suspension must remove every fixed-cost runtime resource."
  }
  assert {
    condition     = length(module.portfolio_cloudfront) == 0 && length(module.ecommerce_cloudfront) == 0 && length(module.ats_cloudfront) == 0 && length(aws_route53_record.portfolio) == 0
    error_message = "Suspended sites must have no public distributions or website alias records."
  }
  assert {
    condition     = aws_iam_role.github_actions.name == "github-actions-role" && length(aws_secretsmanager_secret.openai_api_key) == 1
    error_message = "Recovery buckets, free networking, and secrets must remain."
  }
}

run "restore_with_iam_auth" {
  command = plan
  variables {
    website_enabled             = true
    restore_snapshot_identifier = "prod-shared-suspended-test"
    portfolio_db_iam_auth       = true
    ecommerce_db_iam_auth       = true
    ats_db_iam_auth             = true
  }
  assert {
    condition     = length(module.portfolio_lambda) == 1 && length(module.ats_lambda) == 1 && length(module.ecommerce_lambda) == 1 && length(module.portfolio_chatbot_lambda) == 1
    error_message = "Reactivation must recreate all four applications."
  }
  assert {
    condition     = length(module.cloudfront_waf) == 1 && length(aws_vpc_endpoint.ses_smtp) == 1
    error_message = "Reactivation must restore WAF and SMTP connectivity."
  }
}
