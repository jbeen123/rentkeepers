#!/bin/bash
#
# Quick Deploy Script for RentKeepers
# Usage: ./deploy.sh [railway|render|vercel]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 RentKeepers Deployment Script"
echo "================================"
echo ""

# Check if platform specified
PLATFORM=${1:-""}

if [ -z "$PLATFORM" ]; then
    echo "Select deployment platform:"
    echo "1. Railway (Recommended)"
    echo "2. Render"
    echo "3. Vercel (Frontend only)"
    echo ""
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1) PLATFORM="railway" ;;
        2) PLATFORM="render" ;;
        3) PLATFORM="vercel" ;;
        *) echo "Invalid choice"; exit 1 ;;
    esac
fi

echo ""
echo "Deploying to: ${YELLOW}$PLATFORM${NC}"
echo ""

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ .env file not found!${NC}"
    echo "Create .env file from .env.example first"
    exit 1
fi

# Check required variables
if ! grep -q "SECRET_KEY" .env || grep -q "SECRET_KEY=change_me" .env; then
    echo -e "${YELLOW}⚠ WARNING: SECRET_KEY not set properly${NC}"
    echo "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    read -p "Continue anyway? (y/N): " continue
    if [ "$continue" != "y" ]; then exit 1; fi
fi

# Deploy based on platform
case $PLATFORM in
    railway)
        echo "🚂 Deploying to Railway..."
        
        # Check Railway CLI
        if ! command -v railway &> /dev/null; then
            echo "Installing Railway CLI..."
            npm install -g @railway/cli
        fi
        
        # Check if logged in
        if ! railway whoami &> /dev/null; then
            echo "Please login to Railway:"
            railway login
        fi
        
        # Check if project linked
        if [ ! -f ".railway/config.json" ]; then
            echo "Linking project..."
            railway link
        fi
        
        # Deploy
        echo "Pushing code..."
        git push origin main
        
        echo "Deploying..."
        railway up
        
        echo ""
        echo -e "${GREEN}✅ Deployed to Railway!${NC}"
        echo ""
        echo "Get your domain:"
        echo "  railway domain"
        echo ""
        echo "View logs:"
        echo "  railway logs"
        ;;
        
    render)
        echo "🎨 Deploying to Render..."
        
        echo "Open https://dashboard.render.com"
        echo "Click 'New Web Service'"
        echo "Connect your GitHub repository"
        echo ""
        echo "Configuration:"
        echo "  Name: rentkeepers"
        echo "  Environment: Python 3"
        echo "  Build Command: pip install -r requirements.txt"
        echo "  Start Command: gunicorn --bind 0.0.0.0:\$PORT app:app"
        echo ""
        echo "Add environment variables from .env"
        echo ""
        read -p "Press Enter when done..."
        
        echo -e "${GREEN}✅ Render deployment configured!${NC}"
        ;;
        
    vercel)
        echo "▲ Deploying frontend to Vercel..."
        
        cd web
        
        # Check Vercel CLI
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm install -g vercel
        fi
        
        # Check if logged in
        if ! vercel whoami &> /dev/null; then
            echo "Please login to Vercel:"
            vercel login
        fi
        
        # Deploy
        echo "Deploying..."
        vercel --prod
        
        echo ""
        echo -e "${GREEN}✅ Frontend deployed to Vercel!${NC}"
        echo ""
        echo "Don't forget:"
        echo "  1. Set VITE_API_URL environment variable"
        echo "  2. Deploy backend separately"
        cd ..
        ;;
        
    *)
        echo -e "${RED}Unknown platform: $PLATFORM${NC}"
        echo "Usage: ./deploy.sh [railway|render|vercel]"
        exit 1
        ;;
esac

echo ""
echo "📝 Post-deployment checklist:"
echo "  [ ] Add production STRIPE keys"
echo "  [ ] Configure Stripe webhook endpoint"
echo "  [ ] Test payment with 4242 4242 4242 4242"
echo "  [ ] Enable email notifications"
echo ""
echo "📚 Full guide: DEPLOYMENT_GUIDE.md"
