variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs"
  type        = list(string)
}

variable "backend_port" {
  description = "Backend application port"
  type        = number
}

variable "frontend_port" {
  description = "Frontend application port"
  type        = number
}

variable "backend_cpu" {
  description = "CPU units for backend"
  type        = number
}

variable "backend_memory" {
  description = "Memory for backend in MB"
  type        = number
}

variable "frontend_cpu" {
  description = "CPU units for frontend"
  type        = number
}

variable "frontend_memory" {
  description = "Memory for frontend in MB"
  type        = number
}

variable "alb_target_group_backend_arn" {
  description = "ARN of backend target group"
  type        = string
}

variable "alb_target_group_frontend_arn" {
  description = "ARN of frontend target group"
  type        = string
}

variable "alb_security_group_id" {
  description = "Security group ID of the ALB"
  type        = string
}

# E-Commerce variables
variable "ecommerce_backend_cpu" {
  description = "CPU units for e-commerce backend"
  type        = number
}

variable "ecommerce_backend_memory" {
  description = "Memory for e-commerce backend in MB"
  type        = number
}

variable "ecommerce_frontend_cpu" {
  description = "CPU units for e-commerce frontend"
  type        = number
}

variable "ecommerce_frontend_memory" {
  description = "Memory for e-commerce frontend in MB"
  type        = number
}

variable "alb_target_group_ecommerce_backend_arn" {
  description = "ARN of e-commerce backend target group"
  type        = string
}

variable "alb_target_group_ecommerce_frontend_arn" {
  description = "ARN of e-commerce frontend target group"
  type        = string
}

