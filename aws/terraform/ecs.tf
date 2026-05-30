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
        Effect = "Allow"
        Action = ["s3:*"]
        Resource = [
          aws_s3_bucket.offer_pdfs.arn,
          "${aws_s3_bucket.offer_pdfs.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:*"]
        Resource = [
          aws_dynamodb_table.offers.arn,
          aws_dynamodb_table.payments.arn,
          aws_dynamodb_table.analytics.arn
        ]
      },
      {
        Effect = "Allow"
        Action = ["sqs:SendMessage", "sqs:ReceiveMessage"]
        Resource = [
          aws_sqs_queue.upload.arn,
          aws_sqs_queue.analytics.arn
        ]
      },
      {
        Effect = "Allow"
        Action = ["sns:Publish"]
        Resource = [
          aws_sns_topic.offer_published.arn,
          aws_sns_topic.payment_completed.arn
        ]
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

  ecs_services = {
    frontend = {
      port          = 80
      image         = "${aws_ecr_repository.repos["frontend"].repository_url}:${var.image_tag}"
      target_group  = aws_lb_target_group.frontend.arn
      container_name = "frontend"
    }
    storage = {
      port          = 3001
      image         = "${aws_ecr_repository.repos["storage-service"].repository_url}:${var.image_tag}"
      target_group  = aws_lb_target_group.storage.arn
      container_name = "storage-service"
    }
    search = {
      port          = 3002
      image         = "${aws_ecr_repository.repos["search-service"].repository_url}:${var.image_tag}"
      target_group  = aws_lb_target_group.search.arn
      container_name = "search-service"
    }
    upload = {
      port          = 3003
      image         = "${aws_ecr_repository.repos["upload-redaction-service"].repository_url}:${var.image_tag}"
      target_group  = aws_lb_target_group.upload.arn
      container_name = "upload-redaction-service"
    }
    analytics = {
      port          = 3005
      image         = "${aws_ecr_repository.repos["analytics-service"].repository_url}:${var.image_tag}"
      target_group  = aws_lb_target_group.analytics.arn
      container_name = "analytics-service"
    }
  }
}

resource "aws_ecs_task_definition" "services" {
  for_each                 = local.ecs_services
  family                   = "${local.name_prefix}-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = each.value.container_name
      image     = each.value.image
      essential = true
      portMappings = [{
        containerPort = each.value.port
        hostPort      = each.value.port
      }]
      environment = concat(local.common_env, [
        { name = "PORT", value = tostring(each.value.port) }
      ])
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs[each.key].name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = each.key
        }
      }
    }
  ])
}

resource "aws_cloudwatch_log_group" "ecs" {
  for_each          = local.ecs_services
  name              = "/ecs/${local.name_prefix}-${each.key}"
  retention_in_days = 7
}

resource "aws_ecs_service" "services" {
  for_each        = local.ecs_services
  name            = "${local.name_prefix}-${each.key}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = each.value.target_group
    container_name   = each.value.container_name
    container_port   = each.value.port
  }

  depends_on = [aws_lb_listener.http]
}
