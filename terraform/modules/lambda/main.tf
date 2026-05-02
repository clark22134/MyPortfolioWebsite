variable "environment" {
  description = "Environment name"
  type        = string
}

variable "function_name" {
  description = "Lambda function name"
  type        = string
}

variable "runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "java21"
}

variable "handler" {
  description = "Lambda handler"
  type        = string
}

variable "memory_size" {
  description = "Lambda memory size in MB"
  type        = number
  default     = 512
}

variable "timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "environment_variables" {
  description = "Environment variables for Lambda"
  type        = map(string)
  default     = {}
}

variable "vpc_subnet_ids" {
  description = "VPC subnet IDs for Lambda"
  type        = list(string)
  default     = []
}

variable "vpc_id" {
  description = "VPC ID for Lambda security group"
  type        = string
  default     = ""
}

variable "vpc_security_group_ids" {
  description = "VPC security group IDs for Lambda"
  type        = list(string)
  default     = []
}

variable "database_secret_arn" {
  description = "ARN of database credentials secret"
  type        = string
  default     = ""
}

variable "enable_database_access" {
  description = "Enable database access policy for Lambda"
  type        = bool
  default     = false
}

variable "enable_snapstart" {
  description = "Enable Lambda SnapStart for faster cold starts"
  type        = bool
  default     = true
}

# Security group for Lambda (if VPC is configured)
resource "aws_security_group" "lambda" {
  count       = length(var.vpc_subnet_ids) > 0 && var.vpc_id != "" && length(var.vpc_security_group_ids) == 0 ? 1 : 0
  name        = "${var.environment}-${var.function_name}-lambda-sg"
  description = "Security group for Lambda function ${var.function_name}"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "${var.environment}-${var.function_name}-lambda-sg"
    Environment = var.environment
  }
}

# IAM role for Lambda execution
resource "aws_iam_role" "lambda" {
  name = "${var.environment}-${var.function_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = {
    Name        = "${var.environment}-${var.function_name}-lambda-role"
    Environment = var.environment
  }
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# VPC access policy (if VPC is configured)
resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  count      = length(var.vpc_subnet_ids) > 0 ? 1 : 0
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Secrets Manager access policy (if database secret is provided)
resource "aws_iam_role_policy" "lambda_secrets" {
  count = var.enable_database_access ? 1 : 0
  name  = "${var.environment}-${var.function_name}-secrets-policy"
  role  = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = var.database_secret_arn
      }
    ]
  })
}

# Lambda function
resource "aws_lambda_function" "main" {
  function_name = "${var.environment}-${var.function_name}"
  role          = aws_iam_role.lambda.arn
  runtime       = var.runtime
  handler       = var.handler
  memory_size   = var.memory_size
  timeout       = var.timeout

  # Placeholder - will be updated by CI/CD
  filename         = "${path.module}/placeholder.zip"
  source_code_hash = filebase64sha256("${path.module}/placeholder.zip")

  dynamic "vpc_config" {
    for_each = length(var.vpc_subnet_ids) > 0 ? [1] : []
    content {
      subnet_ids         = var.vpc_subnet_ids
      security_group_ids = concat(
        var.vpc_security_group_ids,
        length(aws_security_group.lambda) > 0 ? [aws_security_group.lambda[0].id] : []
      )
    }
  }

  environment {
    variables = merge(
      var.environment_variables,
      var.database_secret_arn != "" ? {
        DATABASE_SECRET_ARN = var.database_secret_arn
      } : {}
    )
  }

  # Enable SnapStart for faster cold starts (Java 11+ only)
  dynamic "snap_start" {
    for_each = var.enable_snapstart && var.runtime == "java21" ? [1] : []
    content {
      apply_on = "PublishedVersions"
    }
  }

  tracing_config {
    mode = "Active"
  }

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash
    ]
  }

  tags = {
    Name        = "${var.environment}-${var.function_name}"
    Environment = var.environment
  }
}

# CloudWatch log group
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${aws_lambda_function.main.function_name}"
  retention_in_days = 7

  tags = {
    Name        = "${var.environment}-${var.function_name}-logs"
    Environment = var.environment
  }
}

# Lambda alias for SnapStart
resource "aws_lambda_alias" "main" {
  count            = var.enable_snapstart ? 1 : 0
  name             = "current"
  function_name    = aws_lambda_function.main.function_name
  function_version = aws_lambda_function.main.version
}

# EventBridge rule to keep Lambda warm (optional)
# 2-minute cadence stays well under Lambda's idle reclaim window so the
# JVM, Hikari pool, and Aurora buffer cache stay warm between requests.
resource "aws_cloudwatch_event_rule" "lambda_warmer" {
  name                = "${var.environment}-${var.function_name}-warmer"
  description         = "Keep Lambda warm"
  schedule_expression = "rate(2 minutes)"

  tags = {
    Name        = "${var.environment}-${var.function_name}-warmer"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_target" "lambda_warmer" {
  rule      = aws_cloudwatch_event_rule.lambda_warmer.name
  target_id = "lambda"
  # Target the SnapStart alias when enabled, otherwise the unqualified function
  arn       = var.enable_snapstart ? aws_lambda_alias.main[0].arn : aws_lambda_function.main.arn

  input = jsonencode({
    warmer = true
  })
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main.function_name
  qualifier     = var.enable_snapstart ? aws_lambda_alias.main[0].name : null
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_warmer.arn
}

output "function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.main.arn
}

output "function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.main.function_name
}

output "function_invoke_arn" {
  description = "Lambda function invoke ARN (unqualified). Prefer alias_invoke_arn when SnapStart is enabled."
  value       = aws_lambda_function.main.invoke_arn
}

output "alias_invoke_arn" {
  description = "Lambda alias invoke ARN. Falls back to the unqualified invoke ARN when SnapStart is disabled."
  value       = var.enable_snapstart ? aws_lambda_alias.main[0].invoke_arn : aws_lambda_function.main.invoke_arn
}

output "alias_name" {
  description = "Lambda alias name (empty when SnapStart is disabled)"
  value       = var.enable_snapstart ? aws_lambda_alias.main[0].name : ""
}

output "function_role_arn" {
  description = "Lambda execution role ARN"
  value       = aws_iam_role.lambda.arn
}

output "function_log_group" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.lambda.name
}

output "security_group_id" {
  description = "Lambda security group ID"
  value       = length(aws_security_group.lambda) > 0 ? aws_security_group.lambda[0].id : ""
}
