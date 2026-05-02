.PHONY: help install build test clean docker-up docker-down docker-build deploy-backends deploy-frontends deploy terraform-init terraform-plan terraform-apply

BACKENDS  := portfolio-backend ats-backend ecommerce-backend
FRONTENDS := portfolio-frontend ats-frontend ecommerce-frontend

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
	@for app in $(BACKENDS); do \
		echo "--- $$app ---"; \
		(cd $$app && mvn clean install -DskipTests) || exit 1; \
	done
	@echo "Installing frontend dependencies..."
	@for app in $(FRONTENDS); do \
		echo "--- $$app ---"; \
		(cd $$app && npm ci) || exit 1; \
	done

# Build applications
build:
	@echo "Building backends..."
	@for app in $(BACKENDS); do \
		echo "--- $$app ---"; \
		(cd $$app && mvn clean package -DskipTests) || exit 1; \
	done
	@echo "Building frontends..."
	@for app in $(FRONTENDS); do \
		echo "--- $$app ---"; \
		(cd $$app && npm run build -- --configuration production) || exit 1; \
	done

# Run tests
test:
	@echo "Running backend tests..."
	@for app in $(BACKENDS); do \
		echo "--- $$app ---"; \
		(cd $$app && mvn test) || exit 1; \
	done
	@echo "Running frontend tests..."
	@for app in $(FRONTENDS); do \
		echo "--- $$app ---"; \
		if [ ! -d "$$app/node_modules" ]; then \
			echo "Installing $$app dependencies..."; \
			(cd $$app && npm ci) || exit 1; \
		fi; \
		(cd $$app && npm test -- --watch=false) || exit 1; \
	done

# Clean build artifacts
clean:
	@for app in $(BACKENDS); do \
		(cd $$app && mvn clean) || exit 1; \
	done
	@for app in $(FRONTENDS); do \
		rm -rf $$app/dist; \
	done

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
	@for app in $(BACKENDS); do \
		JAR=$$(ls $$app/target/*.jar 2>/dev/null | grep -v -E 'sources|javadoc|original-' | head -1); \
		if [ -z "$$JAR" ]; then echo "No JAR found for $$app"; exit 1; fi; \
		aws s3 cp $$JAR s3://$(LAMBDA_BUCKET)/$$app.jar --region us-east-1 || exit 1; \
	done
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
