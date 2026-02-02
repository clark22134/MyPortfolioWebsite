# Email Configuration with AWS Secrets Manager

## Overview
This portfolio uses AWS Secrets Manager to securely store email credentials for the contact form. Secrets are encrypted at rest and in transit, and are never stored in plain text in source code.

## Architecture
- **Local Development**: Uses `.env` file (gitignored)
- **Production (AWS ECS)**: Uses AWS Secrets Manager
- **Security**: ECS Task Execution Role has permissions to read secrets

## Setup for Production

### 1. Create Secrets in AWS

Run the setup script:
```bash
./scripts/setup-email-secrets.sh
```

Or manually create secrets using AWS CLI:
```bash
# Mail username (Gmail address)
aws secretsmanager create-secret \
  --name portfolio/mail-username \
  --description "Gmail username for contact form" \
  --secret-string "your-email@gmail.com"

# Mail password (Gmail App Password)
aws secretsmanager create-secret \
  --name portfolio/mail-password \
  --description "Gmail app password for contact form" \
  --secret-string "your_16_char_app_password"

# Contact email (where messages are sent)
aws secretsmanager create-secret \
  --name portfolio/contact-email \
  --description "Email to receive contact submissions" \
  --secret-string "clark@clarkfoster.com"
```

### 2. Get Gmail App Password

1. Go to https://myaccount.google.com/security
2. Enable 2-Factor Authentication (required)
3. Go to **App Passwords**
4. Create a new app password for "Mail"
5. Copy the 16-character password (no spaces)
6. Use this as your `MAIL_PASSWORD` secret value

### 3. Deploy Infrastructure

```bash
cd terraform
terraform plan
terraform apply
```

### 4. Verify Secrets Are Working

After deploying to ECS:
```bash
# Check ECS task logs
aws logs tail /ecs/prod/portfolio-backend --follow

# Test the contact form through your website
# Check that email arrives at your inbox
```

## Security Best Practices

✅ **Do**:
- Use Gmail App Passwords (not your main password)
- Rotate secrets regularly (every 90 days)
- Use separate secrets for dev/staging/prod
- Monitor CloudWatch Logs for errors
- Keep `.env` in `.gitignore`

❌ **Don't**:
- Commit secrets to Git
- Share `.env` files
- Use your main Gmail password
- Store secrets in plain text anywhere
- Log secret values in application code

## Secret Rotation

To rotate a secret:
```bash
# Generate new Gmail app password first
aws secretsmanager put-secret-value \
  --secret-id portfolio/mail-password \
  --secret-string "new_app_password_here"

# Force ECS to redeploy with new secret
aws ecs update-service \
  --cluster prod-portfolio-cluster \
  --service portfolio-backend \
  --force-new-deployment
```

## Troubleshooting

### Contact form not sending emails
1. Check CloudWatch Logs for errors
2. Verify secrets exist: `aws secretsmanager list-secrets`
3. Check IAM permissions on ECS Task Execution Role
4. Verify Gmail App Password is valid
5. Check Spring Boot email configuration

### Permission errors
```bash
# Check ECS Task Execution Role has secretsmanager permissions
aws iam get-role-policy \
  --role-name prod-portfolio-ecs-task-execution \
  --policy-name prod-ecs-secrets-policy
```

## Cost
- AWS Secrets Manager: $0.40/secret/month
- Total for 3 secrets: ~$1.20/month
- API calls: $0.05 per 10,000 calls (negligible)

## References
- [AWS Secrets Manager Pricing](https://aws.amazon.com/secrets-manager/pricing/)
- [ECS Secrets Documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
