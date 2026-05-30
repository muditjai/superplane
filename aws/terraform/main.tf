terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}
data "aws_vpc" "default" {
  default = true
}
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

locals {
  name_prefix = "superplane"
  services = {
    frontend = { port = 80, paths = ["/", "/about", "/search", "/offers/*"] }
    storage  = { port = 3001, paths = ["/api/offers", "/api/offers/*"] }
    search   = { port = 3002, paths = ["/api/search", "/api/search/*"] }
    upload   = { port = 3003, paths = ["/api/upload", "/api/upload/*"] }
    analytics = { port = 3005, paths = ["/api/analytics", "/api/analytics/*"] }
  }
  ecr_repos = [
    "frontend",
    "storage-service",
    "search-service",
    "upload-redaction-service",
    "payment-service",
    "analytics-service",
  ]
}
