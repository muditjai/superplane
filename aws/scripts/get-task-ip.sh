#!/usr/bin/env bash
# Usage: get-task-ip.sh <cluster> <service> [region]
set -euo pipefail
CLUSTER="${1:?cluster}"
SERVICE="${2:?service}"
REGION="${3:-us-east-1}"

TASK_ARN="$(aws ecs list-tasks --cluster "$CLUSTER" --service-name "$SERVICE" --desired-status RUNNING \
  --region "$REGION" --query 'taskArns[0]' --output text)"
[[ "$TASK_ARN" == "None" || -z "$TASK_ARN" ]] && exit 1

ENI="$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" --region "$REGION" \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)"

[[ -z "$ENI" || "$ENI" == "None" ]] && exit 1

aws ec2 describe-network-interfaces --network-interface-ids "$ENI" --region "$REGION" \
  --query 'NetworkInterfaces[0].Association.PublicIp' --output text
