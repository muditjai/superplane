# SuperPlane migration Lambdas

TypeScript AWS Lambda functions for [SuperPlane](https://docs.superplane.com/) workflows that migrate the offerletters AWS ECS stack to GCP Cloud Run.

Invoke each function with the SuperPlane **[Lambda • Run Function](https://docs.superplane.com/components/aws/)** component (`aws.lambda.runFunction`).

## Lambdas

| Function | Purpose |
|----------|---------|
| `list-ecs-tasks` | Lists running ECS tasks and containers (images, health) |
| `deploy-to-gcp` | Takes that list and updates/creates Cloud Run services |
| `get-cloudrun-status` | Returns Cloud Run service URLs, revisions, and ready state |

## Workflow chain

Each step outputs only what the next step needs. Wire the **full previous step output** as the next node's payload.

```
list-ecs-tasks  →  { services: [...] }
deploy-to-gcp   →  { gcpProjectId, gcpRegion, serviceNames: [...] }
get-cloudrun-status  →  { gcpProjectId, gcpRegion, services: [...] }
```

### Step 1 — List ECS tasks

**Input:** `{ "cluster": "superplane-cluster", "service": "superplane-app" }`

**Output:**
```json
{
  "services": [
    {
      "containerName": "storage-service",
      "image": "590184027793.dkr.ecr.us-east-1.amazonaws.com/superplane-storage-service:latest",
      "imageTag": "latest",
      "cloudRunServiceName": "storage-service"
    }
  ]
}
```

### Step 2 — Deploy to GCP

**SuperPlane payload** (expression only — resolves to Go fmt string):

```
{{ steps.list_ecs.output.data.payload }}
```

The Lambda receives the entire payload as a string like:

```
map[services:[map[cloudRunServiceName:storage-service containerName:storage-service image:... imageTag:latest] ...]]
```

### Step 3 — Cloud Run status

**SuperPlane payload:**

```
{{ steps.deploy_gcp.output.data.payload }}
```

Resolves to:

```
map[gcpProjectId:migracle-gcp-4-1 gcpRegion:us-central1 serviceNames:[storage-service search-service]]
```

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
3. Wire outputs: list → deploy → status (each step passes its full SuperPlane output to the next).

GCP credentials: store the service account JSON in Lambda env via Terraform, or use SuperPlane **Secrets** and pass at runtime (extend lambdas as needed).
