#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT/terraform"
IMAGE_TAG="${IMAGE_TAG:-latest}"
AWS_REGION="${AWS_REGION:-us-east-1}"

cd "$ROOT"

echo "==> Building TypeScript..."
npm install
npm run build -w @superplane/shared
for svc in storage-service search-service upload-redaction-service payment-service analytics-service; do
  npm run build -w "@superplane/$svc"
done
cd lambda/s3-upload-trigger && npm install && npm run build && cd "$ROOT"
cd lambda/sns-to-analytics && npm install && npm run build && cd "$ROOT"
npm run build -w @superplane/frontend

echo "==> Terraform apply..."
cd "$TF_DIR"
terraform init
terraform apply -auto-approve -var="image_tag=$IMAGE_TAG"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_BASE="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "==> Logging into ECR..."
cd "$ROOT"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_BASE"

echo "==> Building and pushing Docker images..."
declare -A DOCKERFILES=(
  [app]="nginx/Dockerfile.app"
  [storage-service]="services/storage-service/Dockerfile"
  [search-service]="services/search-service/Dockerfile"
  [upload-redaction-service]="services/upload-redaction-service/Dockerfile"
  [payment-service]="services/payment-service/Dockerfile"
  [analytics-service]="services/analytics-service/Dockerfile"
)

for repo in "${!DOCKERFILES[@]}"; do
  dockerfile="${DOCKERFILES[$repo]}"
  image="${ECR_BASE}/superplane-${repo}:${IMAGE_TAG}"
  if [[ "$repo" == "app" ]]; then
    docker build -f "$dockerfile" -t "$image" --build-arg VITE_API_BASE_URL= "$ROOT"
  else
    docker build -f "$dockerfile" -t "$image" "$ROOT"
  fi
  docker push "$image"
done

echo "==> Forcing ECS redeploy..."
CLUSTER="$(terraform output -raw ecs_cluster_name)"
SERVICE="$(terraform output -raw ecs_service_name)"
aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" \
  --force-new-deployment --region "$AWS_REGION"

echo "==> Waiting for task to start..."
sleep 45

PUBLIC_IP="$("$ROOT/scripts/get-task-ip.sh" "$CLUSTER" "$SERVICE" "$AWS_REGION" || true)"
echo ""
echo "Deploy complete!"
if [[ -n "$PUBLIC_IP" ]]; then
  echo "  Website: http://${PUBLIC_IP}/"
  echo ""
  echo "Smoke tests:"
  echo "  curl http://${PUBLIC_IP}/"
  echo "  curl http://${PUBLIC_IP}/api/search"
else
  echo "  Get IP: ./scripts/get-task-ip.sh $CLUSTER $SERVICE $AWS_REGION"
fi
