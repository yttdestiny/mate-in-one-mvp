#!/usr/bin/env bash
set -euo pipefail

REPO="$1" # owner/repo
TOKEN="$2"
if [ -z "${REPO:-}" ] || [ -z "${TOKEN:-}" ]; then
  echo "Usage: $0 owner/repo GITHUB_TOKEN"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -d .git ]; then
  git init
fi
git add -A
git commit -m "Initial commit" || true

REPO_NAME="${REPO#*/}"
echo "Creating GitHub repo via API: $REPO_NAME"
curl -s -H "Authorization: token $TOKEN" \
  -d "{\"name\": \"$REPO_NAME\", \"private\": false}" \
  https://api.github.com/user/repos

REMOTE_URL="https://$TOKEN@github.com/$REPO.git"
git remote add origin "$REMOTE_URL" 2>/dev/null || git remote set-url origin "$REMOTE_URL"
git push -u origin HEAD:main

echo "Pushed to https://github.com/$REPO"
