#!/bin/bash
# Rotate ALL secrets in AWS Secrets Manager after potential exposure
# This script generates new random values for sensitive secrets and prompts for others

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

REGION="us-east-1"

echo -e "${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║          SECRET ROTATION - SECURITY REMEDIATION               ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check AWS credentials
echo -e "${BLUE}Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✓ Authenticated to AWS Account: $ACCOUNT_ID${NC}"
echo ""

# Function to rotate a secret with a new random value
rotate_secret_random() {
    local secret_name=$1
    local length=${2:-32}
    local description=$3
    
    echo -e "${YELLOW}Rotating $secret_name with new random value...${NC}"
    
    NEW_VALUE=$(openssl rand -base64 $length | tr -d '\n')
    
    if aws secretsmanager put-secret-value \
        --secret-id "$secret_name" \
        --secret-string "$NEW_VALUE" \
        --region "$REGION" &> /dev/null; then
        echo -e "${GREEN}✓ Rotated: $secret_name${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to rotate: $secret_name${NC}"
        return 1
    fi
}

# Function to rotate a secret with user input
rotate_secret_prompt() {
    local secret_name=$1
    local prompt_text=$2
    
    echo -e "${YELLOW}$prompt_text${NC}"
    read -s -p "Enter new value: " NEW_VALUE
    echo ""
    
    if [ -z "$NEW_VALUE" ]; then
        echo -e "${YELLOW}⊘ Skipped: $secret_name (no value provided)${NC}"
        return 0
    fi
    
    if aws secretsmanager put-secret-value \
        --secret-id "$secret_name" \
        --secret-string "$NEW_VALUE" \
        --region "$REGION" &> /dev/null; then
        echo -e "${GREEN}✓ Rotated: $secret_name${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to rotate: $secret_name${NC}"
        return 1
    fi
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 1: Rotating auto-generated secrets (JWT, passwords)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Rotate JWT Secret (critical - auto-generate new one)
rotate_secret_random "portfolio/jwt-secret" 64 "JWT signing secret"

# Rotate Admin Password (auto-generate strong password)
echo ""
echo -e "${YELLOW}Rotating admin password...${NC}"
NEW_ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
if aws secretsmanager put-secret-value \
    --secret-id "portfolio/admin-password" \
    --secret-string "$NEW_ADMIN_PASSWORD" \
    --region "$REGION" &> /dev/null; then
    echo -e "${GREEN}✓ Rotated: portfolio/admin-password${NC}"
    echo -e "${YELLOW}  ⚠ NEW ADMIN PASSWORD: $NEW_ADMIN_PASSWORD${NC}"
    echo -e "${YELLOW}  ⚠ Save this password securely! It won't be shown again.${NC}"
else
    echo -e "${RED}✗ Failed to rotate: portfolio/admin-password${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 2: User-provided secrets (press Enter to skip)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Admin email (might want to keep the same)
echo -e "${YELLOW}Do you want to change the admin email? (current value will be kept if skipped)${NC}"
rotate_secret_prompt "portfolio/admin-email" "Enter new admin email (or press Enter to skip):"

# Admin username
echo ""
rotate_secret_prompt "portfolio/admin-username" "Enter new admin username (or press Enter to skip):"

# Admin fullname
echo ""
rotate_secret_prompt "portfolio/admin-fullname" "Enter new admin full name (or press Enter to skip):"

# Contact email
echo ""
rotate_secret_prompt "portfolio/contact-email" "Enter new contact email (or press Enter to skip):"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 3: Email/SMTP credentials${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}If your SMTP credentials were exposed, you should regenerate them${NC}"
echo -e "${YELLOW}in your email provider's console first, then enter them here.${NC}"
echo ""

rotate_secret_prompt "portfolio/mail-username" "Enter new mail username (or press Enter to skip):"
echo ""
rotate_secret_prompt "portfolio/mail-password" "Enter new mail password (or press Enter to skip):"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 4: Restarting ECS services to pick up new secrets${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}Restarting backend service...${NC}"
if aws ecs update-service \
    --cluster prod-portfolio-cluster \
    --service prod-portfolio-backend \
    --force-new-deployment \
    --region "$REGION" &> /dev/null; then
    echo -e "${GREEN}✓ Backend service restart initiated${NC}"
else
    echo -e "${RED}✗ Failed to restart backend service${NC}"
fi

echo -e "${YELLOW}Restarting frontend service...${NC}"
if aws ecs update-service \
    --cluster prod-portfolio-cluster \
    --service prod-portfolio-frontend \
    --force-new-deployment \
    --region "$REGION" &> /dev/null; then
    echo -e "${GREEN}✓ Frontend service restart initiated${NC}"
else
    echo -e "${RED}✗ Failed to restart frontend service${NC}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              SECRET ROTATION COMPLETE                         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Save the new admin password securely"
echo -e "  2. Wait 2-3 minutes for ECS services to restart"
echo -e "  3. Test your application login"
echo -e "  4. If you changed email credentials, verify email sending works"
echo ""
