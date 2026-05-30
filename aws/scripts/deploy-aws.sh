#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT/terraform"
IMAGE_TAG="${IMAGE_TAG:-latest}"
AWS_REGION="${AWS_REGION:-us-east-1}"
GCP_PROJECT_ID="${GCP_PROJECT_ID:-migracle-gcp-4-1}"
GCP_REGION="${GCP_REGION:-us-central1}"
GCP_AR_REPO="${GCP_AR_REPO:-superplane-migration}"
GCP_IMAGE_PREFIX="${GCP_IMAGE_PREFIX:-${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${GCP_AR_REPO}}"
GCP_CREDS="${GCP_CREDS:-$ROOT/../GCP_creds.txt}"

# ECR repo key -> Cloud Run / Artifact Registry image name (must match deploy-to-gcp lambda)
declare -A GCP_IMAGE_NAMES=(
  [app]="gateway"
  [storage-service]="storage-service"
  [search-service]="search-service"
  [upload-redaction-service]="upload-redaction-service"
  [payment-service]="payment-service"
  [analytics-service]="analytics-service"
)

cd "$ROOT"

echo "==> Building mock services..."
npm install
for svc in storage-service search-service upload-redaction-service payment-service analytics-service; do
  npm run build -w "@superplane/$svc"
done

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

if [[ -f "$GCP_CREDS" ]]; then
  echo "==> Logging into GCP Artifact Registry..."
  gcloud auth activate-service-account --key-file="$GCP_CREDS" --quiet 2>/dev/null || true
  gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet
else
  echo "==> Warning: $GCP_CREDS not found — skipping GCP image push"
fi

for repo in "${!DOCKERFILES[@]}"; do
  dockerfile="${DOCKERFILES[$repo]}"
  ecr_image="${ECR_BASE}/superplane-${repo}:${IMAGE_TAG}"
  docker build -f "$dockerfile" -t "$ecr_image" "$ROOT"
  docker push "$ecr_image"

  if [[ -f "$GCP_CREDS" ]]; then
    gcp_name="${GCP_IMAGE_NAMES[$repo]:-$repo}"
    gcp_image="${GCP_IMAGE_PREFIX}/${gcp_name}:${IMAGE_TAG}"
    echo "==> Pushing ${gcp_image} (for Cloud Run migration)..."
    docker tag "$ecr_image" "$gcp_image"
    docker push "$gcp_image"
  fi
done

echo "==> Forcing ECS redeploy..."
cd "$TF_DIR"
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
  echo "  Dashboard: http://${PUBLIC_IP}/"
  echo ""
  echo "Smoke tests:"
  echo "  curl http://${PUBLIC_IP}/gateway-health.json"
  echo "  curl http://${PUBLIC_IP}/services/storage-service/health"
  echo "  curl http://${PUBLIC_IP}/services/storage-service/version"
else
  echo "  Get IP: ./scripts/get-task-ip.sh $CLUSTER $SERVICE $AWS_REGION"
fi

if [[ -f "$GCP_CREDS" ]]; then
  echo ""
  echo "GCP images pushed to ${GCP_IMAGE_PREFIX}/<service>:${IMAGE_TAG}"
  echo "Re-run SuperPlane deploy-to-gcp step — Cloud Run should find images now."
fi
