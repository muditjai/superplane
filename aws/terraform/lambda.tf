data "archive_file" "s3_upload_trigger" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/s3-upload-trigger/dist"
  output_path = "${path.module}/build/s3-upload-trigger.zip"
}

data "archive_file" "sns_to_analytics" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/sns-to-analytics/dist"
  output_path = "${path.module}/build/sns-to-analytics.zip"
}

resource "aws_iam_role" "lambda" {
  name = "${local.name_prefix}-lambda-role"

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

resource "aws_iam_role_policy" "lambda" {
  name = "${local.name_prefix}-lambda-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = aws_sqs_queue.upload.arn
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem"]
        Resource = aws_dynamodb_table.analytics.arn
      }
    ]
  })
}

resource "aws_lambda_function" "s3_upload_trigger" {
  function_name = "${local.name_prefix}-s3-upload-trigger"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  filename      = data.archive_file.s3_upload_trigger.output_path
  source_code_hash = data.archive_file.s3_upload_trigger.output_base64sha256

  environment {
    variables = {
      UPLOAD_QUEUE_URL = aws_sqs_queue.upload.url
    }
  }
}

resource "aws_lambda_function" "sns_to_analytics" {
  function_name = "${local.name_prefix}-sns-to-analytics"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  filename      = data.archive_file.sns_to_analytics.output_path
  source_code_hash = data.archive_file.sns_to_analytics.output_base64sha256

  environment {
    variables = {
      ANALYTICS_TABLE = aws_dynamodb_table.analytics.name
    }
  }
}

resource "aws_lambda_permission" "s3_invoke" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.s3_upload_trigger.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.offer_pdfs.arn
}
