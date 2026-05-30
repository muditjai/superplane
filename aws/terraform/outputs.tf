output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.app.name
}

output "s3_bucket" {
  value = aws_s3_bucket.offer_pdfs.bucket
}

output "ecr_repository_urls" {
  value = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
}

output "dynamodb_tables" {
  value = {
    offers    = aws_dynamodb_table.offers.name
    payments  = aws_dynamodb_table.payments.name
    analytics = aws_dynamodb_table.analytics.name
  }
}

output "codeartifact_repository" {
  value = aws_codeartifact_repository.npm.arn
}

output "website_url_hint" {
  description = "Run: aws ecs describe-tasks ... to get the task public IP, then open http://<ip>/"
  value       = "http://<task-public-ip>/"
}
