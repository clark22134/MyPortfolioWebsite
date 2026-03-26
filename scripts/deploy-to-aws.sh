#!/bin/bash
# Manual deployment script for AWS ECS
# Follows the same process as deploy-production.yml GitHub Action

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== AWS ECS Manual Deployment ===${NC}"
echo ""

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
BACKEND_REPO="portfolio-backend"
FRONTEND_REPO="portfolio-frontend"
ECOM_BACKEND_REPO="ecommerce-backend"
ECOM_FRONTEND_REPO="ecommerce-frontend"
ECOM_DB_REPO="ecommerce-db"
ECS_CLUSTER="prod-portfolio-cluster"
BACKEND_SERVICE="prod-portfolio-backend"
FRONTEND_SERVICE="prod-portfolio-frontend"
ECOM_BACKEND_SERVICE="prod-ecommerce-backend"
ECOM_FRONTEND_SERVICE="prod-ecommerce-frontend"
IMAGE_TAG="deploy-$(date +%s)"

echo "AWS Account: ${AWS_ACCOUNT_ID}"
echo "Region: ${AWS_REGION}"
echo "ECR Registry: ${ECR_REGISTRY}"
echo "Image Tag: ${IMAGE_TAG}"
echo ""

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    exit 1
fi
echo -e "${GREEN}✓ AWS credentials valid${NC}"
echo ""

# Create ECR repositories if they don't exist
echo -e "${YELLOW}Setting up ECR repositories...${NC}"
for repo in $BACKEND_REPO $FRONTEND_REPO $ECOM_BACKEND_REPO $ECOM_FRONTEND_REPO $ECOM_DB_REPO; do
    if aws ecr describe-repositories --repository-names $repo --region $AWS_REGION &> /dev/null; then
        echo "✓ Repository $repo exists"
    else
        echo "Creating repository: $repo"
        aws ecr create-repository \
            --repository-name $repo \
            --image-scanning-configuration scanOnPush=true \
            --region $AWS_REGION > /dev/null
        echo "✓ Created $repo"
    fi
done
echo ""

# Login to ECR
echo -e "${YELLOW}Logging into ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin $ECR_REGISTRY
echo -e "${GREEN}✓ Logged in to ECR${NC}"
echo ""

# Build and push backend
echo -e "${YELLOW}Building backend image...${NC}"
cd backend
docker build --build-arg GIT_COMMIT=$IMAGE_TAG -t $ECR_REGISTRY/$BACKEND_REPO:$IMAGE_TAG .
echo -e "${GREEN}✓ Backend image built${NC}"
echo ""

echo -e "${YELLOW}Pushing backend to ECR...${NC}"
docker push $ECR_REGISTRY/$BACKEND_REPO:$IMAGE_TAG
BACKEND_IMAGE="$ECR_REGISTRY/$BACKEND_REPO:$IMAGE_TAG"
echo -e "${GREEN}✓ Backend pushed: $BACKEND_IMAGE${NC}"
echo ""

# Build and push frontend
cd ../frontend
echo -e "${YELLOW}Building frontend image...${NC}"
docker build -t $ECR_REGISTRY/$FRONTEND_REPO:$IMAGE_TAG .
echo -e "${GREEN}✓ Frontend image built${NC}"
echo ""

echo -e "${YELLOW}Pushing frontend to ECR...${NC}"
docker push $ECR_REGISTRY/$FRONTEND_REPO:$IMAGE_TAG
FRONTEND_IMAGE="$ECR_REGISTRY/$FRONTEND_REPO:$IMAGE_TAG"
echo -e "${GREEN}✓ Frontend pushed: $FRONTEND_IMAGE${NC}"
echo ""

# Build and push e-commerce backend
cd ../ecommerce-backend
echo -e "${YELLOW}Building e-commerce backend image...${NC}"
docker build --build-arg GIT_COMMIT=$IMAGE_TAG -t $ECR_REGISTRY/$ECOM_BACKEND_REPO:$IMAGE_TAG .
echo -e "${GREEN}✓ E-commerce backend image built${NC}"
echo ""

echo -e "${YELLOW}Pushing e-commerce backend to ECR...${NC}"
docker push $ECR_REGISTRY/$ECOM_BACKEND_REPO:$IMAGE_TAG
ECOM_BACKEND_IMAGE="$ECR_REGISTRY/$ECOM_BACKEND_REPO:$IMAGE_TAG"
echo -e "${GREEN}✓ E-commerce backend pushed: $ECOM_BACKEND_IMAGE${NC}"
echo ""

