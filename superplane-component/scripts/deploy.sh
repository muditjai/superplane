#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF="$ROOT/terraform"
AWS_REGION="${AWS_REGION:-us-east-1}"

"$ROOT/scripts/build.sh"

cd "$TF"
terraform init
terraform apply -auto-approve "$@"

echo ""
echo "Lambda function names (use in SuperPlane aws.lambda.runFunction):"
terraform output -json lambda_function_names | jq -r 'to_entries[] | "  \(.key): \(.value)"'
