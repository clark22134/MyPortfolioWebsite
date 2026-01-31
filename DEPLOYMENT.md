# Deployment Guide for clarkfoster.com Portfolio Website

This guide walks you through deploying your portfolio website to AWS using Terraform with ECS Fargate, Application Load Balancer, and your custom domain.

## Prerequisites

1. **AWS Account** with credentials configured
2. **AWS CLI** installed and configured
3. **Terraform** installed (>= 1.0)
4. **Docker** installed
5. **Route53 Hosted Zone** for clarkfoster.com already exists

## Step 1: Push Docker Images to Amazon ECR

First, create ECR repositories and push your Docker images:

\`\`\`bash
# Set your AWS region
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create ECR repositories
aws ecr create-repository --repository-name portfolio-backend --region $AWS_REGION
aws ecr create-repository --repository-name portfolio-frontend --region $AWS_REGION

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Tag and push backend image
docker tag myportfoliowebsite-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/portfolio-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/portfolio-backend:latest

# Tag and push frontend image
docker tag myportfoliowebsite-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/portfolio-frontend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/portfolio-frontend:latest
\`\`\`

## Step 2: Update ECS Task Definitions

Edit the ECS module to use your ECR images:

\`\`\`bash
cd terraform/modules/ecs
\`\`\`

Replace `REPLACE_WITH_ECR_IMAGE` in main.tf with your actual ECR image URIs:
- Backend: `$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/portfolio-backend:latest`
- Frontend: `$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/portfolio-frontend:latest`

## Step 3: Initialize and Apply Terraform

\`\`\`bash
cd terraform

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the configuration
terraform apply
\`\`\`

**Important**: When applying, Terraform will output certificate validation records. You'll need to add these DNS records manually if they're not automatically validated.

## Step 4: Validate SSL Certificate

After applying Terraform, the ACM certificate needs DNS validation:

1. Get the validation records from Terraform output:
\`\`\`bash
terraform output certificate_validation_records
\`\`\`

2. The records should automatically be created in Route53, but verify they exist:
\`\`\`bash
aws route53 list-resource-record-sets --hosted-zone-id $(terraform output -raw nameservers | head -1)
\`\`\`

3. Wait for certificate validation (can take up to 30 minutes):
\`\`\`bash
aws acm wait certificate-validated --certificate-arn $(terraform output -raw certificate_arn) --region us-east-1
\`\`\`

## Step 5: Update Frontend nginx.conf

Update your frontend's nginx.conf to proxy backend requests correctly:

\`\`\`nginx
location /api {
    proxy_pass http://backend.prod-portfolio-cluster.local:8080;
    # Or use the backend ALB target group
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
\`\`\`

## Step 6: Access Your Website

Once Terraform completes and the certificate is validated:

\`\`\`bash
# Get your website URL
terraform output website_url
\`\`\`

Visit **https://clarkfoster.com** - your portfolio should be live!

## Step 7: Monitor and Debug

### View ECS Service Status
\`\`\`bash
aws ecs describe-services --cluster prod-portfolio-cluster --services prod-portfolio-backend prod-portfolio-frontend
\`\`\`

### View Logs
\`\`\`bash
# Backend logs
aws logs tail /ecs/prod/portfolio-backend --follow

# Frontend logs
aws logs tail /ecs/prod/portfolio-frontend --follow
\`\`\`

### Check ALB Health
\`\`\`bash
aws elbv2 describe-target-health --target-group-arn $(terraform output -raw alb_target_group_backend_arn)
\`\`\`

## Costs Estimate

- **ECS Fargate**: ~$15-30/month (2 tasks running 24/7)
- **Application Load Balancer**: ~$16/month
- **Data Transfer**: Variable based on traffic
- **Route53**: $0.50/month per hosted zone
- **Total**: ~$32-47/month

## Cleanup

To destroy all resources:

\`\`\`bash
terraform destroy
\`\`\`

## Troubleshooting

### Certificate Not Validating
- Ensure DNS records are created in Route53
- Check that clarkfoster.com hosted zone exists
- Wait up to 30 minutes for validation

### ECS Tasks Not Starting
- Check CloudWatch logs for errors
- Verify ECR images are accessible
- Ensure security groups allow ALB to reach tasks

### 502 Bad Gateway
- Check ECS task health in target groups
- Verify backend health check endpoint (/actuator/health)
- Check CloudWatch logs for application errors

### Domain Not Resolving
- Verify Route53 A records point to ALB
- Check DNS propagation (can take up to 48 hours)
- Ensure ACM certificate is validated and attached to ALB listener
