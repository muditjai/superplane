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

resource "aws_iam_role_policy" "ecs_task" {
  name = "${local.name_prefix}-ecs-task-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:*"]
        Resource = [aws_s3_bucket.offer_pdfs.arn, "${aws_s3_bucket.offer_pdfs.arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:*"]
        Resource = [
          aws_dynamodb_table.offers.arn,
          aws_dynamodb_table.payments.arn,
          aws_dynamodb_table.analytics.arn
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage", "sqs:ReceiveMessage"]
        Resource = [aws_sqs_queue.upload.arn, aws_sqs_queue.analytics.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = [aws_sns_topic.offer_published.arn, aws_sns_topic.payment_completed.arn]
      }
    ]
  })
}

locals {
  common_env = [
    { name = "AWS_REGION", value = var.aws_region },
    { name = "S3_BUCKET", value = aws_s3_bucket.offer_pdfs.bucket },
    { name = "OFFERS_TABLE", value = aws_dynamodb_table.offers.name },
    { name = "PAYMENTS_TABLE", value = aws_dynamodb_table.payments.name },
    { name = "ANALYTICS_TABLE", value = aws_dynamodb_table.analytics.name },
    { name = "UPLOAD_QUEUE_URL", value = aws_sqs_queue.upload.url },
    { name = "ANALYTICS_QUEUE_URL", value = aws_sqs_queue.analytics.url },
    { name = "OFFER_PUBLISHED_TOPIC_ARN", value = aws_sns_topic.offer_published.arn },
    { name = "PAYMENT_COMPLETED_TOPIC_ARN", value = aws_sns_topic.payment_completed.arn },
    { name = "USE_LOCAL_STORE", value = "false" }
  ]

  backend_containers = {
    storage-service = { port = 3001, image_key = "storage-service" }
    search-service  = { port = 3002, image_key = "search-service" }
    upload-redaction-service = { port = 3003, image_key = "upload-redaction-service" }
    payment-service = { port = 3004, image_key = "payment-service" }
    analytics-service = { port = 3005, image_key = "analytics-service" }
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
      environment = concat(local.common_env, [{ name = "PORT", value = tostring(cfg.port) }])
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
