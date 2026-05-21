#!/usr/bin/env bash
set -euo pipefail

REPO="$1"
if [ -z "${REPO:-}" ]; then
  echo "Usage: $0 owner/repo"
  exit 1
fi

# Run from repo root
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -d .git ]; then
  git init
fi
git add -A
git commit -m "Initial commit" || true

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install from https://cli.github.com/ or use the token script."
  exit 2
fi

echo "Creating GitHub repo via gh: $REPO"
gh repo create "$REPO" --public --source=. --remote=origin --push

echo "Done. Remote origin set to: $(git remote get-url origin)"
