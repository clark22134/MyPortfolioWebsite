#!/bin/bash
set -e

echo "🚀 Starting local deployment to AWS..."

# Step 1: Build images
echo "📦 Step 1/7: Building Docker images..."
docker compose build

# Step 2: Tag images for ECR
echo "🏷️  Step 2/7: Tagging images for ECR..."
docker tag myportfoliowebsite-backend:latest 010438493245.dkr.ecr.us-east-1.amazonaws.com/portfolio-backend:latest
docker tag myportfoliowebsite-frontend:latest 010438493245.dkr.ecr.us-east-1.amazonaws.com/portfolio-frontend:latest

# Step 3: Login to ECR
echo "🔐 Step 3/7: Logging into AWS ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 010438493245.dkr.ecr.us-east-1.amazonaws.com

# Step 4: Push backend image
echo "⬆️  Step 4/7: Pushing backend image to ECR..."
docker push 010438493245.dkr.ecr.us-east-1.amazonaws.com/portfolio-backend:latest

# Step 5: Push frontend image
echo "⬆️  Step 5/7: Pushing frontend image to ECR..."
docker push 010438493245.dkr.ecr.us-east-1.amazonaws.com/portfolio-frontend:latest

# Step 6: Deploy to ECS
echo "🚢 Step 6/7: Deploying to AWS ECS..."
aws ecs update-service --cluster prod-portfolio-cluster --service prod-portfolio-backend --force-new-deployment --region us-east-1
aws ecs update-service --cluster prod-portfolio-cluster --service prod-portfolio-frontend --force-new-deployment --region us-east-1

# Step 7: Wait for deployment
echo "⏳ Step 7/7: Waiting for services to stabilize..."
aws ecs wait services-stable --cluster prod-portfolio-cluster --services prod-portfolio-backend prod-portfolio-frontend --region us-east-1

# Verify
echo "✅ Deployment complete! Verifying..."
curl -I https://clarkfoster.com

echo ""
echo "🎉 Deployment successful!"
echo "🌐 Your site is live at: https://clarkfoster.com"
