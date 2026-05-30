# SuperPlane migration Lambdas

TypeScript AWS Lambda functions for [SuperPlane](https://docs.superplane.com/) workflows that migrate the offerletters AWS ECS stack to GCP Cloud Run.

Invoke each function with the SuperPlane **[Lambda • Run Function](https://docs.superplane.com/components/aws/)** component (`aws.lambda.runFunction`).

## Lambdas

| Function | Purpose |
|----------|---------|
| `list-ecs-tasks` | Lists running ECS tasks and containers (images, health) |
| `deploy-to-gcp` | Takes that list and updates/creates Cloud Run services |
| `get-cloudrun-status` | Returns Cloud Run service URLs, revisions, and ready state |

## Workflow chain (SuperPlane canvas)

```
[Manual trigger]
    → Lambda: superplane-list-ecs-tasks
    → Lambda: superplane-deploy-to-gcp   (payload = previous step output)
    → Lambda: superplane-get-cloudrun-status
```

### Step 1 — List ECS tasks

**Function:** `superplane-list-ecs-tasks`

**Payload:**

```json
{
  "cluster": "superplane-cluster",
  "region": "us-east-1",
  "service": "superplane-app"
}
```

All fields optional (defaults from env).

**Output** (passed to next step):

```json
{
  "cluster": "superplane-cluster",
  "region": "us-east-1",
  "taskCount": 1,
  "tasks": [{ "taskArn": "...", "containers": [{ "name": "gateway", "image": "..." }] }],
  "services": [
    {
      "containerName": "storage-service",
      "image": "590184027793.dkr.ecr.us-east-1.amazonaws.com/superplane-storage-service:latest",
      "cloudRunServiceName": "storage-service"
    }
  ]
}
```

### Step 2 — Deploy to GCP

**Function:** `superplane-deploy-to-gcp`

**Payload** (use expression from step 1, e.g. `$steps.list_ecs.output`):

```json
{
  "listResult": { "...": "output from list-ecs-tasks" },
  "gcpProjectId": "your-gcp-project",
  "gcpRegion": "us-central1",
  "skipContainers": ["gateway"]
}
```

Images default to `{GCP_REGION}-docker.pkg.dev/{GCP_PROJECT}/superplane-migration/{service}:latest`. Override with `GCP_IMAGE_PREFIX` env on the Lambda.

Requires `GOOGLE_SERVICE_ACCOUNT_JSON` on the Lambda (service account with Cloud Run Admin).

### Step 3 — Cloud Run status

**Function:** `superplane-get-cloudrun-status`

**Payload:**

```json
{
  "gcpProjectId": "your-gcp-project",
  "gcpRegion": "us-central1",
  "serviceNames": ["storage-service", "search-service"]
}
```

Omit `serviceNames` to list all services in the region.

## Build & deploy to AWS

```bash
cd superplane-component
chmod +x scripts/*.sh

export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_DEFAULT_REGION=us-east-1

# Optional GCP vars for deploy/status lambdas
export TF_VAR_gcp_project_id=your-project
export TF_VAR_google_service_account_json="$(cat gcp-sa.json)"

./scripts/deploy.sh
```

## Local build only

```bash
./scripts/build.sh
```

## Project layout

```
superplane-component/
├── shared/                 # Types shared between lambdas
├── lambdas/
│   ├── list-ecs-tasks/
│   ├── deploy-to-gcp/
│   └── get-cloudrun-status/
├── terraform/              # Lambda IAM + function resources
├── scripts/
│   ├── build.sh
│   └── deploy.sh
└── workflows/
    └── migration-example.json
```

## SuperPlane setup

1. Add an **AWS integration** in SuperPlane ([docs](https://docs.superplane.com/components/aws/)).
2. Add three **Lambda • Run Function** nodes with the function names from `terraform output`.
3. Wire outputs: list → deploy (`listResult` field) → status (`serviceNames` from deploy results).

GCP credentials: store the service account JSON in Lambda env via Terraform, or use SuperPlane **Secrets** and pass at runtime (extend lambdas as needed).
