output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.networking.public_subnet_ids
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "domain_name" {
  description = "Domain name"
  value       = var.domain_name
}

output "certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = module.acm.certificate_arn
}

output "certificate_validation_records" {
  description = "DNS validation records for the SSL certificate"
  value       = module.acm.certificate_validation_records
  sensitive   = false
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.ecs_cluster_name
}

output "nameservers" {
  description = "Name servers for Route53 hosted zone"
  value       = module.route53.nameservers
}

output "website_url" {
  description = "URL of the deployed website"
  value       = "https://${var.domain_name}"
}
