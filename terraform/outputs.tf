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
  value       = module.portfolio_cloudfront.distribution_domain_name
}

output "ecommerce_cloudfront_domain" {
  description = "CloudFront domain for E-Commerce application"
  value       = module.ecommerce_cloudfront.distribution_domain_name
}

output "ats_cloudfront_domain" {
  description = "CloudFront domain for ATS application"
  value       = module.ats_cloudfront.distribution_domain_name
}

# CloudFront Distribution IDs (for cache invalidation)
output "portfolio_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for Portfolio application"
  value       = module.portfolio_cloudfront.distribution_id
}

output "ecommerce_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for E-Commerce application"
  value       = module.ecommerce_cloudfront.distribution_id
}

output "ats_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for ATS application"
  value       = module.ats_cloudfront.distribution_id
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
  value       = module.portfolio_lambda.function_arn
}

output "ecommerce_lambda_arn" {
  description = "ARN of E-Commerce Lambda function"
  value       = module.ecommerce_lambda.function_arn
}

output "ats_lambda_arn" {
  description = "ARN of ATS Lambda function"
  value       = module.ats_lambda.function_arn
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
  value       = module.cloudfront_waf.web_acl_arn
}

output "website_url" {
  description = "URL of the deployed website"
  value       = "https://${var.domain_name}"
}

output "github_actions_role_arn" {
  description = "ARN of the IAM role for GitHub Actions OIDC"
  value       = aws_iam_role.github_actions.arn
}
