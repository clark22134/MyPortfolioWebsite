output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.networking.public_subnet_ids
}

output "backend_instance_public_ip" {
  description = "Backend EC2 instance public IP"
  value       = module.compute.backend_instance_public_ip
}

output "frontend_instance_public_ip" {
  description = "Frontend EC2 instance public IP"
  value       = module.compute.frontend_instance_public_ip
}

output "load_balancer_dns" {
  description = "Load balancer DNS name"
  value       = module.compute.load_balancer_dns
}
