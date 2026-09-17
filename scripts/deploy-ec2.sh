#!/usr/bin/env bash
# ==============================================================================
# Production Deployment Script: AWS EC2 with PM2 Zero-Downtime Cluster
# Typesafe Migration Guard Gatekeeper
# ==============================================================================

set -euo pipefail

APP_NAME="typesafe-migration-guard"
APP_DIR="/var/www/typesafe-migration-guard"
DEPLOY_ENV="${ENVIRONMENT:-production}"
SIMULATE=false

# Check for simulation mode (e.g. within CI runners)
if [[ "${1:-}" == "--simulate" ]]; then
  SIMULATE=true
fi

echo "========================================================"
echo "🚀 Deploying $APP_NAME to AWS EC2 [Env: $DEPLOY_ENV]"
echo "========================================================"

# Step 1: Pre-Flight Safety Verification
echo "🛡️  Step 1: Running TypeSafe AI Migration Guard..."
if [[ -f "./scripts/check-migrations.ts" ]]; then
  if npm run guard:check ${TARGET_MIGRATION:-}; then
    echo "✅ Migration Guard clearance granted: All migrations verified SAFE."
  else
    echo "❌ CRITICAL: Destructive migration detected! Halting EC2 deployment immediately."
    exit 1
  fi
fi

if [ "$SIMULATE" = true ]; then
  echo "ℹ️  Simulation mode active: Skipping remote SSH commands."
  echo "✅ Simulated PM2 zero-downtime deployment completed successfully."
  exit 0
fi

# Step 2: Navigate to application directory
echo "📂 Step 2: Synchronizing application directory..."
cd "$APP_DIR"

# Step 3: Fetch latest release from Git
echo "🔄 Step 3: Pulling latest release from main branch..."
git fetch origin main
git reset --hard origin/main

# Step 4: Install production dependencies
echo "📦 Step 4: Installing production dependencies..."
npm ci --only=production

# Step 5: Generate Prisma Client & Run Verified Migrations
echo "🗄️  Step 5: Executing verified Prisma migrations on Supabase PostgreSQL..."
npm run prisma:generate
npx prisma migrate deploy

# Step 6: Build Next.js production artifacts
echo "🏗️  Step 6: Building Next.js application..."
npm run build

# Step 7: Zero-Downtime PM2 Reload
echo "⚡ Step 7: Triggering PM2 zero-downtime cluster reload..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env
else
  pm2 start npm --name "$APP_NAME" -i max -- run start
fi

# Step 8: Post-Deployment Health Check
echo "🩺 Step 8: Verifying application health endpoint..."
sleep 3
HEALTH_CHECK_URL="http://127.0.0.1:3000/api/migration-guard"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" || echo "000")

if [[ "$HTTP_STATUS" == "200" ]]; then
  echo "✅ EC2 Deployment successful! Guardian service is healthy (HTTP 200)."
  pm2 save
  exit 0
else
  echo "❌ Deployment health check failed with status $HTTP_STATUS! Triggering rollback..."
  # Rollback logic
  git checkout HEAD@{1}
  npm run build
  pm2 reload "$APP_NAME"
  exit 1
fi
