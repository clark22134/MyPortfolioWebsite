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
	cd backend && mvn clean install -DskipTests
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# Build applications
build:
	@echo "Building backend..."
	cd backend && mvn clean package -DskipTests
	@echo "Building frontend..."
	cd frontend && npm run build

# Run tests
test:
	@echo "Running backend tests..."
	cd backend && mvn test
	@echo "Running frontend tests..."
	cd frontend && npm test

# Clean build artifacts
clean:
	@echo "Cleaning backend..."
	cd backend && mvn clean
	@echo "Cleaning frontend..."
	cd frontend && rm -rf dist node_modules

# Local deployment
deploy-local: start-backend start-frontend

start-backend:
	@echo "Starting backend on port 8080..."
	cd backend && mvn spring-boot:run &

start-frontend:
	@echo "Starting frontend on port 4200..."
	cd frontend && npm start &

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
	docker build -t portfolio-backend:latest ./backend
	docker build -t portfolio-frontend:latest ./frontend

docker-up:
	@echo "Starting Docker services..."
	docker-compose up -d

docker-down:
	@echo "Stopping Docker services..."
	docker-compose down
