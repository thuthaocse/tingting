# Custom domain setup

Live URL: https://tingting.thaotrinh.site. DNS provider: Namecheap. AWS runtime resources remain in Sydney; the issued CloudFront certificate is managed by Terraform in us-east-1. Old CloudFront frontend URLs redirect to this hostname.

## Namecheap records

Open Domain List → Manage `thaotrinh.site` → Advanced DNS → Host Records. Add the following CNAMEs with Automatic TTL:

| Type  | Host                                         | Value                                                              |
| ----- | -------------------------------------------- | ------------------------------------------------------------------ |
| CNAME | `tingting`                                   | `d3qvvq9jlekz0d.cloudfront.net`                                    |
| CNAME | `_297605a5ff6e9df0630a4e59dd0988cf.tingting` | `_4f08bbd881145ae413958b9fff434625.wzccmgtwzk.acm-validations.aws` |

Namecheap appends `thaotrinh.site` to Host, so do not include the domain there. Keep the certificate-validation record for automatic renewal. See [Namecheap's CNAME instructions](https://www.namecheap.com/support/knowledgebase/article.aspx/9646/2237/how-to-create-a-cname-record-for-your-domain/).

Both CNAMEs resolve publicly through Namecheap's authoritative nameservers. ACM reports the certificate as ISSUED.

## Google login

The user confirmed adding `https://tingting.thaotrinh.site/auth/google/callback` to the existing Google Web client's authorized redirect URIs. The deployed OAuth start endpoint uses that callback and secure cookies. Users must sign in again on the new hostname because browser cookies are scoped to the hostname.

## Terraform activation

The ignored `production.tfvars` now sets `custom_domain="tingting.thaotrinh.site"`, `activate_custom_domain=true` and `redirect_to_custom_domain=true`. It pins `resource_name_prefix="tingting-production"` to preserve the live resource names while other environments use the new naming convention. Do not remove this override from this deployment.

Production uses the default workspace. The shared local selection may be dev, so target production explicitly. An isolated Terraform cache was used to avoid interference from concurrent local initialization:

```sh
export AWS_PROFILE=thao-dev
export TF_WORKSPACE=default
export TF_DATA_DIR=/private/tmp/tingting-production-terraform
terraform -chdir=infra/terraform init
terraform -chdir=infra/terraform plan -var-file=production.tfvars
```

The certificate and CloudFront alias were activated before enabling the canonical redirect. No database, Lambda or bucket was replaced. The final Terraform plan reports no changes.

## Verification

Custom-domain HTTPS, health, SPA routes, GraphQL origin handling, Google callback configuration and secure OAuth cookies pass. Old frontend URLs redirect with group paths and already encoded repeated query values preserved. The two CloudFront regression tests pass. The full current workspace test run has one unrelated rendering failure caused by concurrent logo capitalization changes; this domain update did not republish the frontend bundle.
