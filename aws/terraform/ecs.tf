resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"
}

resource "aws_iam_role" "ecs_execution" {
  name = "${local.name_prefix}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name = "${local.name_prefix}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

locals {
  backend_containers = {
    storage-service          = { port = 3001, image_key = "storage-service" }
    search-service           = { port = 3002, image_key = "search-service" }
    upload-redaction-service = { port = 3003, image_key = "upload-redaction-service" }
    payment-service          = { port = 3004, image_key = "payment-service" }
    analytics-service        = { port = 3005, image_key = "analytics-service" }
  }
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name_prefix}-app"
  retention_in_days = 7
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${local.name_prefix}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode(concat(
    [{
      name      = "gateway"
      image     = "${aws_ecr_repository.repos["app"].repository_url}:${var.image_tag}"
      essential = true
      portMappings = [{ containerPort = 80, hostPort = 80, protocol = "tcp" }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.app.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "gateway"
        }
      }
      dependsOn = [for name in keys(local.backend_containers) : {
        containerName = name
        condition     = "START"
      }]
    }],
    [for name, cfg in local.backend_containers : {
      name      = name
      image     = "${aws_ecr_repository.repos[cfg.image_key].repository_url}:${var.image_tag}"
      essential = true
      portMappings = [{ containerPort = cfg.port, hostPort = cfg.port, protocol = "tcp" }]
      environment = [{ name = "PORT", value = tostring(cfg.port) }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.app.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = name
        }
      }
    }]
  ))
}

data "aws_subnets" "app" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "availability-zone"
    values = ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d", "us-east-1f"]
  }
}

resource "aws_ecs_service" "app" {
  name            = "${local.name_prefix}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.app.ids
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = true
  }
}
