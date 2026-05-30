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

locals {
  name_prefix = "superplan-migration"
  lambdas = {
    list-ecs-tasks = {
      description = "List running ECS tasks and containers"
      timeout     = 30
      env         = {}
    }
    deploy-to-gcp = {
      description = "Deploy ECS services to GCP Cloud Run"
      timeout     = 120
      env = {
        GCP_PROJECT_ID   = var.gcp_project_id
        GCP_REGION       = var.gcp_region
        GCP_IMAGE_PREFIX = var.gcp_image_prefix
      }
    }
    get-cloudrun-status = {
      description = "Get Cloud Run service status"
      timeout     = 30
      env = {
        GCP_PROJECT_ID = var.gcp_project_id
        GCP_REGION     = var.gcp_region
      }
    }
  }
}
