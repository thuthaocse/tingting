# Tingting

Tingting is a group expense-sharing app that helps people track shared expenses, see who owes whom, and record payments. It supports group links, Google sign-in, and balances calculated in Vietnamese dong (VND).

## AWS

The backend uses DynamoDB and runs on ARM64 Lambda. Terraform configures API Gateway, same-origin S3/CloudFront hosting, Secrets Manager, logs, and alarms. See the [deployment guide](infra/terraform/README.md) and [storage, migration, and recovery design](docs/aws-migration.md).

The AWS deployment runs at [Tingting](https://tingting.thaotrinh.site) in the Sydney region (`ap-southeast-2`). See the [deployment status](docs/aws-deployment-status.md).
