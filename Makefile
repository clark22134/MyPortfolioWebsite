.PHONY: help install build test clean deploy-local start-backend start-frontend stop terraform-init terraform-plan terraform-apply terraform-destroy docker-build docker-up docker-down

# Help
help:
	@echo "Portfolio Website - Makefile Commands"
	@echo "======================================"
	@echo "install          - Install all dependencies (backend & frontend)"
	@echo "build            - Build backend and frontend applications"
	@echo "test             - Run all tests"
	@echo "clean            - Clean build artifacts"
	@echo ""
	@echo "Local Development:"
	@echo "deploy-local     - Start both backend and frontend locally"
	@echo "start-backend    - Start Spring Boot backend"
	@echo "start-frontend   - Start Angular frontend"
	@echo "stop             - Stop all running services"
	@echo ""
	@echo "Docker:"
	@echo "docker-build     - Build Docker images"
	@echo "docker-up        - Start services with Docker Compose"
	@echo "docker-down      - Stop Docker services"
	@echo ""
	@echo "Terraform (AWS Infrastructure):"
	@echo "terraform-init    - Initialize Terraform"
	@echo "terraform-plan    - Preview infrastructure changes"
	@echo "terraform-apply   - Apply infrastructure changes"
	@echo "terraform-destroy - Destroy infrastructure"

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	cd portfolio-backend && mvn clean install -DskipTests
	@echo "Installing ATS backend dependencies..."
	cd ats-backend && mvn clean install -DskipTests
	@echo "Installing ecommerce backend dependencies..."
	cd ecommerce-backend && mvn clean install -DskipTests
	@echo "Installing frontend dependencies..."
	cd portfolio-frontend && npm install
	@echo "Installing ATS frontend dependencies..."
	cd ats-frontend && npm install
	@echo "Installing ecommerce frontend dependencies..."
	cd ecommerce-frontend && npm install

# Build applications
build:
	@echo "Building backend..."
	cd portfolio-backend && mvn clean package -DskipTests
	@echo "Building ATS backend..."
	cd ats-backend && mvn clean package -DskipTests
	@echo "Building ecommerce backend..."
	cd ecommerce-backend && mvn clean package -DskipTests
	@echo "Building frontend..."
	cd portfolio-frontend && npm run build
	@echo "Building ATS frontend..."
	cd ats-frontend && npm run build
	@echo "Building ecommerce frontend..."
	cd ecommerce-frontend && npm run build

# Run tests
test:
	@echo "Running backend tests..."
	cd portfolio-backend && mvn test
	@echo "Running ATS backend tests..."
	cd ats-backend && mvn test
	@echo "Running ecommerce backend tests..."
	cd ecommerce-backend && mvn test
	@echo "Running frontend tests..."
	cd portfolio-frontend && npm test
	@echo "Running ATS frontend tests..."
	cd ats-frontend && npm test
	@echo "Running ecommerce frontend tests..."
	cd ecommerce-frontend && npm test

# Clean build artifacts
clean:
	@echo "Cleaning backend..."
	cd portfolio-backend && mvn clean
	@echo "Cleaning ATS backend..."
	cd ats-backend && mvn clean
	@echo "Cleaning ecommerce backend..."
	cd ecommerce-backend && mvn clean
	@echo "Cleaning frontend..."
	cd portfolio-frontend && rm -rf dist node_modules
	@echo "Cleaning ATS frontend..."
	cd ats-frontend && rm -rf dist node_modules
	@echo "Cleaning ecommerce frontend..."
	cd ecommerce-frontend && rm -rf dist node_modules

# Local deployment
deploy-local: start-backend start-frontend

start-backend:
	@echo "Starting backend on port 8080..."
	cd portfolio-backend && mvn spring-boot:run &

start-frontend:
	@echo "Starting frontend on port 4200..."
	cd portfolio-frontend && npm start &

stop:
	@echo "Stopping services..."
	-pkill -f "spring-boot:run"
	-pkill -f "ng serve"

# Terraform commands
terraform-init:
	@echo "Initializing Terraform..."
	cd terraform && terraform init

terraform-plan:
	@echo "Planning Terraform changes..."
	cd terraform && terraform plan

terraform-apply:
	@echo "Applying Terraform changes..."
	cd terraform && terraform apply -auto-approve

terraform-destroy:
	@echo "Destroying Terraform infrastructure..."
	cd terraform && terraform destroy -auto-approve

# Docker commands
docker-build:
	@echo "Building Docker images..."
	docker build -t portfolio-backend:latest ./portfolio-backend
	docker build -t portfolio-frontend:latest ./portfolio-frontend
	docker build -t ecommerce-backend:latest ./ecommerce-backend
	docker build -t ecommerce-frontend:latest ./ecommerce-frontend
	docker build -t ecommerce-db:latest ./ecommerce-db
	docker build -t ats-backend:latest ./ats-backend
	docker build -t ats-frontend:latest ./ats-frontend
	docker build -t ats-db:latest ./ats-db

docker-up:
	@echo "Starting Docker services..."
	docker compose up -d

docker-down:
	@echo "Stopping Docker services..."
	docker compose down
