# Portfolio Website - Full Stack Application

[![CI/CD Pipeline](https://github.com/clark22134/angular-spring-rest-app/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/clark22134/angular-spring-rest-app/actions/workflows/ci-cd.yml)

A modern, full-stack portfolio website demonstrating mastery of RESTful API development, Angular, Spring Boot, Java, TypeScript, and cloud infrastructure deployment.

## 🚀 Features

- **Modern Frontend**: Built with Angular 19 and TypeScript
- **Robust Backend**: RESTful API using Spring Boot 3.x and Java 17
- **Authentication**: JWT-based authentication and authorization
- **Cloud Infrastructure**: AWS deployment with Terraform IaC
- **DevSecOps Pipeline**: Automated CI/CD with GitHub Actions
- **Security**: Integrated security scanning with Trivy, OWASP Dependency Check, and CodeQL
- **Containerization**: Docker and Docker Compose support
- **Responsive Design**: Modern, beautiful UI with reactive functionality

## 📋 Prerequisites

- Java 17 or higher
- Node.js 20.x or higher
- Maven 3.9 or higher
- Docker & Docker Compose (optional)
- Terraform 1.0+ (for AWS deployment)
- AWS Account (for cloud deployment)

## 🛠️ Technology Stack

### Frontend
- Angular 19
- TypeScript
- RxJS
- Angular Material
- SCSS

### Backend
- Spring Boot 3.2.1
- Java 17
- Spring Security
- JWT (JSON Web Tokens)
- Spring Data JPA
- H2 Database (development)
- PostgreSQL (production)

### Infrastructure
- AWS (EC2, VPC, ALB)
- Terraform
- Docker & Docker Compose
- Nginx

### DevOps
- GitHub Actions
- Trivy (vulnerability scanning)
- OWASP Dependency Check
- CodeQL
- Maven & npm

## 🚀 Quick Start

### Using Makefile (Recommended)

```bash
# Install dependencies
make install

# Build applications
make build

# Run locally
make deploy-local

# Run tests
make test
```

### Manual Setup

#### Backend

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

The backend will be available at `http://localhost:8080`

#### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend will be available at `http://localhost:4200`

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# Stop services
docker-compose down
```

## 🔐 Authentication

### Demo Credentials
- **Username**: demo
- **Password**: demo123

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

#### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/featured` - Get featured projects
- `GET /api/projects/{id}` - Get project by ID
- `POST /api/projects` - Create project (authenticated)
- `PUT /api/projects/{id}` - Update project (authenticated)
- `DELETE /api/projects/{id}` - Delete project (authenticated)

## 🏗️ Infrastructure Deployment

### AWS Deployment with Terraform

```bash
# Initialize Terraform
make terraform-init

# Preview changes
make terraform-plan

# Apply infrastructure
make terraform-apply

# Destroy infrastructure
make terraform-destroy
```

### Manual Terraform Commands

```bash
cd terraform
terraform init
terraform plan
terraform apply
terraform destroy
```

## 🔒 Security Features

- JWT-based authentication
- Password encryption with BCrypt
- CORS configuration
- Security headers
- SQL injection prevention
- XSS protection
- CSRF protection

## 📊 CI/CD Pipeline

The project includes a comprehensive GitHub Actions workflow that:

1. **Build & Test**: Compiles and tests both frontend and backend
2. **Security Scanning**: 
   - Trivy vulnerability scanning
   - OWASP Dependency Check
   - CodeQL static analysis
3. **Docker Build**: Creates and pushes Docker images
4. **Deploy** (optional): Automated deployment to AWS

## 🧪 Testing

### Backend Tests
```bash
cd backend
mvn test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📁 Project Structure

```
.
├── backend/                 # Spring Boot backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   └── resources/
│   │   └── test/
│   ├── Dockerfile
│   └── pom.xml
├── frontend/                # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── models/
│   │   └── assets/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── terraform/               # Infrastructure as Code
│   ├── modules/
│   │   ├── networking/
│   │   ├── compute/
│   │   └── database/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── .github/
│   └── workflows/
│       └── ci-cd.yml        # GitHub Actions workflow
├── docker-compose.yml       # Docker Compose configuration
├── Makefile                 # Build automation
└── README.md
```

## 🔧 Configuration

### Backend Configuration
Edit `backend/src/main/resources/application.properties`:

```properties
server.port=8080
spring.datasource.url=jdbc:h2:mem:portfoliodb
jwt.secret=YourSecretKey
jwt.expiration=86400000
cors.allowed.origins=http://localhost:4200
```

### Frontend Configuration
Edit environment files in `frontend/src/environments/`:
- `environment.ts` - Development
- `environment.prod.ts` - Production

## 📝 Available Make Commands

```bash
make help              # Show all available commands
make install           # Install all dependencies
make build             # Build applications
make test              # Run tests
make clean             # Clean build artifacts
make deploy-local      # Start applications locally
make start-backend     # Start backend only
make start-frontend    # Start frontend only
make stop              # Stop all services
make docker-build      # Build Docker images
make docker-up         # Start with Docker Compose
make docker-down       # Stop Docker services
make terraform-init    # Initialize Terraform
make terraform-plan    # Preview infrastructure changes
make terraform-apply   # Apply infrastructure
make terraform-destroy # Destroy infrastructure
```

## 🌐 Links

- **GitHub Repository**: [clark22134/angular-spring-rest-app](https://github.com/clark22134/angular-spring-rest-app)
- **GitHub Profile**: [clark22134](https://github.com/clark22134)

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 👤 Author

**clark22134**
- GitHub: [@clark22134](https://github.com/clark22134)

## ⭐ Show your support

Give a ⭐️ if this project helped you!

