# Route 53 stub — enable with enable_route53 = true and set domain_name

resource "aws_route53_zone" "main" {
  count = var.enable_route53 && var.domain_name != "" ? 1 : 0
  name  = var.domain_name
}

resource "aws_route53_record" "alb" {
  count   = var.enable_route53 && var.domain_name != "" ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
