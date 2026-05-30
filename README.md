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

See [aws/README.md](./aws/README.md) for full documentation.
