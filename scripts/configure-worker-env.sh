#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <staging|prod> <d1_database_id>" >&2
  exit 1
fi

target_env="$1"
d1_id="$2"
config="apps/worker-api/wrangler.toml"

case "$target_env" in
  staging)
    sed -i.bak "s|<STAGING_D1_DATABASE_ID>|${d1_id}|g" "$config"
    ;;
  prod)
    sed -i.bak "s|<PROD_D1_DATABASE_ID>|${d1_id}|g" "$config"
    ;;
  *)
    echo "Invalid env: $target_env" >&2
    exit 1
    ;;
esac

rm -f "${config}.bak"
echo "Updated ${config} for ${target_env}."
