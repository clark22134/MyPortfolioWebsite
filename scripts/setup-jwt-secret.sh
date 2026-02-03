#!/bin/bash
# Set JWT secret from a generated value
set -e

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "Error: AWS credentials not configured"
    exit 1
fi

echo "Setting JWT secret..."

# Generate a strong JWT secret (32 random characters)
JWT_SECRET=$(openssl rand -base64 32)

# Set the JWT secret
aws secretsmanager put-secret-value \
    --secret-id "portfolio/jwt-secret" \
    --secret-string "$JWT_SECRET" \
    --region us-east-1 > /dev/null

echo "✓ JWT secret set successfully"

echo ""
echo "All secrets are now configured:"
echo "  • portfolio/admin-username: (from setup-admin-secrets.sh)"
echo "  • portfolio/admin-password: (from setup-admin-secrets.sh)"
echo "  • portfolio/admin-email: (from setup-admin-secrets.sh)"
echo "  • portfolio/admin-fullname: (from setup-admin-secrets.sh)"
echo "  • portfolio/jwt-secret: [GENERATED]"
echo "  • portfolio/mail-username: (from setup-email-secrets.sh)"
echo "  • portfolio/mail-password: (from setup-email-secrets.sh)"
echo "  • portfolio/contact-email: (from setup-email-secrets.sh)"
echo ""
echo "Login at https://clarkfoster.com/login:"