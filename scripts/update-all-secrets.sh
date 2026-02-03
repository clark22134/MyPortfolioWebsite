#!/bin/bash
# Update email secrets from .env file
set -e

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "Error: AWS credentials not configured"
    exit 1
fi

echo "Setting email secrets from .env file..."

# Source .env file
if [ -f ".env" ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi

# Set email secrets
aws secretsmanager put-secret-value \
    --secret-id "portfolio/mail-username" \
    --secret-string "$MAIL_USERNAME" \
    --region us-east-1 > /dev/null

aws secretsmanager put-secret-value \
    --secret-id "portfolio/mail-password" \
    --secret-string "$MAIL_PASSWORD" \
    --region us-east-1 > /dev/null

aws secretsmanager put-secret-value \
    --secret-id "portfolio/contact-email" \
    --secret-string "clark@clarkfoster.com" \
    --region us-east-1 > /dev/null

# Generate and set JWT secret
JWT_SECRET=$(openssl rand -base64 32)
aws secretsmanager put-secret-value \
    --secret-id "portfolio/jwt-secret" \
    --secret-string "$JWT_SECRET" \
    --region us-east-1 > /dev/null

echo "✓ All email and JWT secrets updated successfully"

echo ""
echo "Now restarting ECS services to pick up new secrets..."