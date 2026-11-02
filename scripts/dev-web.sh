#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
api_origin="$(bash scripts/terraform-env.sh dev output web_url)"
VITE_DEV_API_ORIGIN="$api_origin" npm run dev -w @tingting/web
