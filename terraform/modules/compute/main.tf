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

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
}

variable "key_name" {
  description = "SSH key pair name"
  type        = string
}

variable "backend_port" {
  description = "Backend application port"
  type        = number
}

variable "frontend_port" {
  description = "Frontend application port"
  type        = number
}

# Get latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security Group for Backend
resource "aws_security_group" "backend" {
  name        = "${var.environment}-portfolio-backend-sg"
  description = "Security group for backend application"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = var.backend_port
    to_port     = var.backend_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # TODO: Restrict to specific IP ranges in production
    description = "SSH access - SECURITY: Restrict to bastion host or VPN in production"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-portfolio-backend-sg"
    Environment = var.environment
  }
}

# Security Group for Frontend
resource "aws_security_group" "frontend" {
  name        = "${var.environment}-portfolio-frontend-sg"
  description = "Security group for frontend application"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # TODO: Restrict to specific IP ranges in production
    description = "SSH access - SECURITY: Restrict to bastion host or VPN in production"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-portfolio-frontend-sg"
    Environment = var.environment
  }
}

# Backend EC2 Instance
resource "aws_instance" "backend" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.instance_type
  subnet_id              = var.public_subnet_ids[0]
  vpc_security_group_ids = [aws_security_group.backend.id]
  key_name               = var.key_name != "" ? var.key_name : null

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y java-17-amazon-corretto docker
              systemctl start docker
              systemctl enable docker
              usermod -a -G docker ec2-user
              EOF

  tags = {
    Name        = "${var.environment}-portfolio-backend"
    Environment = var.environment
  }
}

# Frontend EC2 Instance
resource "aws_instance" "frontend" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.instance_type
  subnet_id              = var.public_subnet_ids[1]
  vpc_security_group_ids = [aws_security_group.frontend.id]
  key_name               = var.key_name != "" ? var.key_name : null

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y docker nginx
              systemctl start docker
              systemctl enable docker
              systemctl start nginx
              systemctl enable nginx
              usermod -a -G docker ec2-user
              EOF

  tags = {
    Name        = "${var.environment}-portfolio-frontend"
    Environment = var.environment
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.environment}-portfolio-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.frontend.id]
  subnets            = var.public_subnet_ids

  tags = {
    Name        = "${var.environment}-portfolio-alb"
    Environment = var.environment
  }
}

# Target Group for Backend
resource "aws_lb_target_group" "backend" {
  name     = "${var.environment}-portfolio-backend-tg"
  port     = var.backend_port
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/api/projects"
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name        = "${var.environment}-portfolio-backend-tg"
    Environment = var.environment
  }
}

# Target Group Attachment
resource "aws_lb_target_group_attachment" "backend" {
  target_group_arn = aws_lb_target_group.backend.arn
  target_id        = aws_instance.backend.id
  port             = var.backend_port
}

# Listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

output "backend_instance_public_ip" {
  description = "Backend instance public IP"
  value       = aws_instance.backend.public_ip
}

output "frontend_instance_public_ip" {
  description = "Frontend instance public IP"
  value       = aws_instance.frontend.public_ip
}

output "load_balancer_dns" {
  description = "Load balancer DNS name"
  value       = aws_lb.main.dns_name
}
