#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
note() { printf '  %s\n' "$1"; }

ask() {
  local prompt="$1" default="${2:-}" value
  if [ -n "$default" ]; then
    read -r -p "$prompt [$default]: " value || exit 1
    printf '%s' "${value:-$default}"
  else
    while true; do
      read -r -p "$prompt: " value || exit 1
      [ -n "$value" ] && break
    done
    printf '%s' "$value"
  fi
}

ask_secret() {
  local prompt="$1" value
  while true; do
    read -r -s -p "$prompt: " value || exit 1
    printf '\n' >&2
    [ -n "$value" ] && break
  done
  printf '%s' "$value"
}

secret() { openssl rand -base64 32 | tr -d '\n=+/' | cut -c1-40; }

ANSWERS=".setup-answers"

saved() {
  [ -f "$ANSWERS" ] || return 0
  grep -E "^$1=" "$ANSWERS" | tail -n 1 | cut -d= -f2- || true
}

remember() {
  touch "$ANSWERS"
  grep -vE "^$1=" "$ANSWERS" > "$ANSWERS.tmp" || true
  printf '%s=%s\n' "$1" "$2" >> "$ANSWERS.tmp"
  mv "$ANSWERS.tmp" "$ANSWERS"
  chmod 600 "$ANSWERS"
}

ask_saved() {
  local key="$1" prompt="$2" fallback="${3:-}" previous value
  previous="$(saved "$key")"
  value="$(ask "$prompt" "${previous:-$fallback}")"
  remember "$key" "$value"
  printf '%s' "$value"
}

command -v docker >/dev/null 2>&1 || { echo "Docker is required: https://docs.docker.com/get-docker/"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 is required."; exit 1; }
command -v openssl >/dev/null 2>&1 || { echo "openssl is required."; exit 1; }

if [ ! -f .env ]; then
  bold "Donna — first-time setup"
  note "Answers are written to .env (never committed). Secrets are not shown while you type."
  if [ -f "$ANSWERS" ]; then
    note "Found answers from an earlier run: press Enter to keep each one. Keys and secrets are always asked again."
  fi
  echo

  bold "1. Where it runs"
  APP_URL="$(ask_saved APP_URL "Public URL of the app" "http://localhost:3000")"
  APP_URL="${APP_URL%/}"
  DOMAIN="$(printf '%s' "$APP_URL" | sed -E 's#^https?://##; s#[:/].*$##')"
  echo

  bold "2. Who the profile is about"
  OWNER_NAME="$(ask_saved OWNER_NAME "Your full name")"
  OWNER_EMAIL="$(ask_saved OWNER_EMAIL "Contact email shown on the privacy page")"
  echo

  bold "3. API keys"
  note "Anthropic key: https://console.anthropic.com  (Donna's answers)"
  ANTHROPIC_API_KEY="$(ask_secret "ANTHROPIC_API_KEY")"
  note "OpenAI key: https://platform.openai.com  (embeddings only)"
  OPENAI_API_KEY="$(ask_secret "OPENAI_API_KEY")"
  echo

  bold "4. Keycloak (admin login)"
  note "The admin area signs in through your own Keycloak. A ready realm file is included:"
  note "  $(pwd)/keycloak/donna-realm.json"
  echo
  note "In the Keycloak admin console:"
  note "  a. Create realm  ->  Resource file  ->  choose donna-realm.json  ->  Create."
  note "     This creates the realm 'Donna', the client 'donna-app' and the role 'donna-admin'."
  note "  b. Clients -> donna-app -> Settings: set these to your URL, then Save:"
  note "       Valid redirect URIs:             ${APP_URL}/api/auth/callback/keycloak"
  note "       Valid post logout redirect URIs: ${APP_URL}/*"
  note "       Web origins:                     ${APP_URL}"
  note "  c. Clients -> donna-app -> Credentials: copy the Client secret (Regenerate if empty)."
  note "  d. The role: Realm roles should list 'donna-admin'."
  note "     If it does not: Realm roles -> Create role -> Role name 'donna-admin' -> Save."
  note "  e. Users -> Add user (set a password under Credentials) -> Role mapping ->"
  note "     Assign role -> pick 'donna-admin' -> Assign. Only users with this role can open /admin."
  echo
  KEYCLOAK_ISSUER="$(ask_saved KEYCLOAK_ISSUER "Keycloak issuer URL (https://<host>/realms/Donna)")"
  KEYCLOAK_ISSUER="${KEYCLOAK_ISSUER%/}"
  KEYCLOAK_CLIENT_ID="$(ask_saved KEYCLOAK_CLIENT_ID "Client ID" "donna-app")"
  KEYCLOAK_CLIENT_SECRET="$(ask_secret "Client secret")"
  ADMIN_ROLE="$(ask_saved ADMIN_ROLE "Admin role" "donna-admin")"
  echo

  POSTGRES_PASSWORD="$(secret)"
  umask 077
  cat > .env <<EOF
DOMAIN=${DOMAIN}
APP_URL=${APP_URL}
APP_PORT=3000

OWNER_NAME=${OWNER_NAME}
OWNER_EMAIL=${OWNER_EMAIL}
OWNER_PRONOUNS=he/him

POSTGRES_USER=donna
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=donna
POSTGRES_PORT=5434
DATABASE_URL=postgresql://donna:${POSTGRES_PASSWORD}@localhost:5434/donna

SESSION_SECRET=$(secret)

ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
DONNA_MODEL=claude-haiku-5-5
DONNA_GUARD_MODEL=claude-haiku-5-5
PRICE_INPUT_PER_MTOK=0.10
PRICE_OUTPUT_PER_MTOK=0.50

OPENAI_API_KEY=${OPENAI_API_KEY}
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_PRICE_PER_MTOK=0.02
RAG_TOP_K=8

MAX_MESSAGES_PER_DAY=40
MAX_TOKENS_PER_ANSWER=600
MONTHLY_COST_CAP_USD=5
RATE_LIMIT_PER_MINUTE=10

KEYCLOAK_ISSUER=${KEYCLOAK_ISSUER}
KEYCLOAK_CLIENT_ID=${KEYCLOAK_CLIENT_ID}
KEYCLOAK_CLIENT_SECRET=${KEYCLOAK_CLIENT_SECRET}
ADMIN_ROLE=${ADMIN_ROLE}
NEXTAUTH_URL=${APP_URL}
NEXTAUTH_SECRET=$(secret)
EOF
  chmod 600 .env
  bold "Saved .env"
  echo
fi

if [ ! -d knowledge ]; then
  cp -R knowledge.example knowledge
  bold "Created ./knowledge from the demo content (Alex Demo). Replace it with your own."
fi

bold "Building and starting Donna (database + app)…"
docker compose --profile prod up -d --build

APP_PORT="$(grep -E '^APP_PORT=' .env | cut -d= -f2 || true)"
APP_PORT="${APP_PORT:-3000}"
printf 'Waiting for the app'
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null "http://localhost:${APP_PORT}/" 2>/dev/null; then
    READY=1
    break
  fi
  printf '.'
  sleep 2
done
echo

if [ "${READY:-0}" != "1" ]; then
  echo "The app did not answer yet. Check: docker compose --profile prod logs app --tail 50"
  exit 1
fi

bold "Donna is running:  http://localhost:${APP_PORT}"
note "Next steps:"
note "  1. Open /admin and sign in with your Keycloak user."
note "  2. Knowledge -> 'Import /knowledge folder'  (loads ./knowledge and builds the search index)."
note "  3. Access links -> create a code, then open the site with it."
note "Stop:  docker compose --profile prod down      Logs:  docker compose --profile prod logs -f app"
