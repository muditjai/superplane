# Superplane AWS — Migration Demo (Mock Services)

Minimal mock containers for the AWS→GCP Superplane migration demo. No DynamoDB, S3, SQS, Lambda, or React frontend — just health/version endpoints with hardcoded responses.

## Architecture

Single **ECS Fargate task** with 6 containers sharing one public IP:

| Container | Port | Endpoints |
|-----------|------|-----------|
| **gateway** | 80 | Static health dashboard at `/`, `gateway-health.json` |
| **storage-service** | 3001 | `GET /health`, `GET /version` |
| **search-service** | 3002 | `GET /health`, `GET /version` |
| **upload-redaction-service** | 3003 | `GET /health`, `GET /version` |
| **payment-service** | 3004 | `GET /health`, `GET /version` |
| **analytics-service** | 3005 | `GET /health`, `GET /version` |

Each backend returns JSON like:

```json
{ "status": "healthy", "service": "storage-service", "version": "1.0.0", "platform": "aws" }
```

Terraform provisions only **ECS + ECR + CloudWatch logs** (no data stores).

```
Browser → ECS task public IP:80 (nginx gateway + dashboard)
              → localhost:3001-3005 (mock Express services)
Superplane pipeline → list ECS containers → deploy to Cloud Run → check GCP health
```

## Local development

```bash
cd aws
chmod +x scripts/*.sh
./scripts/deploy-local.sh
docker compose up --build
```

Open http://localhost:8080/ for the health dashboard.

Direct service checks:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/version
```

## AWS deployment

Prerequisites: AWS CLI, Terraform, Docker, credentials for ECS/ECR.

```bash
cd aws
./scripts/deploy-aws.sh
```

This builds mock services, runs `terraform apply`, pushes images to **ECR and GCP Artifact Registry** (for Cloud Run migration), and redeploys ECS.

GCP images land at `us-central1-docker.pkg.dev/migracle-gcp-4-1/superplane-migration/<service>:latest` — matching what the Superplane `deploy-to-gcp` lambda expects.

Get the public IP:

```bash
./scripts/get-task-ip.sh superplane-cluster superplane-app
# open http://<ip>/
```

## Smoke tests

```bash
IP=$(./scripts/get-task-ip.sh superplane-cluster superplane-app)
curl http://$IP/gateway-health.json
curl http://$IP/services/storage-service/health
curl http://$IP/services/storage-service/version
```

## Project structure

```
aws/
├── services/              # Mock Express health/version stubs
├── terraform/             # ECS + ECR only
├── nginx/                 # Gateway dashboard + proxy config
├── docker-compose.yml
└── scripts/
    ├── deploy-local.sh
    └── deploy-aws.sh
```

Legacy folders (`frontend/`, `lambda/`, `packages/shared/`) are unused by the simplified demo.
