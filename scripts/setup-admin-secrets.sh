#!/bin/bash
# Setup admin secrets in AWS Secrets Manager

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Setting up Admin Secrets in AWS Secrets Manager ===${NC}"
echo ""

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    exit 1
fi

echo -e "${GREEN}✓ AWS credentials valid${NC}"
echo ""

# Function to set or update a secret
set_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    echo -e "${YELLOW}Setting $secret_name...${NC}"
    
    # Try to create the secret first
    if aws secretsmanager create-secret \
        --name "$secret_name" \
        --description "$description" \
        --secret-string "$secret_value" \
        --region us-east-1 &> /dev/null; then
        echo -e "${GREEN}✓ Created secret: $secret_name${NC}"
    else
        # If creation fails, update the existing secret
        if aws secretsmanager put-secret-value \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --region us-east-1 &> /dev/null; then
            echo -e "${GREEN}✓ Updated secret: $secret_name${NC}"
        else
            echo -e "${RED}✗ Failed to set secret: $secret_name${NC}"
            return 1
        fi
    fi
}

# Read values from .env file
if [ -f ".env" ]; then
    echo "Reading admin credentials from .env file..."
    source .env
    
    if [ -z "$ADMIN_USERNAME" ] || [ -z "$ADMIN_PASSWORD" ] || [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_FULLNAME" ]; then
        echo -e "${RED}Error: Missing admin credentials in .env file${NC}"
        echo "Please ensure .env file contains:"
        echo "  ADMIN_USERNAME=..."
        echo "  ADMIN_PASSWORD=..."
        echo "  ADMIN_EMAIL=..."
        echo "  ADMIN_FULLNAME=..."
        exit 1
    fi
    
    # Set admin secrets
    set_secret "portfolio/admin-username" "$ADMIN_USERNAME" "Portfolio admin username"
    set_secret "portfolio/admin-password" "$ADMIN_PASSWORD" "Portfolio admin password"
    set_secret "portfolio/admin-email" "$ADMIN_EMAIL" "Portfolio admin email"
    set_secret "portfolio/admin-fullname" "$ADMIN_FULLNAME" "Portfolio admin full name"
    
else
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please ensure .env file exists with admin credentials"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Admin Secrets Setup Complete ===${NC}"
echo ""
echo "Admin secrets have been securely stored in AWS Secrets Manager:"
echo "  • portfolio/admin-username"
echo "  • portfolio/admin-password" 
echo "  • portfolio/admin-email"
echo "  • portfolio/admin-fullname"
echo ""
echo "Login credentials for https://clarkfoster.com/login:"
echo "  Username: $ADMIN_USERNAME"
echo "  Password: [stored in AWS Secrets Manager]"
echo ""
echo "Ready to deploy with: ./scripts/deploy-to-aws.sh"