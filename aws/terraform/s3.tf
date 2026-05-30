resource "aws_s3_bucket" "offer_pdfs" {
  bucket = "${local.name_prefix}-offer-pdfs-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "offer_pdfs" {
  bucket = aws_s3_bucket.offer_pdfs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "offer_pdfs" {
  bucket = aws_s3_bucket.offer_pdfs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_notification" "offer_pdfs" {
  bucket = aws_s3_bucket.offer_pdfs.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.s3_upload_trigger.arn
    events              = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_lambda_permission.s3_invoke]
}