# Build and push e-commerce frontend
cd ../ecommerce-frontend
echo -e "${YELLOW}Building e-commerce frontend image...${NC}"
docker build -t $ECR_REGISTRY/$ECOM_FRONTEND_REPO:$IMAGE_TAG .
echo -e "${GREEN}✓ E-commerce frontend image built${NC}"
echo ""

echo -e "${YELLOW}Pushing e-commerce frontend to ECR...${NC}"
docker push $ECR_REGISTRY/$ECOM_FRONTEND_REPO:$IMAGE_TAG
ECOM_FRONTEND_IMAGE="$ECR_REGISTRY/$ECOM_FRONTEND_REPO:$IMAGE_TAG"
echo -e "${GREEN}✓ E-commerce frontend pushed: $ECOM_FRONTEND_IMAGE${NC}"
echo ""

# Build and push e-commerce DB
cd ../ecommerce-db
echo -e "${YELLOW}Building e-commerce DB image...${NC}"
docker build -t $ECR_REGISTRY/$ECOM_DB_REPO:$IMAGE_TAG .
echo -e "${GREEN}✓ E-commerce DB image built${NC}"
echo ""

echo -e "${YELLOW}Pushing e-commerce DB to ECR...${NC}"
docker push $ECR_REGISTRY/$ECOM_DB_REPO:$IMAGE_TAG
ECOM_DB_IMAGE="$ECR_REGISTRY/$ECOM_DB_REPO:$IMAGE_TAG"
echo -e "${GREEN}✓ E-commerce DB pushed: $ECOM_DB_IMAGE${NC}"
echo ""

cd ..

# Check if ECS cluster exists
echo -e "${YELLOW}Checking ECS cluster...${NC}"
if ! aws ecs describe-clusters --clusters $ECS_CLUSTER --region $AWS_REGION --query 'clusters[0].status' --output text 2>&1 | grep -q "ACTIVE"; then
    echo -e "${RED}Error: ECS cluster $ECS_CLUSTER not found or not active${NC}"
    echo "Run 'terraform apply' to create infrastructure first."
    exit 1
fi
echo -e "${GREEN}✓ ECS cluster is active${NC}"
echo ""

# Deploy backend
echo -e "${YELLOW}Deploying backend...${NC}"
BACKEND_TASK_DEF=$(aws ecs describe-task-definition \
    --task-definition prod-portfolio-backend \
    --region $AWS_REGION)

