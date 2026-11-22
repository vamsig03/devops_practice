#!/usr/bin/env bash
# Runs ON the Application EC2. Jenkins streams this file over SSH, e.g.:
#   ssh ubuntu@<host> 'bash -s' -- preflight /srv/launchpad/devops_practice launchpad-api < deploy/remote-deploy.sh
#
# Actions:
#   preflight  Check tools, directories, ownership and backend/.env before anything is copied.
#   release    Install backend production dependencies, reload PM2, verify /api/health.
#
# Safety: never writes backend/.env (only reads its PORT line), never touches the database server.
# Commands get </dev/null so they cannot swallow the rest of this script from stdin.
set -euo pipefail

ACTION="${1:?usage: remote-deploy.sh <preflight|release> <app_dir> <pm2_app>}"
APP_DIR="${2:?app dir required}"
PM2_APP="${3:?pm2 app name required}"
DEPLOY_USER="$(id -un)"

fail() { echo "ERROR: $*" >&2; exit 1; }

FALLBACK_PORT=5000   # used only when backend/.env has no PORT line

# Capture first, then grep: piping straight into `grep -q` can SIGPIPE pm2 and, with pipefail, report a false "not found".
pm2_has_app() {
  local list
  list="$(pm2 jlist </dev/null 2>/dev/null)" || return 1
  grep -q "\"name\":\"${PM2_APP}\"" <<<"$list"
}

# PORT value from backend/.env (empty if not set). Reads only that line; never prints other values.
env_port() {
  { grep -E '^[[:space:]]*PORT=' "$APP_DIR/backend/.env" || true; } | tail -n 1 | sed -e 's/^[^=]*=//' -e "s/[[:space:]\"']//g"
}

preflight() {
  echo "SSH connection successful: ${DEPLOY_USER}@$(hostname)"

  for cmd in node npm pm2 rsync curl; do
    command -v "$cmd" >/dev/null 2>&1 \
      || fail "'$cmd' is not on PATH for non-interactive SSH sessions on $(hostname)"
  done
  echo "node $(node --version) | npm $(npm --version </dev/null) | pm2 $(pm2 --version </dev/null | tail -n 1)"

  [ -d "$APP_DIR/backend" ]      || fail "$APP_DIR/backend does not exist"
  [ -d "$APP_DIR/frontend" ]     || fail "$APP_DIR/frontend does not exist"
  [ -f "$APP_DIR/backend/.env" ] || fail "$APP_DIR/backend/.env is missing. Create it manually on the server."
  mkdir -p "$APP_DIR/frontend/dist"

  echo "--- Permissions (deploy user: ${DEPLOY_USER})"
  ls -ld "$APP_DIR" "$APP_DIR/backend" "$APP_DIR/frontend" "$APP_DIR/frontend/dist"
  ls -l "$APP_DIR/backend/.env"   # shows owner/mode only, never the contents

  # The deploy user must be able to create files in these folders...
  for dir in "$APP_DIR/backend" "$APP_DIR/frontend/dist"; do
    [ -w "$dir" ] || fail "${DEPLOY_USER} cannot write to $dir"
  done
  # ...and must own every existing file rsync/npm will update (rsync sets times/modes; npm ci replaces node_modules).
  # `|| true` keeps an early `head` exit (SIGPIPE) from aborting the script before the message below.
  not_owned="$( { find "$APP_DIR/backend" "$APP_DIR/frontend/dist" -path "$APP_DIR/backend/node_modules" -prune -o ! -user "$DEPLOY_USER" -print
                  [ ! -d "$APP_DIR/backend/node_modules" ] || find "$APP_DIR/backend/node_modules" -maxdepth 2 ! -user "$DEPLOY_USER" -print; } 2>&1 | head -n 10 )" || true
  if [ -n "$not_owned" ]; then
    echo "$not_owned" >&2
    fail "the paths above are not owned by ${DEPLOY_USER}; fix ownership on the server first"
  fi

  # PM2 is started/reloaded from ecosystem.config.cjs, so it must exist and define this app name.
  [ -f "$APP_DIR/ecosystem.config.cjs" ] || fail "$APP_DIR/ecosystem.config.cjs is missing"
  grep -q "name:[[:space:]]*['\"]${PM2_APP}['\"]" "$APP_DIR/ecosystem.config.cjs" \
    || fail "$APP_DIR/ecosystem.config.cjs does not define an app named '${PM2_APP}'"
  if pm2_has_app; then
    echo "PM2 process '${PM2_APP}' found; release will reload it."
  else
    echo "PM2 process '${PM2_APP}' not running yet; release will start it once from ecosystem.config.cjs."
  fi

  port="$(env_port)"
  if [ -n "$port" ]; then
    echo "backend/.env sets PORT=${port}; health check will use it."
  else
    echo "WARNING: backend/.env has no PORT line. Health check falls back to ${FALLBACK_PORT}, but backend/src/config.js defaults to 5001. Add PORT=${FALLBACK_PORT} to backend/.env."
  fi
  echo "Pre-flight checks passed."
}

release() {
  cd "$APP_DIR/backend"
  if [ -f package-lock.json ]; then
    echo "--- npm ci --omit=dev (package-lock.json present)"
    npm ci --omit=dev --no-fund </dev/null
  else
    echo "--- npm install --omit=dev (no package-lock.json)"
    npm install --omit=dev --no-fund </dev/null
  fi

  # One command for both cases: reloads the existing process by name, or starts it if missing (never a duplicate).
  # --update-env re-applies the env block from ecosystem.config.cjs (NODE_ENV=production) instead of keeping
  # whatever env the process was first started with. backend/.env itself is re-read by dotenv on every start.
  cd "$APP_DIR"
  echo "--- pm2 startOrReload ecosystem.config.cjs --only ${PM2_APP} --update-env"
  pm2 startOrReload ecosystem.config.cjs --only "$PM2_APP" --update-env </dev/null
  pm2 save </dev/null

  if command -v systemctl >/dev/null 2>&1 && systemctl is-enabled "pm2-${DEPLOY_USER}" >/dev/null 2>&1; then
    echo "PM2 boot startup is enabled (pm2-${DEPLOY_USER}.service)."
  else
    echo "WARNING: PM2 boot startup is not enabled. Run 'pm2 startup' once on the server (needs sudo)."
  fi

  # Health check on the port the API actually uses: PORT from backend/.env, else 5000.
  port="$(env_port)"
  port="${port:-$FALLBACK_PORT}"
  url="http://127.0.0.1:${port}/api/health"
  echo "--- Health check: ${url}"
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if body="$(curl -fsS --max-time 5 "$url" 2>/dev/null)" && echo "$body" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"'; then
      echo "Health check passed (attempt ${attempt}): ${body}"
      return 0
    fi
    sleep 3
  done
  echo "--- Recent PM2 logs for ${PM2_APP}" >&2
  pm2 logs "$PM2_APP" --lines 30 --nostream </dev/null >&2 || true
  fail "health check failed at ${url}"
}

case "$ACTION" in
  preflight) preflight ;;
  release)   release ;;
  *)         fail "unknown action '${ACTION}' (expected preflight or release)" ;;
esac
