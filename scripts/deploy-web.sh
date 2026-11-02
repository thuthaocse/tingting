#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
environment="${1:-prod}"
npm run build
bucket=$(bash scripts/terraform-env.sh "$environment" output frontend_bucket)
distribution=$(bash scripts/terraform-env.sh "$environment" output distribution_id)
aws s3 sync apps/web/dist/ "s3://$bucket/" --exclude index.html --cache-control 'public,max-age=31536000,immutable'
aws s3 cp apps/web/dist/index.html "s3://$bucket/index.html" --cache-control 'no-cache' --content-type 'text/html; charset=utf-8'
aws cloudfront create-invalidation --distribution-id "$distribution" --paths / /index.html
