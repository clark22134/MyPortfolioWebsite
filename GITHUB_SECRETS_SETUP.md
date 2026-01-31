# GitHub Secrets Configuration Guide

This guide walks you through setting up all required secrets for the CI/CD pipeline.

---

## 🔑 Required Secrets

Navigate to your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

### 1. AWS Credentials (REQUIRED)

These credentials allow GitHub Actions to push images to ECR and deploy to ECS.

#### `AWS_ACCESS_KEY_ID`
```
Your AWS access key ID
```

#### `AWS_SECRET_ACCESS_KEY`
```
Your AWS secret access key
```

**How to get these:**
1. Go to AWS Console → IAM → Users
2. Select your user (or create a deployment user)
3. Go to "Security credentials" tab
4. Click "Create access key"
5. Choose "Application running outside AWS"
6. Copy both the Access Key ID and Secret Access Key

**Required IAM Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTasks"
      ],
      "Resource": "*"
    }
  ]
}
```

---

### 2. Snyk Token (REQUIRED for Security Scanning)

Snyk scans dependencies for vulnerabilities.

#### `SNYK_TOKEN`
```
Your Snyk API token
```

**How to get this:**
1. Sign up at https://snyk.io (free tier available)
2. Go to Account Settings → General
3. Copy your API token from the "API Token" section

**What it does:**
- Scans npm dependencies (frontend)
- Scans Maven dependencies (backend)
- Identifies known vulnerabilities (CVEs)
- Provides fix recommendations

---

### 3. SonarCloud Token (REQUIRED for Code Quality)

SonarCloud performs static code analysis.

#### `SONAR_TOKEN`
```
Your SonarCloud token
```

**How to get this:**
1. Sign up at https://sonarcloud.io (free for public repos)
2. Create a new organization (link your GitHub account)
3. Import your repository
4. Go to Administration → Analysis Method → GitHub Actions
5. Copy the SONAR_TOKEN value

**Configuration:**
Update `sonar-project.properties` with your values:
```properties
sonar.organization=YOUR_ORGANIZATION
sonar.projectKey=YOUR_PROJECT_KEY
```

**What it analyzes:**
- Code smells
- Bugs and vulnerabilities
- Code coverage
- Duplications
- Maintainability rating

---

### 4. Codecov Token (OPTIONAL - for Test Coverage)

Tracks code coverage trends across PRs.

#### `CODECOV_TOKEN`
```
Your Codecov token
```

**How to get this:**
1. Sign up at https://codecov.io (free for open source)
2. Add your repository
3. Copy the upload token from Settings

**Note:** Codecov works without a token for public repositories, but having a token provides:
- Better reliability
- Faster uploads
- Coverage status checks

---

### 5. FOSSA API Key (OPTIONAL - for License Compliance)

Checks open source license compliance.

#### `FOSSA_API_KEY`
```
Your FOSSA API key
```

**How to get this:**
1. Sign up at https://fossa.com (free tier available)
2. Go to Settings → Integrations → API
3. Generate a new API key

**What it does:**
- Scans dependencies for licenses
- Identifies license conflicts
- Ensures compliance with company policies

**Skip this if:** You don't need license compliance tracking

---

### 6. OpenAI API Key (OPTIONAL - for AI Code Review)

Powers automated AI code reviews on PRs.

#### `OPENAI_API_KEY`
```
Your OpenAI API key
```

**How to get this:**
1. Sign up at https://platform.openai.com
2. Go to API keys section
3. Create a new API key
4. Add billing information (pay-as-you-go)

**Cost estimate:**
- ~$0.01-0.05 per PR review (depending on diff size)
- Uses GPT-4 for code analysis

**Skip this if:** You prefer manual code reviews only

---

## 🚀 Quick Setup Script

After adding secrets to GitHub, verify they're set correctly:

```bash
# Check AWS credentials (locally)
aws sts get-caller-identity --region us-east-1

# Check ECR access
aws ecr describe-repositories --region us-east-1

# Check ECS access
aws ecs list-clusters --region us-east-1
```

---

## ✅ Verification Checklist

After adding secrets, verify the pipeline works:

### Step 1: Test PR Validation
```bash
git checkout -b test-pipeline
echo "# Test" >> README.md
git add README.md
git commit -m "test: verify CI/CD pipeline"
git push origin test-pipeline
```

Create a PR on GitHub and verify:
- [ ] Semantic PR check passes
- [ ] Backend tests run
- [ ] Frontend tests run
- [ ] Security audit completes
- [ ] Coverage uploads to Codecov

### Step 2: Test Production Deployment
```bash
# Merge the PR
git checkout main
git pull origin main
```

Verify in GitHub Actions:
- [ ] Security scanning passes
- [ ] Code quality analysis completes
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] OWASP dependency check runs
- [ ] Docker images build successfully
- [ ] Images push to ECR
- [ ] ECS services update
- [ ] Smoke tests pass

### Step 3: Verify Deployment
```bash
# Check website
curl -I https://clarkfoster.com

# Check ECS services
aws ecs describe-services \
  --cluster prod-portfolio-cluster \
  --services prod-portfolio-frontend prod-portfolio-backend \
  --region us-east-1 \
  --query 'services[*].{name:serviceName,status:status,running:runningCount,desired:desiredCount}'
```

---

## 🔒 Security Best Practices

1. **Rotate Credentials Regularly**
   - Rotate AWS access keys every 90 days
   - Rotate API tokens every 6 months

2. **Use Least Privilege**
   - AWS IAM user should have minimal permissions (see policy above)
   - Don't use root account credentials

3. **Monitor Secret Usage**
   - Check GitHub Actions logs for failed authentications
   - Set up AWS CloudTrail for API call auditing

4. **Protect Your Secrets**
   - Never commit secrets to version control
   - Use `.gitignore` for sensitive files
   - Enable GitHub secret scanning

5. **Backup Secrets Securely**
   - Store in a password manager (1Password, LastPass, etc.)
   - Never share secrets via email or chat

---

## 🐛 Troubleshooting

### Pipeline fails with "AWS credentials not found"
**Solution:** Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set correctly
```bash
# Test locally
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
aws sts get-caller-identity
```

### SonarCloud analysis fails
**Solution:** Ensure project is set up in SonarCloud and token has proper permissions
- Check `sonar-project.properties` has correct organization and project key
- Verify token is not expired

### Snyk fails with authentication error
**Solution:** Regenerate Snyk token
1. Go to Snyk dashboard
2. Account Settings → General → API Token
3. Revoke old token and create new one
4. Update GitHub secret

### ECR push fails with "denied: Your authorization token has expired"
**Solution:** AWS credentials might be invalid
```bash
# Test ECR access
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  010438493245.dkr.ecr.us-east-1.amazonaws.com
```

### ECS deployment doesn't update
**Solution:** Check ECS task definition and service
```bash
# Check latest task definition
aws ecs describe-task-definition \
  --task-definition prod-portfolio-frontend \
  --region us-east-1

# Force new deployment
aws ecs update-service \
  --cluster prod-portfolio-cluster \
  --service prod-portfolio-frontend \
  --force-new-deployment \
  --region us-east-1
```

---

## 📚 Additional Resources

- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Snyk Documentation](https://docs.snyk.io/)
- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)

---

**Next Steps:**
1. Add all required secrets (AWS, Snyk, SonarCloud)
2. Create a test PR to verify pr-validation workflow
3. Merge to main to trigger production deployment
4. Monitor GitHub Actions tab for workflow execution
5. Verify deployment at https://clarkfoster.com

*Last Updated: January 31, 2026*
