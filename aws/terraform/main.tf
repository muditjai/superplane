terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
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

locals {
  name_prefix = "superplane"
  ecr_repos = [
    "app",
    "storage-service",
    "search-service",
    "upload-redaction-service",
    "payment-service",
    "analytics-service",
  ]
}
