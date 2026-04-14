variable "environment" {
  description = "Environment name"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the CloudFront distribution"
  type        = string
}

variable "s3_bucket_regional_domain_name" {
  description = "S3 bucket regional domain name"
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN (must be in us-east-1)"
  type        = string
}

variable "api_gateway_domain" {
  description = "API Gateway domain name for backend requests"
  type        = string
  default     = ""
}

variable "api_gateway_stage" {
  description = "API Gateway stage name (e.g. prod)"
  type        = string
  default     = "prod"
}

variable "enable_waf" {
  description = "Enable WAF for CloudFront"
  type        = bool
  default     = true
}

variable "waf_web_acl_id" {
  description = "WAF Web ACL ID"
  type        = string
  default     = ""
}

variable "additional_aliases" {
  description = "Additional domain aliases for the CloudFront distribution"
  type        = list(string)
  default     = []
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "static_site" {
  name                              = "${var.environment}-${var.domain_name}-oac"
  description                       = "OAC for ${var.domain_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "static_site" {
  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  price_class         = "PriceClass_100" # Use only North America and Europe edge locations
  aliases             = concat([var.domain_name], var.additional_aliases)
  default_root_object = "index.html"
  comment             = "${var.environment} - ${var.domain_name}"

  # S3 origin for static content
  origin {
    domain_name              = var.s3_bucket_regional_domain_name
    origin_id                = "S3-${var.domain_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.static_site.id
  }

  # API Gateway origin for backend requests (if provided)
  dynamic "origin" {
    for_each = var.api_gateway_domain != "" ? [1] : []
    content {
      domain_name = var.api_gateway_domain
      origin_id   = "API-${var.domain_name}"
      origin_path = "/${var.api_gateway_stage}"

      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  # Default cache behavior (S3 static content)
  default_cache_behavior {
    target_origin_id       = "S3-${var.domain_name}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400   # 1 day
    max_ttl     = 31536000 # 1 year
  }

  # API cache behavior (if API Gateway is configured)
  dynamic "ordered_cache_behavior" {
    for_each = var.api_gateway_domain != "" ? [1] : []
    content {
      path_pattern           = "/api/*"
      target_origin_id       = "API-${var.domain_name}"
      viewer_protocol_policy = "https-only"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD"]
      compress               = true

      forwarded_values {
        query_string = true
        headers      = ["Authorization", "Content-Type", "Accept"]
        cookies {
          forward = "all"
        }
      }

      min_ttl     = 0
      default_ttl = 0 # Don't cache API responses by default
      max_ttl     = 0
    }
  }

  # Custom error responses for SPA routing
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    minimum_protocol_version = "TLSv1.2_2021"
    ssl_support_method       = "sni-only"
  }

  # Associate WAF if enabled
  web_acl_id = var.enable_waf ? var.waf_web_acl_id : null

  tags = {
    Name        = "${var.environment}-${var.domain_name}-cf"
    Environment = var.environment
  }
}

output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.static_site.id
}

output "distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.static_site.arn
}

output "distribution_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.static_site.domain_name
}

output "distribution_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID"
  value       = aws_cloudfront_distribution.static_site.hosted_zone_id
}

output "origin_access_control_id" {
  description = "Origin Access Control ID"
  value       = aws_cloudfront_origin_access_control.static_site.id
}
