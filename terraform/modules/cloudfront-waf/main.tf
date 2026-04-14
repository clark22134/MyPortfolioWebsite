variable "environment" {
  description = "Environment name"
  type        = string
}

# CloudFront WAF must be in us-east-1 region
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.31"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

resource "aws_wafv2_web_acl" "cloudfront" {
  provider = aws.us_east_1
  name     = "${var.environment}-cloudfront-waf"
  scope    = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rule 1: Rate limit - Block IPs with more than 2000 requests per 5 minutes
  rule {
    name     = "rate-limit-general"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.environment}-cf-rate-limit-general"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: Strict rate limit on auth endpoints - 20 requests per 5 minutes
  rule {
    name     = "rate-limit-auth"
    priority = 2

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 20
        aggregate_key_type = "IP"

        scope_down_statement {
          or_statement {
            statement {
              byte_match_statement {
                positional_constraint = "EXACTLY"
                search_string         = "/api/auth/login"

                field_to_match {
                  uri_path {}
                }

                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
              }
            }
            statement {
              byte_match_statement {
                positional_constraint = "EXACTLY"
                search_string         = "/api/auth/register"

                field_to_match {
                  uri_path {}
                }

                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.environment}-cf-rate-limit-auth"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: AWS Managed Rules - Core Rule Set (protects against common threats)
  rule {
    name     = "aws-managed-common-rules"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.environment}-cf-common-rules"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "aws-managed-known-bad-inputs"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.environment}-cf-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  # Rule 5: AWS Managed Rules - SQL Injection
  rule {
    name     = "aws-managed-sqli-rules"
    priority = 5

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesSQLiRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.environment}-cf-sqli-rules"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.environment}-cloudfront-waf-metrics"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "${var.environment}-cloudfront-waf"
    Environment = var.environment
  }
}

output "web_acl_id" {
  description = "WAF Web ACL ID"
  value       = aws_wafv2_web_acl.cloudfront.id
}

output "web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = aws_wafv2_web_acl.cloudfront.arn
}
