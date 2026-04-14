.PHONY: help install build test clean docker-up docker-down docker-build deploy-backends deploy-frontends deploy terraform-init terraform-plan terraform-apply

# Help
help:
	@echo "Portfolio Website - Makefile Commands"
	@echo "======================================"
	@echo "install          - Install all dependencies (backend & frontend)"
	@echo "build            - Build all applications"
	@echo "test             - Run all tests"
	@echo "clean            - Clean build artifacts"
	@echo ""
	@echo "Local Development (Docker Compose):"
	@echo "docker-up        - Start all services"
	@echo "docker-down      - Stop all services"
	@echo "docker-build     - Rebuild and start all services"
	@echo ""
	@echo "AWS Deployment (Lambda + S3 + CloudFront):"
	@echo "deploy-backends  - Build and deploy backend JARs to Lambda"
	@echo "deploy-frontends - Build and deploy frontends to S3/CloudFront"
	@echo "deploy           - Deploy everything"
	@echo ""
	@echo "Terraform:"
	@echo "terraform-init   - Initialize Terraform"
	@echo "terraform-plan   - Preview infrastructure changes"
	@echo "terraform-apply  - Apply infrastructure changes"

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	cd portfolio-backend && mvn clean install -DskipTests
	cd ats-backend && mvn clean install -DskipTests
	cd ecommerce-backend && mvn clean install -DskipTests
	@echo "Installing frontend dependencies..."
	cd portfolio-frontend && npm ci
	cd ats-frontend && npm ci
	cd ecommerce-frontend && npm ci

# Build applications
build:
	@echo "Building backends..."
	cd portfolio-backend && mvn clean package -DskipTests
	cd ats-backend && mvn clean package -DskipTests
	cd ecommerce-backend && mvn clean package -DskipTests
	@echo "Building frontends..."
	cd portfolio-frontend && npm run build -- --configuration production
	cd ats-frontend && npm run build -- --configuration production
	cd ecommerce-frontend && npm run build -- --configuration production

# Run tests
test:
	@echo "Running backend tests..."
	cd portfolio-backend && mvn test
	cd ats-backend && mvn test
	cd ecommerce-backend && mvn test
	@echo "Running frontend tests..."
	cd portfolio-frontend && npx ng test --no-watch
	cd ats-frontend && npx ng test --no-watch
	cd ecommerce-frontend && npx ng test --no-watch

# Clean build artifacts
clean:
	cd portfolio-backend && mvn clean
	cd ats-backend && mvn clean
	cd ecommerce-backend && mvn clean
	rm -rf portfolio-frontend/dist ats-frontend/dist ecommerce-frontend/dist

# Docker Compose
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-build:
	docker compose up --build -d

# AWS Deployment
LAMBDA_BUCKET = prod-lambda-deployments-$(shell aws sts get-caller-identity --query Account --output text)

deploy-backends: build
	@echo "Uploading JARs to S3..."
	aws s3 cp portfolio-backend/target/portfolio-backend-1.0.0.jar s3://$(LAMBDA_BUCKET)/portfolio-backend.jar --region us-east-1
	aws s3 cp ecommerce-backend/target/spring-boot-ecommerce-0.0.1-SNAPSHOT.jar s3://$(LAMBDA_BUCKET)/ecommerce-backend.jar --region us-east-1
	aws s3 cp ats-backend/target/ats-backend-0.0.1-SNAPSHOT.jar s3://$(LAMBDA_BUCKET)/ats-backend.jar --region us-east-1
	@echo "Updating Lambda functions..."
	@for func in portfolio-backend ecommerce-backend ats-backend; do \
		aws lambda update-function-code --function-name prod-$$func \
			--s3-bucket $(LAMBDA_BUCKET) --s3-key $$func.jar \
			--region us-east-1 --output text --query FunctionArn > /dev/null; \
	done
	@for func in prod-portfolio-backend prod-ecommerce-backend prod-ats-backend; do \
		aws lambda wait function-updated --function-name $$func --region us-east-1; \
		VERSION=$$(aws lambda publish-version --function-name $$func --region us-east-1 --query Version --output text); \
		aws lambda update-alias --function-name $$func --name current --function-version $$VERSION --region us-east-1 > /dev/null 2>&1 || true; \
		echo "  $$func -> v$$VERSION"; \
	done

deploy-frontends: build
	@ACCOUNT_ID=$$(aws sts get-caller-identity --query Account --output text); \
	for app in portfolio ecommerce ats; do \
		BUCKET="prod-$${app}-frontend-$${ACCOUNT_ID}"; \
		aws s3 sync $${app}-frontend/dist/$${app}-frontend/browser/ s3://$$BUCKET/ --delete \
			--cache-control "public,max-age=31536000,immutable" \
			--exclude "index.html" --exclude "*.json" --region us-east-1 --only-show-errors; \
		aws s3 cp $${app}-frontend/dist/$${app}-frontend/browser/index.html s3://$$BUCKET/index.html \
			--cache-control "public,max-age=0,must-revalidate" --region us-east-1 --only-show-errors; \
		echo "  $$app -> s3://$$BUCKET/"; \
	done
	@echo "Invalidating CloudFront caches..."
	@for domain in clarkfoster.com shop.clarkfoster.com ats.clarkfoster.com; do \
		DIST_ID=$$(aws cloudfront list-distributions \
			--query "DistributionList.Items[?Aliases.Items[?@=='$$domain']].Id" --output text); \
		if [ -n "$$DIST_ID" ] && [ "$$DIST_ID" != "None" ]; then \
			aws cloudfront create-invalidation --distribution-id $$DIST_ID --paths "/*" \
				--output text --query Invalidation.Id > /dev/null; \
			echo "  $$domain ($$DIST_ID)"; \
		fi; \
	done

deploy: deploy-backends deploy-frontends

# Terraform
terraform-init:
	cd terraform && terraform init

terraform-plan:
	cd terraform && source ../.env && terraform plan

terraform-apply:
	cd terraform && source ../.env && terraform apply
