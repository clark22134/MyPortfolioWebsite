output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.networking.private_subnet_ids
}

# CloudFront Distribution URLs
output "portfolio_cloudfront_domain" {
  description = "CloudFront domain for Portfolio application"
  value       = try(module.portfolio_cloudfront[0].distribution_domain_name, null)
}

output "ecommerce_cloudfront_domain" {
  description = "CloudFront domain for E-Commerce application"
  value       = try(module.ecommerce_cloudfront[0].distribution_domain_name, null)
}

output "ats_cloudfront_domain" {
  description = "CloudFront domain for ATS application"
  value       = try(module.ats_cloudfront[0].distribution_domain_name, null)
}

# CloudFront Distribution IDs (for cache invalidation)
output "portfolio_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for Portfolio application"
  value       = try(module.portfolio_cloudfront[0].distribution_id, null)
}

output "ecommerce_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for E-Commerce application"
  value       = try(module.ecommerce_cloudfront[0].distribution_id, null)
}

output "ats_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for ATS application"
  value       = try(module.ats_cloudfront[0].distribution_id, null)
}

# S3 Bucket Names (for frontend deployments)
output "portfolio_s3_bucket_name" {
  description = "S3 bucket name for Portfolio frontend"
  value       = module.portfolio_s3.bucket_id
}

output "ecommerce_s3_bucket_name" {
  description = "S3 bucket name for E-Commerce frontend"
  value       = module.ecommerce_s3.bucket_id
}

output "ats_s3_bucket_name" {
  description = "S3 bucket name for ATS frontend"
  value       = module.ats_s3.bucket_id
}

# Lambda Function ARNs
output "portfolio_lambda_arn" {
  description = "ARN of Portfolio Lambda function"
  value       = try(module.portfolio_lambda[0].function_arn, null)
}

output "ecommerce_lambda_arn" {
  description = "ARN of E-Commerce Lambda function"
  value       = try(module.ecommerce_lambda[0].function_arn, null)
}

output "ats_lambda_arn" {
  description = "ARN of ATS Lambda function"
  value       = try(module.ats_lambda[0].function_arn, null)
}

# Shared Aurora Database Endpoint
output "shared_db_endpoint" {
  description = "Shared Aurora cluster endpoint"
  value       = module.shared_aurora.cluster_endpoint
  sensitive   = true
}

output "domain_name" {
  description = "Domain name"
  value       = var.domain_name
}

output "certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = module.acm.certificate_arn
}

output "waf_acl_arn" {
  description = "ARN of the CloudFront WAF ACL"
  value       = try(module.cloudfront_waf[0].web_acl_arn, null)
}

output "website_url" {
  description = "URL of the deployed website"
  value       = var.website_enabled ? "https://${var.domain_name}" : null
}

output "github_actions_role_arn" {
  description = "ARN of the IAM role for GitHub Actions OIDC"
  value       = aws_iam_role.github_actions.arn
}

output "website_enabled" {
  description = "Whether the running application infrastructure exists."
  value       = var.website_enabled
}
