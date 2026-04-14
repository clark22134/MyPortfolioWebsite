variable "environment" {
  description = "Environment name"
  type        = string
}

variable "cluster_identifier" {
  description = "Aurora cluster identifier"
  type        = string
}

variable "database_name" {
  description = "Database name"
  type        = string
}

variable "master_username" {
  description = "Master username"
  type        = string
  default     = "postgres"
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for Aurora"
  type        = list(string)
}

variable "allowed_security_groups" {
  description = "Security groups allowed to access Aurora"
  type        = list(string)
  default     = []
}

variable "min_capacity" {
  description = "Minimum Aurora capacity units (0.5 - 128)"
  type        = number
  default     = 0.5
}

variable "max_capacity" {
  description = "Maximum Aurora capacity units (0.5 - 128)"
  type        = number
  default     = 2
}

# Generate random password (exclude characters Aurora doesn't allow: / @ " and space)
resource "random_password" "master" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Store password in Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.environment}-${var.cluster_identifier}-credentials"

  tags = {
    Name        = "${var.environment}-${var.cluster_identifier}-credentials"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.master_username
    password = random_password.master.result
    engine   = "postgres"
    host     = aws_rds_cluster.aurora.endpoint
    port     = 5432
    dbname   = var.database_name
  })
}

# DB subnet group
resource "aws_db_subnet_group" "aurora" {
  name       = "${var.environment}-${var.cluster_identifier}-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name        = "${var.environment}-${var.cluster_identifier}-subnet-group"
    Environment = var.environment
  }
}

# Security group for Aurora
resource "aws_security_group" "aurora" {
  name        = "${var.environment}-${var.cluster_identifier}-sg"
  description = "Security group for Aurora Serverless v2"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
    description     = "PostgreSQL from Lambda"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-${var.cluster_identifier}-sg"
    Environment = var.environment
  }
}

# Aurora Serverless v2 cluster
resource "aws_rds_cluster" "aurora" {
  cluster_identifier      = "${var.environment}-${var.cluster_identifier}"
  engine                  = "aurora-postgresql"
  engine_mode             = "provisioned"
  engine_version          = "15.17"
  database_name           = var.database_name
  master_username         = var.master_username
  master_password         = random_password.master.result
  db_subnet_group_name    = aws_db_subnet_group.aurora.name
  vpc_security_group_ids  = [aws_security_group.aurora.id]
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.environment}-${var.cluster_identifier}-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"
  
  serverlessv2_scaling_configuration {
    min_capacity = var.min_capacity
    max_capacity = var.max_capacity
  }

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name        = "${var.environment}-${var.cluster_identifier}"
    Environment = var.environment
  }

  lifecycle {
    ignore_changes = [
      final_snapshot_identifier
    ]
  }
}

# Aurora Serverless v2 instance
resource "aws_rds_cluster_instance" "aurora" {
  identifier         = "${var.environment}-${var.cluster_identifier}-instance-1"
  cluster_identifier = aws_rds_cluster.aurora.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.aurora.engine
  engine_version     = aws_rds_cluster.aurora.engine_version

  tags = {
    Name        = "${var.environment}-${var.cluster_identifier}-instance-1"
    Environment = var.environment
  }
}

output "cluster_endpoint" {
  description = "Aurora cluster endpoint"
  value       = aws_rds_cluster.aurora.endpoint
}

output "cluster_reader_endpoint" {
  description = "Aurora cluster reader endpoint"
  value       = aws_rds_cluster.aurora.reader_endpoint
}

output "cluster_id" {
  description = "Aurora cluster ID"
  value       = aws_rds_cluster.aurora.id
}

output "cluster_arn" {
  description = "Aurora cluster ARN"
  value       = aws_rds_cluster.aurora.arn
}

output "database_name" {
  description = "Database name"
  value       = aws_rds_cluster.aurora.database_name
}

output "secret_arn" {
  description = "Secrets Manager secret ARN for database credentials"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "security_group_id" {
  description = "Security group ID for Aurora"
  value       = aws_security_group.aurora.id
}

output "master_username" {
  description = "Master database username"
  value       = var.master_username
}

output "master_password" {
  description = "Master database password"
  value       = random_password.master.result
  sensitive   = true
}
