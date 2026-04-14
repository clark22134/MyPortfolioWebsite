#!/bin/bash
# Manual deployment to AWS Lambda + S3 + CloudFront
# Usage: ./deploy-aws-serverless.sh [--backends-only|--frontends-only|--skip-build]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

AWS_REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)

if [ -z "$ACCOUNT_ID" ]; then
  echo -e "${RED}Error: AWS CLI not configured or unable to get account ID${NC}"
  exit 1
fi

if [ ! -f "docker-compose.yml" ]; then
  echo -e "${RED}Error: Run this script from the project root${NC}"
  exit 1
fi

LAMBDA_BUCKET="prod-lambda-deployments-${ACCOUNT_ID}"
PORTFOLIO_BUCKET="prod-portfolio-frontend-${ACCOUNT_ID}"
ECOMMERCE_BUCKET="prod-ecommerce-frontend-${ACCOUNT_ID}"
ATS_BUCKET="prod-ats-frontend-${ACCOUNT_ID}"

DEPLOY_BACKENDS=true
DEPLOY_FRONTENDS=true
SKIP_BUILD=false

for arg in "$@"; do
  case $arg in
    --backends-only)  DEPLOY_FRONTENDS=false ;;
    --frontends-only) DEPLOY_BACKENDS=false ;;
    --skip-build)     SKIP_BUILD=true ;;
    --help)
      echo "Usage: $0 [--backends-only|--frontends-only|--skip-build]"
      exit 0
      ;;
  esac
done

echo "==================================="
echo "  AWS Serverless Deployment"
echo "==================================="
echo "Account: ${ACCOUNT_ID} | Region: ${AWS_REGION}"
echo ""

# ── Backend Lambdas ──────────────────────────────────────────────
if [ "$DEPLOY_BACKENDS" = true ]; then
  if [ "$SKIP_BUILD" = false ]; then
    echo -e "${YELLOW}Building backend JARs...${NC}"
    (cd portfolio-backend && mvn clean package -DskipTests -q)
    (cd ecommerce-backend && mvn clean package -DskipTests -q)
    (cd ats-backend && mvn clean package -DskipTests -q)
    echo -e "${GREEN}Backend JARs built${NC}"
  fi

  echo -e "${YELLOW}Uploading JARs to S3 and updating Lambda functions...${NC}"

  deploy_lambda() {
    local func_name=$1 jar_path=$2 s3_key=$3
    aws s3 cp "$jar_path" "s3://${LAMBDA_BUCKET}/${s3_key}" --region "$AWS_REGION" --only-show-errors
    aws lambda update-function-code \
      --function-name "$func_name" \
      --s3-bucket "$LAMBDA_BUCKET" \
      --s3-key "$s3_key" \
      --region "$AWS_REGION" \
      --output text --query 'FunctionArn' > /dev/null
  }

  deploy_lambda "prod-portfolio-backend" \
    "portfolio-backend/target/portfolio-backend-1.0.0.jar" "portfolio-backend.jar"
  deploy_lambda "prod-ecommerce-backend" \
    "ecommerce-backend/target/spring-boot-ecommerce-0.0.1-SNAPSHOT.jar" "ecommerce-backend.jar"
  deploy_lambda "prod-ats-backend" \
    "ats-backend/target/ats-backend-0.0.1-SNAPSHOT.jar" "ats-backend.jar"

  echo -e "${YELLOW}Waiting for Lambda updates...${NC}"
  for func in prod-portfolio-backend prod-ecommerce-backend prod-ats-backend; do
    aws lambda wait function-updated --function-name "$func" --region "$AWS_REGION"
  done

  echo -e "${YELLOW}Publishing SnapStart versions...${NC}"
  for func in prod-portfolio-backend prod-ecommerce-backend prod-ats-backend; do
    VERSION=$(aws lambda publish-version --function-name "$func" \
      --region "$AWS_REGION" --query 'Version' --output text)
    aws lambda update-alias --function-name "$func" --name current \
      --function-version "$VERSION" --region "$AWS_REGION" > /dev/null 2>&1 || true
    echo -e "  ${GREEN}${func} -> v${VERSION}${NC}"
  done
  echo -e "${GREEN}Lambda functions deployed${NC}"
fi

# ── Frontend S3 + CloudFront ─────────────────────────────────────
if [ "$DEPLOY_FRONTENDS" = true ]; then
  if [ "$SKIP_BUILD" = false ]; then
    echo -e "${YELLOW}Building frontends...${NC}"
    (cd portfolio-frontend && npm ci --silent && npm run build -- --configuration production)
    (cd ecommerce-frontend && npm ci --silent && npm run build -- --configuration production)
    (cd ats-frontend && npm ci --silent && npm run build -- --configuration production)
    echo -e "${GREEN}Frontends built${NC}"
  fi

  echo -e "${YELLOW}Syncing frontends to S3...${NC}"

  sync_frontend() {
    local src=$1 bucket=$2 name=$3
    aws s3 sync "$src" "s3://${bucket}/" --delete \
      --cache-control "public,max-age=31536000,immutable" \
      --exclude "index.html" --exclude "*.json" \
      --region "$AWS_REGION" --only-show-errors
    aws s3 cp "${src}/index.html" "s3://${bucket}/index.html" \
      --cache-control "public,max-age=0,must-revalidate" \
      --region "$AWS_REGION" --only-show-errors
    echo -e "  ${GREEN}${name} -> s3://${bucket}/${NC}"
  }

  sync_frontend "portfolio-frontend/dist/portfolio-frontend/browser" "$PORTFOLIO_BUCKET" "Portfolio"
  sync_frontend "ecommerce-frontend/dist/angular-ecommerce/browser" "$ECOMMERCE_BUCKET" "E-Commerce"
  sync_frontend "ats-frontend/dist/ats-frontend/browser" "$ATS_BUCKET" "ATS"

  echo -e "${YELLOW}Invalidating CloudFront caches...${NC}"
  for DOMAIN in "clarkfoster.com" "shop.clarkfoster.com" "ats.clarkfoster.com"; do
    DIST_ID=$(aws cloudfront list-distributions \
      --query "DistributionList.Items[?Aliases.Items[?@=='${DOMAIN}']].Id" \
      --output text 2>/dev/null)
    if [ -n "$DIST_ID" ] && [ "$DIST_ID" != "None" ]; then
      aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" \
        --output text --query 'Invalidation.Id' > /dev/null
      echo -e "  ${GREEN}${DOMAIN} (${DIST_ID})${NC}"
    else
      echo -e "  ${RED}No distribution found for ${DOMAIN}${NC}"
    fi
  done
  echo -e "${GREEN}Frontends deployed${NC}"
fi

echo ""
echo -e "${GREEN}==================================="
echo "  Deployment Complete!"
echo -e "===================================${NC}"
echo ""
echo "  Portfolio:   https://clarkfoster.com"
echo "  E-Commerce:  https://shop.clarkfoster.com"
echo "  ATS:         https://ats.clarkfoster.com"
