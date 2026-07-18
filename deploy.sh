#!/usr/bin/env bash
# Gemystic deploy script (Trust-Agent pattern). Runs on ronserver2 from inside
# the app dir at /data/www/main/gemystic.
#
#   cd /data/www/main/gemystic && ./deploy.sh
#
# PM2 process: gem-main (port 3100), nginx: gems.cryptool.io

set -euo pipefail

APP_DIR="${APP_DIR:-$(pwd)}"
PM2_NAME="gem-main"
BRANCH="main"

if [[ "$(id -u)" = "0" ]]; then
  echo "ERROR: Do not run this script as root or with sudo." >&2
  exit 1
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "ERROR: $APP_DIR is not a git checkout." >&2
  exit 3
fi

echo "════════════════════════════════════════════════════════"
echo "  Gemystic deploy"
echo "    dir:    $APP_DIR"
echo "    branch: $BRANCH"
echo "    pm2:    $PM2_NAME"
echo "════════════════════════════════════════════════════════"

cd "$APP_DIR"

echo "[1/6] Pulling latest from origin/$BRANCH…"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "[2/6] Installing dependencies…"
npm install

echo "[3/6] Applying database migrations…"
# The Prisma CLI reads .env, not .env.local; export the URL explicitly.
export DATABASE_URL="$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-)"
npx prisma migrate deploy

echo "[4/6] Building Next.js (standalone)…"
npm run build

echo "[5/6] Copying static assets into the standalone bundle…"
cp -r .next/static .next/standalone/.next/static
[ -d public ] && cp -r public .next/standalone/public || true
cp .env.local .next/standalone/.env.local || true

echo "[6/6] Restarting PM2 process: $PM2_NAME"
pm2 restart "$PM2_NAME"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Deploy complete"
echo "════════════════════════════════════════════════════════"
pm2 list
