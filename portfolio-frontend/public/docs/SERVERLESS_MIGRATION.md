# Serverless Migration Guide

## Overview

This guide documents the migration from ECS Fargate to a serverless architecture using Lambda, API Gateway, CloudFront, and Aurora Serverless v2.

## Cost Comparison

### Before (Fargate + ALB)
- 6 ECS Fargate tasks (24/7): ~$120-150/month
- Application Load Balancer: ~$18/month
- Regional WAF: ~$10/month
- Data transfer: ~$15/month
- **Total: ~$163-193/month**

### After (Serverless)
- 3 Lambda functions: ~$2-5/month (with free tier)
- 3 API Gateways: ~$3.50/month (with free tier)
- 3 CloudFront distributions: ~$1-2/month
- 3 S3 buckets: ~$0.50/month
- 1 Aurora Serverless v2 cluster, 3 databases (0.5–4 ACU): ~$45/month
- CloudFront WAF: ~$5/month
- **Total: ~$63/month**

**Savings: ~$130/month (~68% reduction)**

## Architecture Changes

### Frontend
- **Before**: Angular apps in Fargate containers with Nginx
- **After**: Static files in S3 served via CloudFront CDN
  - Global edge caching
  - Automatic HTTPS
  - SPA routing via custom error responses

### Backend
- **Before**: Spring Boot apps in Fargate containers (24/7)
- **After**: Spring Boot apps packaged as Lambda functions
  - SnapStart enabled for sub-second cold starts
  - Auto-scaling from 0 to thousands of requests
  - Pay per request (no idle costs)
  - Warmed every 4 minutes via EventBridge

### Database
- **Before**: PostgreSQL/MySQL in sidecar containers (ephemeral)
- **After**: 1 shared Aurora Serverless v2 cluster with 3 databases (portfolio, ecommerce, ats)
  - Scales from 0.5 to 4 ACU based on load
  - Automated backups and point-in-time recovery
  - Encryption at rest
  - Managed patching and updates

### API Gateway
- **Before**: ALB with path-based routing
- **After**: API Gateway per application
  - Integrated request/response transformation
  - Built-in throttling and caching
  - CloudWatch metrics and logging
  - Regional endpoints

### Security
- **Before**: Regional WAF on ALB
- **After**: CloudFront WAF (global)
  - Same managed rules (Common, Bad Inputs, SQLi)
  - Rate limiting (2000 general, 20 auth)
  - Shield Standard (DDoS protection)
  - Applied at edge locations before traffic reaches origin

## Deployment Steps

### 1. Prepare Backend Applications for Lambda

Each Spring Boot application needs to be adapted for Lambda:

#### Add Dependencies

Add to `pom.xml`:
```xml
<dependency>
    <groupId>com.amazonaws.serverless</groupId>
    <artifactId>aws-serverless-java-container-springboot3</artifactId>
    <version>2.0.3</version>
</dependency>
```

> **Note:** Do NOT use `spring-cloud-function-adapter-aws` — it is incompatible with Spring Boot 3.x Lambda deployments using the `aws-serverless-java-container` adapter.

#### Create Handler Class

Create `src/main/java/com/portfolio/StreamLambdaHandler.java`:
```java
package com.portfolio;

import com.amazonaws.serverless.exceptions.ContainerInitializationException;
import com.amazonaws.serverless.proxy.model.AwsProxyRequest;
import com.amazonaws.serverless.proxy.model.AwsProxyResponse;
import com.amazonaws.serverless.proxy.spring.SpringBootLambdaContainerHandler;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestStreamHandler;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class StreamLambdaHandler implements RequestStreamHandler {

    private static final SpringBootLambdaContainerHandler<AwsProxyRequest, AwsProxyResponse> handler;

    static {
        try {
            handler = SpringBootLambdaContainerHandler.getAwsProxyHandler(Application.class);
        } catch (ContainerInitializationException e) {
            throw new RuntimeException("Failed to initialize Spring Boot application", e);
        }
    }

    @Override
    public void handleRequest(InputStream inputStream, OutputStream outputStream, Context context)
            throws IOException {
        handler.proxyStream(inputStream, outputStream, context);
    }
}
```

The Lambda handler in AWS should be set to: `com.portfolio.StreamLambdaHandler::handleRequest`

#### Package as Uber JAR (maven-shade-plugin)

Spring Boot's default `spring-boot-maven-plugin` produces a BOOT-INF nested JAR that Lambda's `URLClassLoader` cannot load. Use `maven-shade-plugin` instead to produce a flat uber JAR:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-shade-plugin</artifactId>
    <version>3.6.0</version>
    <configuration>
        <createDependencyReducedPom>false</createDependencyReducedPom>
        <shadedArtifactAttached>true</shadedArtifactAttached>
        <shadedClassifierName>aws</shadedClassifierName>
    </configuration>
    <executions>
        <execution>
            <phase>package</phase>
            <goals><goal>shade</goal></goals>
        </execution>
    </executions>
