#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "[gitleaks] not installed. Install with: brew install gitleaks" >&2
  exit 1
fi

# gitleaks v8+ command set
if gitleaks dir --help >/dev/null 2>&1; then
  exec gitleaks dir . --redact --config .gitleaks.toml
fi

# older gitleaks fallback
if gitleaks detect --help >/dev/null 2>&1; then
  exec gitleaks detect --source . --redact --config .gitleaks.toml
fi

exec gitleaks protect --redact --config .gitleaks.toml
