#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <dev|prod> <init|plan|apply|output> [output-name]" >&2
  exit 2
fi

environment="$1"
action="$2"
terraform_dir="infra/terraform"

case "$environment" in
  dev)
    workspace="dev"
    var_file="dev.tfvars"
    ;;
  prod|production)
    environment="prod"
    workspace="prod"
    var_file="prod.tfvars"
    ;;
  *)
    echo "Environment must be dev or prod." >&2
    exit 2
    ;;
esac

plan_file="/private/tmp/tingting-${environment}.tfplan"

case "$action" in
  init)
    terraform -chdir="$terraform_dir" init
    ;;
  plan|apply|output)
    if ! terraform -chdir="$terraform_dir" workspace select "$workspace" >/dev/null 2>&1; then
      terraform -chdir="$terraform_dir" workspace new "$workspace"
    fi
    case "$action" in
      plan)
        terraform -chdir="$terraform_dir" plan -var-file="$var_file" -out="$plan_file"
        ;;
      apply)
        if [[ ! -f "$plan_file" ]]; then
          echo "Create and review the environment plan first: $0 $environment plan" >&2
          exit 1
        fi
        terraform -chdir="$terraform_dir" apply "$plan_file"
        rm -f "$plan_file"
        ;;
      output)
        if [[ $# -ne 3 ]]; then
          echo "Usage: $0 <dev|prod> output <output-name>" >&2
          exit 2
        fi
        terraform -chdir="$terraform_dir" output -raw "$3"
        ;;
    esac
    ;;
  *)
    echo "Action must be init, plan, apply, or output." >&2
    exit 2
    ;;
esac
