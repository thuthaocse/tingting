# AWS environments

Terraform creates a separate DynamoDB table, Lambda, API Gateway, private S3 bucket, CloudFront distribution, OAuth secret container, logs and SNS operations topic for each environment. The Lambda execution role has access only to its table, Google secret and log group. Secret values are populated outside Terraform so they never enter Terraform state.

The API, OAuth and frontend share the CloudFront HTTPS origin. API responses and OAuth callbacks are not cached; cookies and query strings reach API Gateway. S3 is accessible only through the distribution's origin access control. Group and design-system URLs rewrite to index.html.

Dev and prod are separate Terraform workspaces and separate AWS stacks. Every resource name starts with `dev-tingting` or `prod-tingting`; each stack has its own table, API, Lambda, S3 bucket, CloudFront distribution, secret and alarms. The pre-existing deployment remains recorded in the `default` workspace under its original `tingting-production` names and is not changed by these stacks. Dev uses `dev.tfvars`; prod uses `prod.tfvars`. Initialize once, then plan and apply only after reviewing the plan:

```sh
export AWS_PROFILE=thao-dev
bash scripts/terraform-env.sh dev init
bash scripts/terraform-env.sh dev plan
bash scripts/terraform-env.sh dev apply
bash scripts/deploy-web.sh dev
```

After dev is deployed, `npm run dev` reads its CloudFront URL from Terraform and proxies local `/graphql`, `/auth` and `/health` requests to dev. Use `npm run dev:local` when intentionally developing against the Compose API on `localhost:8080`. Production builds keep the same-origin `/graphql` URL; deploying the frontend with `bash scripts/deploy-web.sh prod` publishes it to the prod stack, where CloudFront routes it to the prod API.

Use `prod` in place of `dev` for the new prod stack. The first prod apply creates a separate, empty stack; it does not migrate data or traffic from the existing deployment. Its OAuth login is initially disabled and group creation is restricted. Set up a separate Google OAuth secret and register the prod callback before enabling sign-in. Keep the old deployment running until you have verified and intentionally cut over to the new prod URL. The helper creates a missing dev or prod workspace but never removes the `default` workspace. State and plan files are local and ignored by Git; securely back up state and configure an encrypted remote backend with locking before shared deployment.

Run scripts from the repository root. Dev and production use the same local Cargo Lambda ZIP by default; rebuild it after backend changes with `cargo lambda build --release --arm64 --output-format zip --manifest-path apps/api/Cargo.toml --features lambda`. If Docker is available, `scripts/build-lambda.sh` can build `build/api.zip`; the AWS artifact workflow can also produce that ZIP. `web_origin` defaults to the distribution URL; custom domain DNS/certificate provisioning is not included.

Dev starts with Google login disabled and group creation open. To test sign-in in either environment, upload a separate OAuth client secret to that environment's secret, register its `<web_url>/auth/google/callback` in Google Cloud, then enable `google_oauth_enabled` in that environment's tfvars and apply a reviewed plan. Do not reuse OAuth secrets across environments. Credentials must never be placed in VITE variables or source control.

Subscribe an operations destination to `operations_topic_arn` and confirm it to receive Lambda error/throttle alerts. DynamoDB deletion protection and point-in-time recovery are enabled. Do not disable protection to remove production data without a tested backup.

Keep `.terraform.lock.hcl` in source control. Reuse each environment's state and variables for updates so Terraform tracks the existing resources.

A deployment identity needs permissions for the defined DynamoDB, Lambda, IAM execution-role creation/pass-role, API Gateway, CloudFront, S3, Secrets Manager, CloudWatch and SNS resources. The application execution role does not need those deployment permissions. Do not grant these permissions to end users or the Lambda role.

See [migration and recovery details](../../docs/aws-migration.md).

## Google client download

Upload a downloaded Google Web application client JSON after Terraform creates the secret:

```sh
python3 scripts/upload-google-secret.py /path/to/client_secret.json --check
python3 scripts/upload-google-secret.py /path/to/client_secret.json \
  --secret-arn "$(bash scripts/terraform-env.sh prod output google_secret_arn)" \
  --profile thao-dev --region ap-southeast-2
```

The script converts the Google download to the backend's expected keys and streams the value to AWS through standard input. It does not print the credentials or write them into Terraform state. Then apply `google_oauth_enabled=true` with the existing deployment variables. Register the deployed HTTPS callback in Google Cloud before signing in.

## Current deployment

The pre-existing live deployment uses `thao-dev` in `ap-southeast-2`; Singapore is outside this project's permitted deployment Region. See [deployment status](../../docs/aws-deployment-status.md). Use `prod` for the new isolated prod stack:

```sh
AWS_PROFILE=thao-dev bash scripts/terraform-env.sh prod plan
```

`prod.tfvars` contains no credentials. The previous `production.tfvars` and `default` workspace are retained for the existing live resources. Plan before applying; enabling OAuth requires a separate secret and callback registration.

## GitHub Actions deployments

The `Checks` workflow runs on pushes and pull requests. On pushes to `main`, it deploys only after both frontend and backend checks pass, and only when the commit message requests a deploy. A pushed tag deploys both parts after the checks pass:

```text
ci: bump frontend
ci: bump backend
ci: bump
```

The backend job builds and updates the existing Lambda function. The frontend job builds the app, syncs it to the private S3 bucket, and invalidates CloudFront. Routine application deployments do not run Terraform. Terraform infrastructure changes remain a reviewed plan/apply operation using the state for the matching workspace.

In GitHub, open **Settings → Secrets and variables → Actions**. Add these repository **secrets**:

| Secret name | Value |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | Access key for a dedicated deployment IAM user/role credential with permissions to update the target Lambda, S3 bucket, CloudFront distribution, and Secrets Manager secret. |
| `AWS_SECRET_ACCESS_KEY` | Secret access key paired with that AWS access key. |
| `GOOGLE_OAUTH_CLIENT_JSON` | Entire downloaded Google OAuth Web client JSON file. Optional; when absent, deployments leave the existing AWS secret unchanged. |

Add these repository **variables** (not secrets):

| Variable name | Value |
| --- | --- |
| `AWS_REGION` | `ap-southeast-2` |
| `AWS_LAMBDA_FUNCTION_NAME` | Exact Lambda function name, e.g. `tingting-production` for the existing deployment or `prod-tingting` for the isolated prod stack. |
| `AWS_FRONTEND_BUCKET` | Exact frontend S3 bucket name from the target Terraform workspace's `frontend_bucket` output. |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | Exact distribution ID from that workspace's `distribution_id` output. |
| `AWS_GOOGLE_OAUTH_SECRET_ARN` | Exact secret ARN from that workspace's `google_secret_arn` output. Required only when setting `GOOGLE_OAUTH_CLIENT_JSON`. |

These names use uppercase with underscores so they are easy to distinguish from ordinary configuration. Set all resource variables to the same environment/workspace. The Google JSON is uploaded to AWS Secrets Manager, where the Lambda reads it; it is never put in a Vite variable or Terraform state. For AWS credentials, prefer a dedicated deploy identity with narrowly scoped permissions and rotate the key if it is exposed. The current workflow uses long-lived AWS keys because it is configured through repository secrets; OIDC can replace them later if the AWS account is configured with a GitHub trust role.