NEW_BACKEND_TASK_DEF=$(echo $BACKEND_TASK_DEF | jq --arg IMAGE "$BACKEND_IMAGE" \
    '.taskDefinition | .containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

BACKEND_REVISION=$(aws ecs register-task-definition \
    --cli-input-json "$NEW_BACKEND_TASK_DEF" \
    --region $AWS_REGION \
    --query 'taskDefinition.revision' \
    --output text)

echo "✓ Registered backend task definition revision: $BACKEND_REVISION"

# Deploy frontend
echo -e "${YELLOW}Deploying frontend...${NC}"
FRONTEND_TASK_DEF=$(aws ecs describe-task-definition \
    --task-definition prod-portfolio-frontend \
    --region $AWS_REGION)

NEW_FRONTEND_TASK_DEF=$(echo $FRONTEND_TASK_DEF | jq --arg IMAGE "$FRONTEND_IMAGE" \
    '.taskDefinition | .containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

FRONTEND_REVISION=$(aws ecs register-task-definition \
    --cli-input-json "$NEW_FRONTEND_TASK_DEF" \
    --region $AWS_REGION \
    --query 'taskDefinition.revision' \
    --output text)

echo "✓ Registered frontend task definition revision: $FRONTEND_REVISION"

# Deploy e-commerce backend
echo -e "${YELLOW}Deploying e-commerce backend...${NC}"
ECOM_BACKEND_TASK_DEF=$(aws ecs describe-task-definition \
    --task-definition prod-ecommerce-backend \
    --region $AWS_REGION)

NEW_ECOM_BACKEND_TASK_DEF=$(echo $ECOM_BACKEND_TASK_DEF | jq --arg IMAGE "$ECOM_BACKEND_IMAGE" --arg DBIMAGE "$ECOM_DB_IMAGE" \
    '.taskDefinition | .containerDefinitions = [(.containerDefinitions[] | if .name == "ecommerce-backend" then .image = $IMAGE elif .name == "ecommerce-db" then .image = $DBIMAGE else . end)] | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

ECOM_BACKEND_REVISION=$(aws ecs register-task-definition \
    --cli-input-json "$NEW_ECOM_BACKEND_TASK_DEF" \
    --region $AWS_REGION \
    --query 'taskDefinition.revision' \
    --output text)

echo "✓ Registered e-commerce backend task definition revision: $ECOM_BACKEND_REVISION"

# Deploy e-commerce frontend
echo -e "${YELLOW}Deploying e-commerce frontend...${NC}"
ECOM_FRONTEND_TASK_DEF=$(aws ecs describe-task-definition \
    --task-definition prod-ecommerce-frontend \
    --region $AWS_REGION)

NEW_ECOM_FRONTEND_TASK_DEF=$(echo $ECOM_FRONTEND_TASK_DEF | jq --arg IMAGE "$ECOM_FRONTEND_IMAGE" \
    '.taskDefinition | .containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

ECOM_FRONTEND_REVISION=$(aws ecs register-task-definition \
    --cli-input-json "$NEW_ECOM_FRONTEND_TASK_DEF" \
    --region $AWS_REGION \
    --query 'taskDefinition.revision' \
    --output text)

echo "✓ Registered e-commerce frontend task definition revision: $ECOM_FRONTEND_REVISION"
echo ""

# Update services
echo -e "${YELLOW}Updating ECS services...${NC}"
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $BACKEND_SERVICE \
    --task-definition prod-portfolio-backend:$BACKEND_REVISION \
    --force-new-deployment \
    --region $AWS_REGION > /dev/null &

aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $FRONTEND_SERVICE \
    --task-definition prod-portfolio-frontend:$FRONTEND_REVISION \
    --force-new-deployment \
    --region $AWS_REGION > /dev/null &

aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $ECOM_BACKEND_SERVICE \
    --task-definition prod-ecommerce-backend:$ECOM_BACKEND_REVISION \
    --force-new-deployment \
    --region $AWS_REGION > /dev/null &

aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $ECOM_FRONTEND_SERVICE \
    --task-definition prod-ecommerce-frontend:$ECOM_FRONTEND_REVISION \
    --force-new-deployment \
    --region $AWS_REGION > /dev/null &

wait
echo -e "${GREEN}✓ All services updating${NC}"
echo ""

# Wait for backend deployment
echo -e "${YELLOW}Waiting for backend deployment to stabilize...${NC}"
STABLE_COUNT=0
MAX_WAIT=900  # 15 minutes
START_TIME=$(date +%s)

while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    if [ $ELAPSED -gt $MAX_WAIT ]; then
        echo -e "${RED}Deployment timed out after 15 minutes${NC}"
        exit 1
    fi
    
    RUNNING=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --service $BACKEND_SERVICE \
        --region $AWS_REGION \
        --query "services[0].runningCount" \
        --output text)
    
    DESIRED=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --service $BACKEND_SERVICE \
        --region $AWS_REGION \
        --query "services[0].desiredCount" \
        --output text)
    
    DEPLOYMENT_COUNT=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --service $BACKEND_SERVICE \
        --region $AWS_REGION \
        --query "length(services[0].deployments)" \
        --output text)
    
    echo "Backend: $RUNNING/$DESIRED tasks | Active deployments: $DEPLOYMENT_COUNT"
    
    if [ "$RUNNING" = "$DESIRED" ] && [ "$RUNNING" != "0" ]; then
        STABLE_COUNT=$((STABLE_COUNT + 1))
        echo "✓ Stable for ${STABLE_COUNT} checks (need 3)"
        
        if [ $STABLE_COUNT -ge 3 ]; then
            echo -e "${GREEN}✓ Backend deployment completed${NC}"
            break
        fi
    else
        STABLE_COUNT=0
    fi
    
    sleep 10
done
echo ""

# Wait for frontend deployment
echo -e "${YELLOW}Waiting for frontend deployment to stabilize...${NC}"
STABLE_COUNT=0
START_TIME=$(date +%s)

while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    if [ $ELAPSED -gt $MAX_WAIT ]; then
        echo -e "${RED}Deployment timed out after 15 minutes${NC}"
        exit 1
    fi
    
    RUNNING=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --service $FRONTEND_SERVICE \
        --region $AWS_REGION \
        --query "services[0].runningCount" \
        --output text)
    
    DESIRED=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --service $FRONTEND_SERVICE \
        --region $AWS_REGION \
        --query "services[0].desiredCount" \
        --output text)
    
    DEPLOYMENT_COUNT=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --service $FRONTEND_SERVICE \
        --region $AWS_REGION \
        --query "length(services[0].deployments)" \
        --output text)
    
    echo "Frontend: $RUNNING/$DESIRED tasks | Active deployments: $DEPLOYMENT_COUNT"
    
    if [ "$RUNNING" = "$DESIRED" ] && [ "$RUNNING" != "0" ]; then
        STABLE_COUNT=$((STABLE_COUNT + 1))
        echo "✓ Stable for ${STABLE_COUNT} checks (need 3)"
        
        if [ $STABLE_COUNT -ge 3 ]; then
            echo -e "${GREEN}✓ Frontend deployment completed${NC}"
            break
        fi
    else
        STABLE_COUNT=0
    fi
    
    sleep 10
