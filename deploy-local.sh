#!/bin/bash
set -e

echo "🚀 Starting local deployment to AWS..."

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Step 1: Build images
echo "📦 Step 1/7: Building Docker images..."
docker compose build --no-cache

# Step 2: Tag images for ECR
echo "🏷️  Step 2/7: Tagging images for ECR..."
docker tag myportfoliowebsite-backend:latest ${ECR_REGISTRY}/portfolio-backend:latest
docker tag myportfoliowebsite-frontend:latest ${ECR_REGISTRY}/portfolio-frontend:latest
docker tag myportfoliowebsite-ecommerce-backend:latest ${ECR_REGISTRY}/ecommerce-backend:latest
docker tag myportfoliowebsite-ecommerce-frontend:latest ${ECR_REGISTRY}/ecommerce-frontend:latest
docker tag myportfoliowebsite-ecommerce-db:latest ${ECR_REGISTRY}/ecommerce-db:latest

# Step 3: Login to ECR
echo "🔐 Step 3/7: Logging into AWS ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Step 4: Push portfolio images
echo "⬆️  Step 4/7: Pushing portfolio images to ECR..."
docker push ${ECR_REGISTRY}/portfolio-backend:latest
docker push ${ECR_REGISTRY}/portfolio-frontend:latest

# Step 5: Push e-commerce images
echo "⬆️  Step 5/7: Pushing e-commerce images to ECR..."
docker push ${ECR_REGISTRY}/ecommerce-backend:latest
docker push ${ECR_REGISTRY}/ecommerce-frontend:latest
docker push ${ECR_REGISTRY}/ecommerce-db:latest

# Step 6: Deploy to ECS
echo "🚢 Step 6/7: Deploying to AWS ECS..."
aws ecs update-service --cluster prod-portfolio-cluster --service prod-portfolio-backend --force-new-deployment --region ${AWS_REGION}
aws ecs update-service --cluster prod-portfolio-cluster --service prod-portfolio-frontend --force-new-deployment --region ${AWS_REGION}
aws ecs update-service --cluster prod-portfolio-cluster --service prod-ecommerce-backend --force-new-deployment --region ${AWS_REGION}
aws ecs update-service --cluster prod-portfolio-cluster --service prod-ecommerce-frontend --force-new-deployment --region ${AWS_REGION}

# Step 7: Wait for deployment
echo "⏳ Step 7/7: Waiting for services to stabilize..."
aws ecs wait services-stable --cluster prod-portfolio-cluster --services prod-portfolio-backend prod-portfolio-frontend --region ${AWS_REGION}
aws ecs wait services-stable --cluster prod-portfolio-cluster --services prod-ecommerce-backend prod-ecommerce-frontend --region ${AWS_REGION}

# Verify
echo "✅ Deployment complete! Verifying..."
curl -I https://clarkfoster.com
curl -I https://shop.clarkfoster.com

echo ""
echo "🎉 Deployment successful!"
echo "🌐 Portfolio is live at: https://clarkfoster.com"
echo "🛒 E-Commerce is live at: https://shop.clarkfoster.com"
