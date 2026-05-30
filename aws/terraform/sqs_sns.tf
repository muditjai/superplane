resource "aws_sqs_queue" "upload" {
  name = "${local.name_prefix}-upload-queue"
}

resource "aws_sqs_queue" "analytics" {
  name = "${local.name_prefix}-analytics-queue"
}

resource "aws_sns_topic" "offer_published" {
  name = "${local.name_prefix}-offer-published"
}

resource "aws_sns_topic" "payment_completed" {
  name = "${local.name_prefix}-payment-completed"
}

resource "aws_sns_topic_subscription" "offer_published_analytics" {
  topic_arn = aws_sns_topic.offer_published.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.sns_to_analytics.arn
}

resource "aws_sns_topic_subscription" "payment_completed_analytics" {
  topic_arn = aws_sns_topic.payment_completed.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.sns_to_analytics.arn
}

resource "aws_lambda_permission" "sns_offer" {
  statement_id  = "AllowSNSOffer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sns_to_analytics.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.offer_published.arn
}

resource "aws_lambda_permission" "sns_payment" {
  statement_id  = "AllowSNSPayment"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sns_to_analytics.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.payment_completed.arn
}