# ECR Repositories
resource "aws_ecr_repository" "portfolio_backend" {
  name                 = "portfolio-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "portfolio-backend"
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "portfolio_frontend" {
  name                 = "portfolio-frontend"
  image_tag_mutability = "MUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "portfolio-frontend"
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "ecommerce_backend" {
  name                 = "ecommerce-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "ecommerce-backend"
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "ecommerce_frontend" {
  name                 = "ecommerce-frontend"
  image_tag_mutability = "MUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "ecommerce-frontend"
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "ecommerce_db" {
  name                 = "ecommerce-db"
  image_tag_mutability = "MUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "ecommerce-db"
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "ats_backend" {
  name                 = "ats-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "ats-backend"
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "ats_frontend" {
  name                 = "ats-frontend"
  image_tag_mutability = "MUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "ats-frontend"
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "ats_db" {
  name                 = "ats-db"
  image_tag_mutability = "MUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "ats-db"
    Environment = var.environment
  }
}

# ECR Lifecycle Policies - keep only last 10 images
resource "aws_ecr_lifecycle_policy" "portfolio_backend" {
  repository = aws_ecr_repository.portfolio_backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "portfolio_frontend" {
  repository = aws_ecr_repository.portfolio_frontend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "ecommerce_backend" {
  repository = aws_ecr_repository.ecommerce_backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "ecommerce_frontend" {
  repository = aws_ecr_repository.ecommerce_frontend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "ecommerce_db" {
  repository = aws_ecr_repository.ecommerce_db.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "ats_backend" {
  repository = aws_ecr_repository.ats_backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "ats_frontend" {
  repository = aws_ecr_repository.ats_frontend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "ats_db" {
  repository = aws_ecr_repository.ats_db.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-portfolio-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.environment}-portfolio-cluster"
    Environment = var.environment
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.environment}/portfolio-backend"
  retention_in_days = 7

  tags = {
    Name        = "${var.environment}-portfolio-backend-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.environment}/portfolio-frontend"
  retention_in_days = 7

  tags = {
    Name        = "${var.environment}-portfolio-frontend-logs"
    Environment = var.environment
  }
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.environment}-portfolio-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-portfolio-ecs-task-execution"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional policy for Secrets Manager access
resource "aws_iam_role_policy" "ecs_secrets" {
  name = "${var.environment}-ecs-secrets-policy"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:secretsmanager:*:*:secret:portfolio/*"
        ]
      }
    ]
  })
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.environment}-portfolio-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = var.backend_port
    to_port         = var.backend_port
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
    description     = "Allow traffic from ALB to backend"
  }

  ingress {
    from_port       = var.frontend_port
    to_port         = var.frontend_port
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
    description     = "Allow traffic from ALB to frontend"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-portfolio-ecs-tasks-sg"
    Environment = var.environment
  }
}

# Backend Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.environment}-portfolio-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "010438493245.dkr.ecr.us-east-1.amazonaws.com/portfolio-backend:latest"
      essential = true
      portMappings = [
        {
          containerPort = var.backend_port
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "SPRING_PROFILES_ACTIVE"
          value = "prod"
        }
      ]
      secrets = [
        {
          name      = "ADMIN_USERNAME"
          valueFrom = aws_secretsmanager_secret.admin_username.arn
        },
        {
          name      = "ADMIN_PASSWORD"
          valueFrom = aws_secretsmanager_secret.admin_password.arn
        },
        {
          name      = "ADMIN_EMAIL"
          valueFrom = aws_secretsmanager_secret.admin_email.arn
        },
        {
          name      = "ADMIN_FULLNAME"
          valueFrom = aws_secretsmanager_secret.admin_fullname.arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = aws_secretsmanager_secret.jwt_secret.arn
        },
        {
          name      = "MAIL_USERNAME"
          valueFrom = aws_secretsmanager_secret.mail_username.arn
        },
        {
          name      = "MAIL_PASSWORD"
          valueFrom = aws_secretsmanager_secret.mail_password.arn
        },
        {
          name      = "CONTACT_EMAIL"
          valueFrom = aws_secretsmanager_secret.contact_email.arn
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name        = "${var.environment}-portfolio-backend"
    Environment = var.environment
  }
}

# Frontend Task Definition
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.environment}-portfolio-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.frontend_cpu
  memory                   = var.frontend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "010438493245.dkr.ecr.us-east-1.amazonaws.com/portfolio-frontend:latest"
      essential = true
      portMappings = [
        {
          containerPort = var.frontend_port
          protocol      = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name        = "${var.environment}-portfolio-frontend"
    Environment = var.environment
  }
}

# Backend ECS Service
resource "aws_ecs_service" "backend" {
  name            = "${var.environment}-portfolio-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Allow time for Java Spring Boot to start before health checks fail the deployment
  health_check_grace_period_seconds = 120

  # Automatic rollback if deployment fails
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.alb_target_group_backend_arn
    container_name   = "backend"
    container_port   = var.backend_port
  }

  # CRITICAL: Ignore task_definition changes so Terraform doesn't overwrite
  # GitHub Actions deployments. The workflow manages image versions.
  lifecycle {
    ignore_changes = [task_definition]
  }

  depends_on = [aws_iam_role_policy_attachment.ecs_task_execution]

  tags = {
    Name        = "${var.environment}-portfolio-backend-service"
    Environment = var.environment
  }
}

# Frontend ECS Service
resource "aws_ecs_service" "frontend" {
  name            = "${var.environment}-portfolio-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Automatic rollback if deployment fails
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.alb_target_group_frontend_arn
    container_name   = "frontend"
    container_port   = var.frontend_port
  }

  # CRITICAL: Ignore task_definition changes so Terraform doesn't overwrite
  # GitHub Actions deployments. The workflow manages image versions.
  lifecycle {
    ignore_changes = [task_definition]
  }

  depends_on = [aws_iam_role_policy_attachment.ecs_task_execution]

  tags = {
    Name        = "${var.environment}-portfolio-frontend-service"
    Environment = var.environment
  }
}

data "aws_region" "current" {}

# =========================================================================
# E-Commerce Resources
# =========================================================================

# CloudWatch Log Groups for E-Commerce
resource "aws_cloudwatch_log_group" "ecommerce_backend" {
  name              = "/ecs/${var.environment}/ecommerce-backend"
  retention_in_days = 7

  tags = {
    Name        = "${var.environment}-ecommerce-backend-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "ecommerce_frontend" {
  name              = "/ecs/${var.environment}/ecommerce-frontend"
  retention_in_days = 7

  tags = {
    Name        = "${var.environment}-ecommerce-frontend-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "ecommerce_db" {
  name              = "/ecs/${var.environment}/ecommerce-db"
  retention_in_days = 7

  tags = {
    Name        = "${var.environment}-ecommerce-db-logs"
    Environment = var.environment
  }
}

# E-Commerce Backend Task Definition (with MySQL sidecar)
resource "aws_ecs_task_definition" "ecommerce_backend" {
  family                   = "${var.environment}-ecommerce-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecommerce_backend_cpu
  memory                   = var.ecommerce_backend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "ecommerce-backend"
      image     = "010438493245.dkr.ecr.us-east-1.amazonaws.com/ecommerce-backend:latest"
      essential = true
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "SPRING_PROFILES_ACTIVE"
          value = "prod"
        },
        {
          name  = "MYSQL_URL"
          value = "jdbc:mysql://localhost:3306/full-stack-ecommerce?useSSL=false&useUnicode=yes&characterEncoding=UTF-8&allowPublicKeyRetrieval=true&serverTimezone=UTC"
        },
        {
          name  = "MYSQL_USERNAME"
          value = "ecommerceapp"
        },
        {
          name  = "MYSQL_PASSWORD"
          value = "ecommerceapp"
        }
      ]
      dependsOn = [
        {
          containerName = "ecommerce-db"
          condition     = "HEALTHY"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecommerce_backend.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    },
    {
      name      = "ecommerce-db"
      image     = "010438493245.dkr.ecr.us-east-1.amazonaws.com/ecommerce-db:latest"
      essential = true
      portMappings = [
        {
          containerPort = 3306
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "MYSQL_DATABASE"
          value = "full-stack-ecommerce"
        },
        {
          name  = "MYSQL_USER"
          value = "ecommerceapp"
        },
        {
          name  = "MYSQL_PASSWORD"
          value = "ecommerceapp"
        },
        {
          name  = "MYSQL_ROOT_PASSWORD"
          value = "rootpassword"
        }
      ]
      healthCheck = {
        command     = ["CMD", "mysqladmin", "ping", "-h", "localhost"]
        interval    = 10
        timeout     = 5
        retries     = 10
        startPeriod = 30
      }
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecommerce_db.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name        = "${var.environment}-ecommerce-backend"
    Environment = var.environment
  }
}

# E-Commerce Frontend Task Definition
resource "aws_ecs_task_definition" "ecommerce_frontend" {
  family                   = "${var.environment}-ecommerce-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecommerce_frontend_cpu
  memory                   = var.ecommerce_frontend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "ecommerce-frontend"
      image     = "010438493245.dkr.ecr.us-east-1.amazonaws.com/ecommerce-frontend:latest"
      essential = true
      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecommerce_frontend.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name        = "${var.environment}-ecommerce-frontend"
    Environment = var.environment
  }
}

# E-Commerce Backend ECS Service
resource "aws_ecs_service" "ecommerce_backend" {
  name            = "${var.environment}-ecommerce-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.ecommerce_backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Allow time for MySQL + Spring Boot startup
  health_check_grace_period_seconds = 180

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.alb_target_group_ecommerce_backend_arn
    container_name   = "ecommerce-backend"
    container_port   = 8080
  }

  lifecycle {
    ignore_changes = [task_definition]
  }

  depends_on = [aws_iam_role_policy_attachment.ecs_task_execution]

  tags = {
    Name        = "${var.environment}-ecommerce-backend-service"
    Environment = var.environment
  }
}

# E-Commerce Frontend ECS Service
resource "aws_ecs_service" "ecommerce_frontend" {
  name            = "${var.environment}-ecommerce-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.ecommerce_frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.alb_target_group_ecommerce_frontend_arn
    container_name   = "ecommerce-frontend"
    container_port   = var.frontend_port
  }

  lifecycle {
    ignore_changes = [task_definition]
  }

  depends_on = [aws_iam_role_policy_attachment.ecs_task_execution]

  tags = {
    Name        = "${var.environment}-ecommerce-frontend-service"
    Environment = var.environment
  }
}

# Outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}