done
echo ""

# Wait for e-commerce backend deployment
echo -e "${YELLOW}Waiting for e-commerce backend deployment to stabilize...${NC}"
STABLE_COUNT=0
START_TIME=$(date +%s)

while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    if [ $ELAPSED -gt $MAX_WAIT ]; then
        echo -e "${RED}Deployment timed out after 15 minutes${NC}"
        exit 1
    fi
    
    RUNNING=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --service $ECOM_BACKEND_SERVICE \
        --region $AWS_REGION \
        --query "services[0].runningCount" \
        --output text)
    
    DESIRED=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --service $ECOM_BACKEND_SERVICE \
        --region $AWS_REGION \
        --query "services[0].desiredCount" \
        --output text)
    
    DEPLOYMENT_COUNT=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --service $ECOM_BACKEND_SERVICE \
        --region $AWS_REGION \
        --query "length(services[0].deployments)" \
        --output text)
    
    echo "E-Commerce Backend: $RUNNING/$DESIRED tasks | Active deployments: $DEPLOYMENT_COUNT"
    
    if [ "$RUNNING" = "$DESIRED" ] && [ "$RUNNING" != "0" ]; then
        STABLE_COUNT=$((STABLE_COUNT + 1))
        echo "✓ Stable for ${STABLE_COUNT} checks (need 3)"
        
        if [ $STABLE_COUNT -ge 3 ]; then
            echo -e "${GREEN}✓ E-commerce backend deployment completed${NC}"
            break
        fi
    else
        STABLE_COUNT=0
    fi
    
    sleep 10
done
echo ""

# Wait for e-commerce frontend deployment
echo -e "${YELLOW}Waiting for e-commerce frontend deployment to stabilize...${NC}"
STABLE_COUNT=0
START_TIME=$(date +%s)

while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    if [ $ELAPSED -gt $MAX_WAIT ]; then
        echo -e "${RED}Deployment timed out after 15 minutes${NC}"
        exit 1
    fi
    
    RUNNING=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --service $ECOM_FRONTEND_SERVICE \
        --region $AWS_REGION \
        --query "services[0].runningCount" \
        --output text)
    
    DESIRED=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --service $ECOM_FRONTEND_SERVICE \
        --region $AWS_REGION \
        --query "services[0].desiredCount" \
        --output text)
    
    DEPLOYMENT_COUNT=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --service $ECOM_FRONTEND_SERVICE \
        --region $AWS_REGION \
        --query "length(services[0].deployments)" \
        --output text)
    
    echo "E-Commerce Frontend: $RUNNING/$DESIRED tasks | Active deployments: $DEPLOYMENT_COUNT"
    
    if [ "$RUNNING" = "$DESIRED" ] && [ "$RUNNING" != "0" ]; then
        STABLE_COUNT=$((STABLE_COUNT + 1))
        echo "✓ Stable for ${STABLE_COUNT} checks (need 3)"
        
        if [ $STABLE_COUNT -ge 3 ]; then
            echo -e "${GREEN}✓ E-commerce frontend deployment completed${NC}"
            break
        fi
    else
        STABLE_COUNT=0
    fi
    
    sleep 10
done
echo ""

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Portfolio Backend Image: $BACKEND_IMAGE"
echo "Portfolio Frontend Image: $FRONTEND_IMAGE"
echo "E-Commerce Backend Image: $ECOM_BACKEND_IMAGE"
echo "E-Commerce Frontend Image: $ECOM_FRONTEND_IMAGE"
echo "E-Commerce DB Image: $ECOM_DB_IMAGE"
echo ""
echo "Your applications are now live at:"
echo "  Portfolio:   https://clarkfoster.com"
echo "  E-Commerce:  https://shop.clarkfoster.com"
echo ""
echo "View logs:"
echo "  aws logs tail /ecs/prod/portfolio-backend --follow"
echo "  aws logs tail /ecs/prod/portfolio-frontend --follow"
echo "  aws logs tail /ecs/prod/ecommerce-backend --follow"
echo "  aws logs tail /ecs/prod/ecommerce-frontend --follow"
echo "  aws logs tail /ecs/prod/ecommerce-db --follow"
