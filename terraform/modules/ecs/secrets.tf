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
