output "alb_dns_name" {
  description = "Public ALB DNS name for the website"
  value       = aws_lb.main.dns_name
}

output "website_url" {
  value = "http://${aws_lb.main.dns_name}"
}

output "s3_bucket" {
  value = aws_s3_bucket.offer_pdfs.bucket
}

output "ecr_repository_urls" {
  value = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
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

output "payment_ec2_instance_id" {
  value = aws_instance.payment.id
}
