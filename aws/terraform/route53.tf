# Route 53 stub — enable with enable_route53 = true and set domain_name + task public IP manually

resource "aws_route53_zone" "main" {
  count = var.enable_route53 && var.domain_name != "" ? 1 : 0
  name  = var.domain_name
}
