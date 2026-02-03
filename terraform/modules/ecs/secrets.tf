# Email Secrets for Contact Form
resource "aws_secretsmanager_secret" "mail_username" {
  name        = "portfolio/mail-username"
  description = "Gmail username for contact form"

  tags = {
    Name        = "portfolio-mail-username"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret" "mail_password" {
  name        = "portfolio/mail-password"
  description = "Gmail app password for contact form"

  tags = {
    Name        = "portfolio-mail-password"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret" "contact_email" {
  name        = "portfolio/contact-email"
  description = "Email address to receive contact form submissions"

  tags = {
    Name        = "portfolio-contact-email"
    Environment = var.environment
  }
}

# Admin Secrets
resource "aws_secretsmanager_secret" "admin_username" {
  name        = "portfolio/admin-username"
  description = "Admin username for portfolio application"

  tags = {
    Name        = "portfolio-admin-username"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret" "admin_password" {
  name        = "portfolio/admin-password"
  description = "Admin password for portfolio application"

  tags = {
    Name        = "portfolio-admin-password"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret" "admin_email" {
  name        = "portfolio/admin-email"
  description = "Admin email for portfolio application"

  tags = {
    Name        = "portfolio-admin-email"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret" "admin_fullname" {
  name        = "portfolio/admin-fullname"
  description = "Admin full name for portfolio application"

  tags = {
    Name        = "portfolio-admin-fullname"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "portfolio/jwt-secret"
  description = "JWT secret key for portfolio application"

  tags = {
    Name        = "portfolio-jwt-secret"
    Environment = var.environment
  }
}
# Output the secret ARNs for use in task definition
output "mail_username_arn" {
  value       = aws_secretsmanager_secret.mail_username.arn
  description = "ARN of mail username secret"
}

output "mail_password_arn" {
  value       = aws_secretsmanager_secret.mail_password.arn
  description = "ARN of mail password secret"
}

output "contact_email_arn" {
  value       = aws_secretsmanager_secret.contact_email.arn
  description = "ARN of contact email secret"
}

output "admin_username_arn" {
  value       = aws_secretsmanager_secret.admin_username.arn
  description = "ARN of admin username secret"
}

output "admin_password_arn" {
  value       = aws_secretsmanager_secret.admin_password.arn
  description = "ARN of admin password secret"
}

output "admin_email_arn" {
  value       = aws_secretsmanager_secret.admin_email.arn
  description = "ARN of admin email secret"
}

output "admin_fullname_arn" {
  value       = aws_secretsmanager_secret.admin_fullname.arn
  description = "ARN of admin full name secret"
}

output "jwt_secret_arn" {
  value       = aws_secretsmanager_secret.jwt_secret.arn
  description = "ARN of JWT secret"
}
