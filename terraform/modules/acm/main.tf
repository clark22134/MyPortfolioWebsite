variable "domain_name" {
  description = "Domain name for SSL certificate"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

# Request SSL certificate from ACM
resource "aws_acm_certificate" "main" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "www.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.environment}-portfolio-cert"
    Environment = var.environment
  }
}

# Get Route53 hosted zone
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# Create DNS validation records automatically
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Wait for certificate validation to complete
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Output validated certificate ARN for use by ALB
output "certificate_arn" {
  description = "ARN of the validated ACM certificate"
  value       = aws_acm_certificate_validation.main.certificate_arn
}

# Output validation records for reference
output "certificate_validation_records" {
  description = "DNS validation records for the certificate"
  value = [
    for dvo in aws_acm_certificate.main.domain_validation_options : {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      value  = dvo.resource_record_value
    }
  ]
}
