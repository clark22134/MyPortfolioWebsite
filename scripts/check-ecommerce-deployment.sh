#!/bin/bash

# Check e-commerce backend deployment status
echo "================================================"
echo "E-Commerce Backend Deployment Status Check"
echo "================================================"
echo ""

# Check if task definition has the environment variables
echo "1. Checking latest task defin...:"
TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition prod-ecommerce-backend \
  --region us-east-1 \
  --query 'taskDefinition.containerDefinitions[0].environment' \
  --output json)

echo "Environment variables in task definition:"
echo "$TASK_DEF" | jq -r '.[] | "\(.name) = \(.value)"'
echo ""

# Check running tasks
echo "2. Checking running tasks:"
RUNNING_TASKS=$(aws ecs list-tasks \
  --cluster prod-portfolio-cluster \
  --service-name prod-ecommerce-backend \
  --region us-east-1 \
  --desired-status RUNNING \
  --output json)

TASK_COUNT=$(echo "$RUNNING_TASKS" | jq '.taskArns | length')
echo "Number of running tasks: $TASK_COUNT"
echo ""

if [ "$TASK_COUNT" -gt 0 ]; then
  TASK_ARN=$(echo "$RUNNING_TASKS" | jq -r '.taskArns[0]')
  echo "3. Checking task details:"
  aws ecs describe-tasks \
    --cluster prod-portfolio-cluster \
    --tasks "$TASK_ARN" \
    --region us-east-1 \
    --query 'tasks[0].{Status:lastStatus,Health:healthStatus,TaskDefRevision:taskDefinitionArn,StartedAt:startedAt}' \
    --output table
  
  echo ""
  echo "4. Task definition being used:"
  aws ecs describe-tasks \
    --cluster prod-portfolio-cluster \
    --tasks "$TASK_ARN" \
    --region us-east-1 \
    --query 'tasks[0].taskDefinitionArn' \
    --output text
fi

echo ""
echo "5. Service status:"
aws ecs describe-services \
  --cluster prod-portfolio-cluster \
  --services prod-ecommerce-backend \
  --region us-east-1 \
  --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount,TaskDefinition:taskDefinition,Deployment:deployments[0].status}' \
  --output table

echo ""
echo "6. Recent events:"
aws ecs describe-services \
  --cluster prod-portfolio-cluster \
  --services prod-ecommerce-backend \
  --region us-east-1 \
  --query 'services[0].events[:5]' \
  --output table

echo ""
echo "================================================"
echo "To check backend logs:"
echo "aws logs tail /ecs/prod/ecommerce-backend --follow --region us-east-1"
echo "================================================"
