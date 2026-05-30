# Superplane AWS — Offer Letters Platform

A TypeScript monorepo demo for sharing anonymized offer letters, modeled after [offerletters.fyi](https://www.offerletters.fyi/). Built for future AWS→GCP migration demos with Superplane.

## Architecture

Single **ECS Fargate task** (no ALB) with 6 containers sharing one public IP:

- **gateway** — nginx serves React frontend + proxies `/api/*` to localhost backends
- **storage-service**, **search-service**, **upload-redaction-service**, **payment-service**, **analytics-service** — Express microservices on ports 3001–3005

Supporting AWS: S3, DynamoDB, SQS, SNS, Lambda, ECR, CodePipeline, CodeArtifact

```
Browser → ECS task public IP:80 (nginx gateway)
              → localhost:3001-3005 (microservices)
              → S3 / DynamoDB / SQS / SNS → Lambda
```

## Local development

```bash
cd aws
chmod +x scripts/*.sh
./scripts/deploy-local.sh

# Run everything with Docker
docker compose up --build
```

- Frontend: http://localhost:3006
- API gateway: http://localhost:8080
- Uses in-memory stores (`USE_LOCAL_STORE=true`) — no AWS credentials needed

### Native dev (hot reload)

```bash
npm install
npm run build -w @superplane/shared
npm run dev -w @superplane/storage-service   # port 3001
npm run dev -w @superplane/search-service    # port 3002
# ... etc
npm run dev -w @superplane/frontend          # port 5173 (proxies /api → :8080)
docker compose up gateway
```

## AWS deployment

Prerequisites: AWS CLI, Terraform, Docker, credentials with permissions for ECS/EC2/S3/DynamoDB/etc.

```bash
cd aws
./scripts/deploy-aws.sh
```

This will:
1. Build all TypeScript packages and Lambda handlers
2. `terraform apply` in `terraform/`
3. Push Docker images to ECR
4. Force ECS rolling redeploy

### Terraform only

```bash
cd aws/terraform
terraform init
terraform apply -var="image_tag=latest"
```

Outputs include ECR URLs, DynamoDB table names. Get the public IP:

```bash
./scripts/get-task-ip.sh superplane-cluster superplane-app
# open http://<ip>/
```

### Route 53 (optional)

```bash
terraform apply -var="enable_route53=true" -var="domain_name=offerletters.example.com"
```

### CodePipeline

The pipeline in `terraform/pipeline.tf` expects a GitHub OAuth token. Replace `REPLACE_WITH_GITHUB_TOKEN` in the Terraform config or use AWS Console to connect the repo after first apply.

## API endpoints (via ALB)

| Method | Path | Service |
|--------|------|---------|
| GET | `/api/search?q=` | search |
| GET | `/api/offers/:id` | storage |
| POST | `/api/upload` | upload-redaction (multipart PDF) |
| POST | `/api/payments` | payment (EC2) |
| POST | `/api/analytics/events` | analytics |

## Smoke tests

```bash
IP=$(./scripts/get-task-ip.sh superplane-cluster superplane-app)
curl http://$IP/
curl http://$IP/api/search
```

## Project structure

```
aws/
├── frontend/              # React + Vite + Tailwind
├── services/              # Express microservices (TypeScript)
├── packages/shared/       # Shared types + AWS clients
├── lambda/                # S3 trigger + SNS→analytics
├── terraform/             # AWS infrastructure
├── nginx/                 # Local gateway config
├── docker-compose.yml
└── scripts/
    ├── deploy-local.sh
    └── deploy-aws.sh
```

## Security

- Never commit AWS credentials (see root `.gitignore`)
- S3 bucket blocks public access; PDFs served via presigned URLs
- Payments are mock only in v1
