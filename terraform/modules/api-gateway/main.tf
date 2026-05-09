variable "environment" {
  description = "Environment name"
  type        = string
}

variable "api_name" {
  description = "Name of the API"
  type        = string
}

variable "domain_name" {
  description = "Custom domain name for the API"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM certificate ARN for custom domain"
  type        = string
  default     = ""
}

variable "lambda_invoke_arn" {
  description = "Lambda function invoke ARN"
  type        = string
}

variable "lambda_function_name" {
  description = "Lambda function name"
  type        = string
}

variable "lambda_alias" {
  description = "Optional Lambda alias to invoke (e.g. SnapStart 'current' alias). Empty string targets $LATEST."
  type        = string
  default     = ""
}

# ---------------------------------------------------------------------------
# Optional secondary route: /api/chatbot/{proxy+} -> a different Lambda.
# Used by the portfolio API to send chatbot traffic to a non-VPC Lambda that
# can reach api.openai.com directly. Leave empty to disable.
# ---------------------------------------------------------------------------
variable "enable_chatbot" {
  description = "Whether to create the /api/chatbot/{proxy+} branch. Must be a plan-time-known boolean (cannot be derived from a computed Lambda ARN, otherwise count is unknown until apply)."
  type        = bool
  default     = false
}

variable "chatbot_lambda_invoke_arn" {
  description = "Invoke ARN (or alias invoke ARN) of a second Lambda to handle /api/chatbot/{proxy+}."
  type        = string
  default     = ""
}

variable "chatbot_lambda_function_name" {
  description = "Function name of the chatbot Lambda (required if chatbot_lambda_invoke_arn is set)."
  type        = string
  default     = ""
}

variable "chatbot_lambda_alias" {
  description = "Optional alias on the chatbot Lambda (e.g. SnapStart 'current')."
  type        = string
  default     = ""
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.environment}-${var.api_name}"
  description = "API Gateway for ${var.api_name}"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "${var.environment}-${var.api_name}"
    Environment = var.environment
  }
}

# Proxy resource to catch all paths
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "{proxy+}"
}

# ANY method on proxy resource
resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

# Lambda integration
resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn
}

# Root method (GET /)
resource "aws_api_gateway_method" "root" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_rest_api.main.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

# Root lambda integration
resource "aws_api_gateway_integration" "root_lambda" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_rest_api.main.root_resource_id
  http_method = aws_api_gateway_method.root.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn
}

# ---------------------------------------------------------------------------
# Optional /api/chatbot/{proxy+} branch
# ---------------------------------------------------------------------------
# More-specific paths win in API Gateway routing, so this branch always
# wins over the catch-all `/{proxy+}` integration above for chatbot
# traffic. Created only when var.enable_chatbot is true so environments
# without a chatbot Lambda incur no extra resources. We use an explicit
# bool flag (instead of `var.chatbot_lambda_invoke_arn != ""`) because the
# invoke ARN comes from another module's Lambda alias and is unknown at
# plan time on the first run, which makes `count` unresolvable.
locals {
  chatbot_enabled = var.enable_chatbot
}

resource "aws_api_gateway_resource" "api" {
  count       = local.chatbot_enabled ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "api"
}

resource "aws_api_gateway_resource" "chatbot" {
  count       = local.chatbot_enabled ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api[0].id
  path_part   = "chatbot"
}

resource "aws_api_gateway_resource" "chatbot_proxy" {
  count       = local.chatbot_enabled ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.chatbot[0].id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "chatbot_proxy" {
  count         = local.chatbot_enabled ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.chatbot_proxy[0].id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "chatbot_proxy" {
  count                   = local.chatbot_enabled ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.chatbot_proxy[0].id
  http_method             = aws_api_gateway_method.chatbot_proxy[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.chatbot_lambda_invoke_arn
}

resource "aws_lambda_permission" "chatbot" {
  count         = local.chatbot_enabled ? 1 : 0
  statement_id  = "AllowAPIGatewayInvokeChatbot"
  action        = "lambda:InvokeFunction"
  function_name = var.chatbot_lambda_function_name
  qualifier     = var.chatbot_lambda_alias != "" ? var.chatbot_lambda_alias : null
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# Deployment
resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_integration.lambda,
    aws_api_gateway_integration.root_lambda,
    aws_api_gateway_integration.chatbot_proxy,
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    # Include integration URIs so that changing the Lambda target (e.g. from
    # the unqualified function ARN to a SnapStart alias ARN) forces a new
    # stage deployment. Without this, Terraform updates the integration URI
    # in-place but the stage keeps serving the old deployment and the
    # resource-policy permission check fails with "Invalid permissions".
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy.id,
      aws_api_gateway_integration.lambda.id,
      aws_api_gateway_integration.lambda.uri,
      aws_api_gateway_method.root.id,
      aws_api_gateway_integration.root_lambda.id,
      aws_api_gateway_integration.root_lambda.uri,
      # Include the chatbot branch so toggling it on/off or pointing it at
      # a new alias triggers a redeployment. jsonencode handles the empty
      # list case (chatbot disabled) cleanly.
      [for r in aws_api_gateway_resource.chatbot_proxy : r.id],
      [for i in aws_api_gateway_integration.chatbot_proxy : i.uri],
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Stage
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment

  xray_tracing_enabled = true

  tags = {
    Name        = "${var.environment}-${var.api_name}-stage"
    Environment = var.environment
  }
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  qualifier     = var.lambda_alias != "" ? var.lambda_alias : null
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# CloudWatch log group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.environment}-${var.api_name}"
  retention_in_days = 7

  tags = {
    Name        = "${var.environment}-${var.api_name}-logs"
    Environment = var.environment
  }
}

# Enable CloudWatch logging
resource "aws_api_gateway_method_settings" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled = true
    logging_level   = "INFO"
  }
}

output "api_id" {
  description = "API Gateway ID"
  value       = aws_api_gateway_rest_api.main.id
}

output "api_endpoint" {
  description = "API Gateway invoke URL"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "api_execution_arn" {
  description = "API Gateway execution ARN"
  value       = aws_api_gateway_rest_api.main.execution_arn
}

output "api_domain" {
  description = "API Gateway domain name"
  value       = replace(aws_api_gateway_stage.main.invoke_url, "/^https?://([^/]*).*/", "$1")
}
