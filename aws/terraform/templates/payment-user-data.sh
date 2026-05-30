#!/bin/bash
set -euxo pipefail

yum update -y
yum install -y docker
systemctl enable docker
systemctl start docker

aws ecr get-login-password --region ${aws_region} | docker login --username AWS --password-stdin ${ecr_repo_url}

docker pull ${ecr_repo_url}:${image_tag}
docker run -d --restart always --name payment-service \
  -p 3004:3004 \
  -e AWS_REGION=${aws_region} \
  -e PORT=3004 \
  -e PAYMENTS_TABLE=${payments_table} \
  -e PAYMENT_COMPLETED_TOPIC_ARN=${payment_topic_arn} \
  -e USE_LOCAL_STORE=false \
  ${ecr_repo_url}:${image_tag}
