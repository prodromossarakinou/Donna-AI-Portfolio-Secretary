#!/usr/bin/env bash
set -euo pipefail

CONFIG="$(dirname "$0")/deploy.local"
if [ -f "$CONFIG" ]; then
  # shellcheck disable=SC1090
  . "$CONFIG"
fi

: "${DEPLOY_TARGET:?Set DEPLOY_TARGET (in scripts/deploy.local or the environment), e.g. user@server}"
: "${DEPLOY_PATH:?Set DEPLOY_PATH (in scripts/deploy.local or the environment), e.g. /opt/donna}"

SSH_CMD=(ssh)
if [ -n "${DEPLOY_KEY:-}" ]; then
  SSH_CMD=(ssh -i "${DEPLOY_KEY}" -o IdentitiesOnly=yes)
fi

cd "$(dirname "$0")/.."

rsync -az --human-readable --itemize-changes \
  -e "${SSH_CMD[*]}" \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude '.next/' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude '.DS_Store' \
  --exclude 'scripts/deploy.local' \
  --exclude '.setup-answers' \
  ./ "${DEPLOY_TARGET}:${DEPLOY_PATH}/"

rsync -az --delete --human-readable --itemize-changes \
  -e "${SSH_CMD[*]}" \
  --exclude '.DS_Store' \
  ./src/ "${DEPLOY_TARGET}:${DEPLOY_PATH}/src/"

if [ "${1:-}" = "--sync-only" ]; then
  exit 0
fi

"${SSH_CMD[@]}" "${DEPLOY_TARGET}" "cd '${DEPLOY_PATH}' && docker compose --profile prod up -d --build && docker compose --profile prod ps"
