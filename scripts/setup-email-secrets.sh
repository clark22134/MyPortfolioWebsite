#!/bin/bash
# Script to securely set AWS Secrets Manager values for email configuration

set -e

echo "=== AWS Secrets Manager - Email Configuration Setup ==="
echo ""
echo "This script will create/update secrets in AWS Secrets Manager."
echo "You will be prompted for each secret value."
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "Error: AWS CLI is not configured or credentials are invalid."
    echo "Please run 'aws configure' first."
    exit 1
fi

# Function to set a secret
set_secret() {
    local secret_name=$1
    local secret_description=$2
    local secret_value

    echo ""
    echo "Setting: $secret_description"
    read -sp "Enter value for $secret_name: " secret_value
    echo ""

    if [ -z "$secret_value" ]; then
        echo "Error: Value cannot be empty. Skipping $secret_name."
        return 1
    fi

    # Try to create or update the secret
    if aws secretsmanager describe-secret --secret-id "$secret_name" &> /dev/null; then
        echo "Updating existing secret: $secret_name"
        aws secretsmanager put-secret-value \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --output text > /dev/null
    else
        echo "Creating new secret: $secret_name"
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --description "$secret_description" \
            --secret-string "$secret_value" \
            --output text > /dev/null
    fi

    echo "✓ Successfully set $secret_name"
}

echo "=== Email Credentials ==="
set_secret "portfolio/mail-username" "Gmail username for contact form"
set_secret "portfolio/mail-password" "Gmail app password for contact form"
set_secret "portfolio/contact-email" "Email address to receive contact submissions"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "All email secrets have been securely stored in AWS Secrets Manager."
echo ""
echo "Next steps:"
echo "1. Run 'terraform plan' to see the changes"
echo "2. Run 'terraform apply' to update your ECS task definition"
echo "3. Deploy your backend container to ECS"
echo ""
echo "Note: The secrets are encrypted at rest and in transit."
echo "      ECS will inject them as environment variables at runtime."
