resource "aws_iam_role" "lambda" {
  name = "${local.name_prefix}-migration-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_ecs" {
  name = "${local.name_prefix}-lambda-ecs-read"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ecs:ListTasks", "ecs:DescribeTasks", "ecs:ListServices", "ecs:DescribeServices"]
      Resource = "*"
    }]
  })
}

resource "aws_lambda_function" "migration" {
  for_each = local.lambdas

  function_name = "${local.name_prefix}-${replace(each.key, "_", "-")}"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = each.value.timeout
  filename      = "${path.module}/../lambdas/${each.key}/function.zip"
  source_code_hash = filebase64sha256("${path.module}/../lambdas/${each.key}/function.zip")

  environment {
    variables = merge(each.value.env, {
      ECS_CLUSTER = var.ecs_cluster
    }, each.key != "list-ecs-tasks" && var.google_service_account_json != "" ? {
      GOOGLE_SERVICE_ACCOUNT_JSON = var.google_service_account_json
    } : {})
  }
}

output "lambda_function_names" {
  value = { for k, v in aws_lambda_function.migration : k => v.function_name }
}

output "lambda_function_arns" {
  value = { for k, v in aws_lambda_function.migration : k => v.arn }
}
