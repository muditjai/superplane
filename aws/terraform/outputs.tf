output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.app.name
}

output "ecr_repository_urls" {
  value = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
}

output "website_url_hint" {
  description = "Run: ./scripts/get-task-ip.sh to get the task public IP, then open http://<ip>/"
  value       = "http://<task-public-ip>/"
}
