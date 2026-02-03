variable "environment" {
  description = "Environment name"
  type        = string
}

variable "alb_arn" {
  description = "ARN of the Application Load Balancer"
  type        = string
}

# WAF Web ACL for DDoS protection, rate limiting, and geo-restriction
resource "aws_wafv2_web_acl" "main" {
  name  = "${var.environment}-portfolio-waf"
  scope = "REGIONAL"

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
      metric_name                = "${var.environment}-rate-limit-general"
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
          byte_match_statement {
            positional_constraint = "STARTS_WITH"
            search_string         = "/api/auth"
            
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

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.environment}-rate-limit-auth"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: AWS Managed Rules - Common Rule Set (protection against common attacks)
  rule {
    name     = "aws-managed-common-rules"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.environment}-aws-common-rules"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "aws-managed-bad-inputs"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.environment}-aws-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  # Rule 5: AWS Managed Rules - SQL Injection Protection
  rule {
    name     = "aws-managed-sqli"
    priority = 5

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.environment}-aws-sqli"
      sampled_requests_enabled   = true
    }
  }

  # Rule 6: Geo-restriction - Block non-US traffic (optional, lower priority)
  rule {
    name     = "geo-block-non-us"
    priority = 6

    action {
      block {}
    }

    statement {
      not_statement {
        statement {
          geo_match_statement {
            country_codes = ["US"]
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.environment}-geo-block"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.environment}-portfolio-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "${var.environment}-portfolio-waf"
    Environment = var.environment
  }
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = var.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

output "web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.id
}

output "web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.arn
}
