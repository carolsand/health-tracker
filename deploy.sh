#!/usr/bin/env bash
# Deploy health.carolsanders.org: push main to GitHub, then on the VPS back up the
# database, fast-forward the checkout, and restart the server only if server/ changed.
#
# Usage: ./deploy.sh
#
# The HTML app is re-read by Express on every request, so app-only changes go live
# without a restart. Anything under server/ triggers `pm2 restart`, and a change to
# server/package*.json also runs `npm install` first.
set -euo pipefail

VPS="${VPS:-jodicas@vps33513.dreamhostps.com}"
APP_DIR="${APP_DIR:-/home/jodicas/health.carolsanders.org}"
SITE_URL="https://health.carolsanders.org/"
KEEP_BACKUPS=10

cd "$(dirname "$0")"

# ---- Local checks ----
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != "main" ]; then
  echo "✗ On branch '$branch' — switch to main before deploying." >&2; exit 1
fi
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "✗ Uncommitted changes — commit them first so the VPS gets exactly what you tested." >&2
  git status --short >&2; exit 1
fi

echo "→ Pushing main to GitHub"
git push origin main

# ---- Remote: backup, pull, install, restart ----
echo "→ Deploying on $VPS"
ssh -o BatchMode=yes "$VPS" APP_DIR="$APP_DIR" KEEP_BACKUPS="$KEEP_BACKUPS" bash -s <<'REMOTE'
set -euo pipefail
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh" >/dev/null

cd "$APP_DIR"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "✗ The VPS checkout has local edits — refusing to overwrite them:" >&2
  git status --short >&2; exit 1
fi

# Online SQLite backup (safe while the app is running, unlike copying WAL files).
backup_dir="$HOME/health-tracker-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"
(cd server && node -e '
  require("dotenv").config({ path: ".env" });
  const path = require("path");
  const db = require("better-sqlite3")(path.resolve(process.env.DB_PATH || "./data/tracker.db"), { readonly: true });
  db.backup(process.argv[1]).then(() => db.close());
' "$backup_dir/tracker.db")
echo "  ✓ Database backed up to $backup_dir"
ls -1dt "$HOME"/health-tracker-backups/*/ | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -rf

old=$(git rev-parse HEAD)
git pull --ff-only -q origin main
new=$(git rev-parse HEAD)
if [ "$old" = "$new" ]; then
  echo "  ✓ Already up to date at $(git log --oneline -1)"
else
  echo "  ✓ Updated $(git rev-parse --short "$old") → $(git log --oneline -1)"
  changed=$(git diff --name-only "$old" "$new")
  if echo "$changed" | grep -q '^server/package'; then
    echo "  → server dependencies changed, running npm install"
    (cd server && npm install --no-audit --no-fund --silent)
  fi
  if echo "$changed" | grep -q '^server/'; then
    echo "  → server code changed, restarting pm2"
    (cd server && npx pm2 restart health-tracker --update-env >/dev/null && npx pm2 save >/dev/null)
  else
    echo "  ✓ App-only change — no restart needed"
  fi
  echo "  ↺ To roll back: ssh $USER@$(hostname -f) 'cd $APP_DIR && git reset --hard $(git rev-parse --short "$old")' (then pm2 restart if server/ changed)"
fi

for _ in $(seq 1 10); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8317/ || true)
  [ "$code" = "200" ] && break
  sleep 1
done
if [ "$code" != "200" ]; then
  echo "✗ App not answering on port 8317 (HTTP $code). Check: cd $APP_DIR/server && npx pm2 logs health-tracker" >&2
  exit 1
fi
echo "  ✓ App answering on port 8317"
REMOTE

# ---- Verify the public site serves exactly the committed file ----
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
curl -fsS "$SITE_URL" -o "$tmp"
if cmp -s "$tmp" strength-nutrition-tracker.html; then
  echo "✓ Live: $SITE_URL is serving $(git log --oneline -1)"
else
  echo "✗ $SITE_URL does not match the local strength-nutrition-tracker.html — investigate before assuming the deploy worked." >&2
  exit 1
fi
