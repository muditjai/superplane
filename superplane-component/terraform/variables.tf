variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "ecs_cluster" {
  type    = string
  default = "superplane-cluster"
}

variable "gcp_project_id" {
  type    = string
  default = ""
}

variable "gcp_region" {
  type    = string
  default = "us-central1"
}

variable "gcp_image_prefix" {
  type    = string
  default = ""
}

variable "google_service_account_json" {
  type        = string
  default     = ""
  sensitive   = true
  description = "GCP service account JSON for deploy/status lambdas (optional at apply time)"
}
