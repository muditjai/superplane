data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_iam_role" "ec2_payment" {
  name = "${local.name_prefix}-ec2-payment"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2_payment.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "ec2_payment" {
  name = "${local.name_prefix}-ec2-payment-policy"
  role = aws_iam_role.ec2_payment.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:*"]
        Resource = aws_dynamodb_table.payments.arn
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = aws_sns_topic.payment_completed.arn
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2_payment" {
  name = "${local.name_prefix}-ec2-payment"
  role = aws_iam_role.ec2_payment.name
}

resource "aws_instance" "payment" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.micro"
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.ec2_payment.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_payment.name

  user_data = base64encode(templatefile("${path.module}/templates/payment-user-data.sh", {
    aws_region         = var.aws_region
    ecr_repo_url       = aws_ecr_repository.repos["payment-service"].repository_url
    image_tag          = var.image_tag
    payments_table     = aws_dynamodb_table.payments.name
    payment_topic_arn  = aws_sns_topic.payment_completed.arn
  }))

  tags = {
    Name = "${local.name_prefix}-payment"
  }
}

resource "aws_lb_target_group_attachment" "payment" {
  target_group_arn = aws_lb_target_group.payment.arn
  target_id        = aws_instance.payment.id
  port             = 3004
}