</plugin>
```

The shaded JAR (e.g., `portfolio-backend-1.0.0-aws.jar`) is what gets uploaded to Lambda.

### 2. Deploy Infrastructure

#### Initialize Terraform
```bash
cd terraform
terraform init
```

#### Review the Plan
```bash
terraform plan -out=serverless.tfplan
```

#### Apply the Changes
```bash
terraform apply serverless.tfplan
```

This will create:
- VPC with public and private subnets
- 1 shared Aurora Serverless v2 cluster (3 databases)
- 3 Lambda functions (placeholder code)
- 3 API Gateways
- 3 S3 buckets for frontend hosting
- 3 CloudFront distributions
- CloudFront WAF
- Route53 DNS records
- IAM roles and policies

### 3. Deploy Frontend Applications

For each frontend (portfolio, ecommerce, ATS):

```bash
# Build production bundle
cd portfolio-frontend
npm run build

# Upload to S3
aws s3 sync dist/portfolio-frontend/ s3://prod-portfolio-frontend/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

### 4. Deploy Backend Applications

For each backend:

```bash
# Package as JAR
cd portfolio-backend
mvn clean package -DskipTests

# Upload to Lambda
aws lambda update-function-code \
  --function-name prod-portfolio-backend \
  --zip-file fileb://target/portfolio-backend-1.0.0.jar

# Publish new version (for SnapStart)
aws lambda publish-version \
  --function-name prod-portfolio-backend
```

### 5. Test Each Application

- Portfolio: https://clarkfoster.com
- E-Commerce: https://shop.clarkfoster.com
- ATS: https://ats.clarkfoster.com

Verify:
- Frontend loads correctly
- API calls work (check browser console)
- Database connectivity (test CRUD operations)
- Authentication flows
- Cold start times (<2 seconds with SnapStart)

### 6. Monitor

Check CloudWatch:
- Lambda function errors and duration
- API Gateway 4xx/5xx errors
- CloudFront cache hit ratio
- Aurora CPU and memory

## CI/CD Pipeline Updates

The GitHub Actions pipeline needs to be updated:

### Frontend Deployment

Replace ECS deployment with S3/CloudFront:

```yaml
deploy-frontend:
  runs-on: ubuntu-latest
  steps:
    - name: Build
      run: |
        cd portfolio-frontend
        npm ci
        npm run build:production
    
    - name: Upload to S3
      run: |
        aws s3 sync dist/portfolio-frontend/ s3://prod-portfolio-frontend/ --delete
    
    - name: Invalidate CloudFront
      run: |
        aws cloudfront create-invalidation \
          --distribution-id ${{ secrets.PORTFOLIO_CF_DIST_ID }} \
          --paths "/*"
```

### Backend Deployment

Replace ECS deployment with Lambda:

```yaml
deploy-backend:
  runs-on: ubuntu-latest
  steps:
    - name: Build JAR
      run: |
        cd portfolio-backend
        mvn clean package -DskipTests
    
    - name: Deploy to Lambda
      run: |
        aws lambda update-function-code \
          --function-name prod-portfolio-backend \
          --zip-file fileb://target/portfolio-backend-1.0.0.jar
        
        aws lambda publish-version \
          --function-name prod-portfolio-backend
```

## Rollback Plan

If issues arise:

### 1. Immediate Rollback (DNS)
```bash
# Point Route53 back to old ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --change-batch file://rollback-dns.json
```

### 2. Keep Old Infrastructure

The old Fargate configuration is backed up in `terraform/main.tf.fargate-backup`.

To restore:
```bash
cd terraform
cp main.tf main.tf.serverless
cp main.tf.fargate-backup main.tf
terraform apply
```

### 3. Lambda Version Rollback

```bash
# Revert to previous version
aws lambda update-alias \
  --function-name prod-portfolio-backend \
  --name current \
  --function-version <PREVIOUS_VERSION>
```

## Performance Considerations

### Cold Starts
- **SnapStart**: Reduces Java cold starts from 5-10s to 1-2s
- **Warmers**: EventBridge rules keep functions warm
- **First request**: May take 1-2 seconds
- **Subsequent requests**: <200ms

### Database Scaling
- Aurora scales from 0.5 ACU automatically
- First query after idle period: ~1-2 second delay
- Typical response time after warmup: <100ms

### Frontend Delivery
- CloudFront edge caching: 50-100ms globally
- S3 origin fetch (cache miss): ~200-300ms
- 99% cache hit ratio expected for static assets

## Security Enhancements

1. **CloudFront + WAF**: Protection at edge, before traffic reaches origin
2. **Shield Standard**: Automatic DDoS protection
3. **Aurora Encryption**: Data encrypted at rest
4. **Secrets Manager**: Database credentials rotated automatically
5. **VPC Isolation**: Lambda and Aurora in private subnets
6. **IAM Least Privilege**: Function-specific roles

## Monitoring and Alerts

Set up CloudWatch alarms:

```bash
# Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name portfolio-lambda-errors \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold

# API Gateway 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name portfolio-api-5xx \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold

# Aurora CPU
aws cloudwatch put-metric-alarm \
  --alarm-name portfolio-aurora-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

## Next Steps

1. **Test thoroughly** in a non-production environment first
2. **Update CI/CD pipelines** before deploying via automation
3. **Set up monitoring and alerts**
4. **Plan maintenance window** for DNS cutover
5. **Keep old infrastructure** running for 1-2 weeks as backup
6. **Monitor costs** closely in first month
7. **Optimize** based on usage patterns

## Expected Results

- **Cost**: Reduced by ~68%
- **Performance**: Similar or better (CloudFront edge caching)
- **Scalability**: Better (auto-scales instantly)
- **Maintenance**: Less (AWS-managed services)
- **Security**: Enhanced (multiple layers of protection)
- **Reliability**: Improved (AWS SLAs on managed services)
