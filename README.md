# Superplane

Migration project for moving workloads from AWS to GCP.

See [Design.md](./Design.md) for notes and architecture.

## AWS Offer Letters Platform

The [`aws/`](./aws/) directory contains a TypeScript monorepo demo app (offer letter sharing, modeled after [offerletters.fyi](https://www.offerletters.fyi/)) with Express microservices, React frontend, and Terraform for AWS deployment.

```bash
cd aws
./scripts/deploy-local.sh
docker compose up --build
```

## SuperPlane migration Lambdas

The [`superplane-component/`](./superplane-component/) directory contains AWS Lambdas for [SuperPlane](https://docs.superplane.com/) workflows: list ECS tasks → deploy to GCP Cloud Run → check status.
