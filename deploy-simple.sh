#!/bin/bash
# Simple Railway Deployment Script

set -e

echo "🚀 Deploying RentKeepers to Railway..."
echo ""

# Ensure Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Check login
if ! railway whoami &> /dev/null; then
    echo "Please login to Railway:"
    railway login
fi

# Link to project (creates if new)
railway link || echo "Creating new project..."

# Set required environment variable if not set
if ! railway variables get SECRET_KEY &>/dev/null; then
    echo "Generating SECRET_KEY..."
    SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
    railway variables set SECRET_KEY="$SECRET_KEY"
    echo "✓ SECRET_KEY set"
fi

# Deploy
echo ""
echo "Deploying..."
railway up --detach

echo ""
echo "✅ Deployment complete!"
echo ""
railway status