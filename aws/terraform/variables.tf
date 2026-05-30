variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "superplane"
}

variable "enable_route53" {
  type    = bool
  default = false
}

variable "domain_name" {
  type    = string
  default = ""
}

variable "github_owner" {
  type    = string
  default = "muditjai"
}

variable "github_repo" {
  type    = string
  default = "superplane"
}

variable "github_branch" {
  type    = string
  default = "master"
}

variable "image_tag" {
  type    = string
  default = "latest"
}
