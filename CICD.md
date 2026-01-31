# CI/CD & DevSecOps Pipeline

This document describes the automated CI/CD pipeline with comprehensive DevSecOps checks for the Portfolio Website.

## 🚀 Pipeline Overview

The pipeline consists of three main workflows:

### 1. **Production Deployment** (`deploy-production.yml`)
Triggered on push to `main`/`master` branches.

**Stages:**
- ✅ Security Scanning (Trivy, Snyk)
- ✅ Code Quality Analysis (SonarCloud)
- ✅ Backend Tests & Build (Maven, JUnit)
- ✅ Frontend Tests & Build (npm, Angular)
- ✅ Dependency Vulnerability Check (OWASP)
- ✅ Docker Image Build & Push (ECR)
- ✅ Container Image Scanning (Trivy)
- ✅ Deploy to AWS ECS Fargate
- ✅ Post-Deployment Verification

### 2. **Pull Request Validation** (`pr-validation.yml`)
Triggered on all pull requests.

**Checks:**
- 📝 PR title validation (semantic versioning)
- 🔍 Merge conflict detection
- 🏷️ Automatic labeling
- ✅ Backend validation (tests, coverage, style)
- ✅ Frontend validation (lint, type-check, tests)
- 🔒 Security audit (npm, Maven, secrets)
- 🤖 AI-powered code review

### 3. **Security Scanning** (`security-scanning.yml`)
Scheduled weekly and on-demand.

**Scans:**
- 🐳 Container security (Hadolint, Trivy)
- 🏗️ Infrastructure security (Checkov, TFSec)
- 📦 Dependency scanning (Dependabot, Snyk)
- 🔍 SAST (CodeQL for Java & JavaScript)
- 🔐 Secrets detection (Gitleaks, TruffleHog)
- ⚖️ License compliance (FOSSA)

## 🔧 Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

### AWS Credentials
```
AWS_ACCESS_KEY_ID       # AWS access key for ECR and ECS
AWS_SECRET_ACCESS_KEY   # AWS secret key
```

### Security Scanning Tools
```
SNYK_TOKEN             # Snyk API token (https://snyk.io)
SONAR_TOKEN            # SonarCloud token (https://sonarcloud.io)
FOSSA_API_KEY          # FOSSA license scanning (https://fossa.com)
OPENAI_API_KEY         # OpenAI for AI code review (optional)
```

## 📋 Setup Instructions

### 1. Configure AWS Credentials

Create an IAM user with the following permissions:
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
        "ecs:DescribeServices"
      ],
      "Resource": "*"
    }
  ]
}
```

Add credentials to GitHub Secrets:
- Go to **Settings → Secrets and variables → Actions**
- Add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

### 2. Configure SonarCloud

1. Visit [sonarcloud.io](https://sonarcloud.io)
2. Import your GitHub repository
3. Copy the project key and organization key
4. Update `sonar-project.properties` with your keys
5. Generate a token and add to GitHub Secrets as `SONAR_TOKEN`

### 3. Configure Snyk

1. Sign up at [snyk.io](https://snyk.io)
2. Generate API token from Account Settings
3. Add to GitHub Secrets as `SNYK_TOKEN`

### 4. Enable GitHub Security Features

1. Go to **Settings → Security → Code security and analysis**
2. Enable:
   - Dependency graph
   - Dependabot alerts
   - Dependabot security updates
   - Code scanning (CodeQL)
   - Secret scanning

## 🎯 DevSecOps Best Practices

### Security
- ✅ Automated vulnerability scanning on every commit
- ✅ Container image scanning before deployment
- ✅ Infrastructure-as-Code security checks
- ✅ Secrets detection in commits
- ✅ License compliance verification

### Quality
- ✅ Code coverage reporting (Codecov)
- ✅ Static code analysis (SonarCloud)
- ✅ Linting and formatting checks
- ✅ Type safety verification

### Testing
- ✅ Unit tests (JUnit, Karma/Jasmine)
- ✅ Integration tests
- ✅ Smoke tests post-deployment
- ✅ Performance checks

### Deployment
- ✅ Blue-green deployment with ECS
- ✅ Automated rollback on failure
- ✅ Health check validation
- ✅ Zero-downtime deployments

## 📊 Pipeline Metrics

### Build Time
- Security Scan: ~2-3 minutes
- Backend Tests: ~3-5 minutes
- Frontend Tests: ~2-4 minutes
- Docker Build & Push: ~5-7 minutes
- Deployment: ~3-5 minutes
- **Total: ~15-25 minutes**

### Success Rate Target
- ✅ 95%+ pipeline success rate
- ✅ Zero critical vulnerabilities in production
- ✅ 80%+ code coverage

## 🔄 Workflow Diagram

```
┌─────────────────┐
│   Code Commit   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PR Validation  │◄──── Pull Request
├─────────────────┤
│ • Title Check   │
│ • Tests         │
│ • Security      │
│ • Code Review   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Merge to Main  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Security Scans  │
├─────────────────┤
│ • Trivy         │
│ • Snyk          │
│ • SonarCloud    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Build & Test  │
├─────────────────┤
│ • Backend       │
│ • Frontend      │
│ • OWASP Check   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Docker Build   │
├─────────────────┤
│ • Backend Image │
│ • Frontend Image│
│ • ECR Push      │
│ • Image Scan    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deploy to ECS  │
├─────────────────┤
│ • Backend       │
│ • Frontend      │
│ • Wait Stable   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Verification   │
├─────────────────┤
│ • Smoke Tests   │
│ • SSL Check     │
│ • Performance   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ✅ Live on AWS  │
│ clarkfoster.com │
└─────────────────┘
```

## 🛠️ Local Testing

Test the workflow locally before pushing:

```bash
# Run backend tests
cd backend
mvn clean test

# Run frontend tests
cd frontend
npm run test

# Build Docker images
docker compose build

# Run security scan
docker run --rm -v $(pwd):/src aquasec/trivy fs /src

# Lint Dockerfiles
docker run --rm -i hadolint/hadolint < backend/Dockerfile
docker run --rm -i hadolint/hadolint < frontend/Dockerfile
```

## 📝 Troubleshooting

### Pipeline Fails at Security Scan
- Check vulnerability severity thresholds
- Review and fix identified issues
- Update dependencies to patched versions

### Deployment Fails
- Verify AWS credentials are valid
- Check ECS service logs: `aws logs tail /ecs/prod/portfolio-backend`
- Ensure ECR images pushed successfully

### Tests Failing
- Run tests locally first
- Check for environment-specific issues
- Review test coverage reports

## 🔗 Useful Links

- [AWS ECS Console](https://console.aws.amazon.com/ecs)
- [ECR Repositories](https://console.aws.amazon.com/ecr)
- [GitHub Actions](https://github.com/clark22134/MyPortfolioWebsite/actions)
- [SonarCloud Dashboard](https://sonarcloud.io/dashboard?id=clark22134_MyPortfolioWebsite)
- [Production Website](https://clarkfoster.com)

## 📈 Future Enhancements

- [ ] Add chaos engineering tests
- [ ] Implement canary deployments
- [ ] Add load testing with k6
- [ ] Set up APM monitoring (DataDog/NewRelic)
- [ ] Add Slack/Discord notifications
- [ ] Implement automatic security patching
- [ ] Add accessibility testing
- [ ] Set up staging environment
