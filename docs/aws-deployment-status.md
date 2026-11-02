# AWS deployment status

Tingting is deployed at https://tingting.thaotrinh.site using profile `thao-dev`, region `ap-southeast-2` (Sydney), environment `production`. The application starts with an empty database, as requested.

## Deployed resources

- Rust Lambda ARM64 `tingting-production`
- API Gateway HTTP API `k9wxshgv0f`
- DynamoDB table `tingting-production`, with point-in-time recovery, TTL and deletion protection
- Private, versioned S3 bucket `tingting-production-20261102161628727700000003`
- CloudFront distribution `EYKZN8XRRZ83C`, with SPA routing and uncached API/OAuth routes
- Google OAuth secret in Secrets Manager, scoped execution-role access and retained logs
- Lambda error/throttle alarms and SNS topic `tingting-production-operations`

Google credentials were read from the Web client JSON in Downloads and uploaded without printing them or storing them in Terraform state. The user confirmed registering the deployed callback URI. Google login is enabled. The user confirmed that Google sign-in opens the home screen successfully, verifying the real OAuth callback and signed-in session flow. No credentials or test sessions were injected into production.

## Verification

- At initial deployment, all 12 frontend tests and production build passed. See the custom-domain verification note for the current shared-workspace test status.
- Rust: unit tests, Lambda compilation, formatting and Clippy pass. DynamoDB Local storage/import tests and all three GraphQL integration workflows passed during migration verification.
- GraphQL schema matches the checked-in contract.
- Lambda `/health` returns 200 through CloudFront.
- Guest GraphQL returns `me: null` and `googleLoginEnabled: true`.
- Unauthenticated group creation is rejected; cross-origin GraphQL requests return 403.
- Google authorization start redirects to the expected provider/client callback with S256 PKCE and a secure HttpOnly browser cookie.
- Direct unsigned S3 access returns 403.
- Frontend assets and the home, group, design-system and admin SPA routes return 200.
- Login layout checked at mobile and desktop widths.
- A final Terraform plan reports no changes.

The first deployment region, ap-southeast-1, was rejected by the project's managed SCP. After the user granted administrator permissions and selected ap-southeast-2, deployment succeeded. The three global resources created during the earlier attempt were reused. No SCP was modified and no advanced features were activated.

## Updating this deployment

The original live stack remains in the `default` workspace with the ignored `production.tfvars`; preserve this state and do not recreate its resources manually. New isolated stacks use the `dev` and `prod` workspaces and the matching checked-in tfvars, with names prefixed `dev-tingting` and `prod-tingting`. To preview the new prod stack:

```sh
AWS_PROFILE=thao-dev bash scripts/terraform-env.sh prod plan
```

Rebuild the Lambda artifact after backend changes before planning. Use `TF_WORKSPACE=default AWS_PROFILE=thao-dev bash scripts/deploy-web.sh` for frontend updates. The commands in [the Terraform guide](../infra/terraform/README.md) cover first-time setup and secret uploads.

Keep Terraform state securely backed up, or migrate it to an encrypted remote backend with locking before shared operation. Confirm an SNS subscription to receive alarm notifications; the topic has no configured delivery destination. Backup restoration has not yet been rehearsed; see [the recovery procedure](aws-migration.md).

Deployment logs are `/private/tmp/tingting-sydney-apply.log` and `/private/tmp/tingting-google-apply.log`. The final drift check is `/private/tmp/tingting-live-plan.log`.

## Custom domain

The custom domain is active with an issued ACM certificate and verified Namecheap DNS. Old CloudFront frontend links redirect to it. The user confirmed registering the custom-domain Google callback. See [DNS records and deployment safeguards](custom-domain.md), including the production resource-name override and explicit default workspace.
