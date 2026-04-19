#!/bin/bash
#
# Complete Deployment Script for RentKeepers
# This will guide you through deploying to Railway

set -e

echo "=========================================="
echo "RENTKEEPERS DEPLOYMENT"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Verify Railway CLI
echo -e "${BLUE}Step 1: Verifying Railway CLI...${NC}"
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi
echo -e "${GREEN}✓ Railway CLI ready${NC}"
echo ""

# Step 2: Login Check
echo -e "${BLUE}Step 2: Checking Railway login...${NC}"
if ! railway whoami &> /dev/null; then
    echo "Please login to Railway:"
    echo "  railway login"
    echo ""
    echo "This will open a browser window."
    echo "After logging in, run this script again."
    exit 1
fi
echo -e "${GREEN}✓ Logged in as:$(railway whoami 2>/dev/null | grep -o '[^:]*$')${NC}"
echo ""

# Step 3: Project Setup
echo -e "${BLUE}Step 3: Setting up project...${NC}"
if [ ! -f ".railway/config.json" ]; then
    echo "Creating new Railway project..."
    railway init --name "rentkeepers"
else
    echo -e "${GREEN}✓ Project already linked${NC}"
fi
echo ""

# Step 4: Environment Variables Check
echo -e "${BLUE}Step 4: Checking environment variables...${NC}"
echo "You'll need to set these in Railway dashboard:"
echo "  - SECRET_KEY (generate new)"
echo "  - STRIPE_SECRET_KEY"
echo "  - STRIPE_PUBLISHABLE_KEY"
echo "  - STRIPE_WEBHOOK_SECRET"
echo "  - MAIL_USERNAME (optional)"
echo "  - MAIL_PASSWORD (optional)"
echo ""

# Step 5: Deploy
echo -e "${BLUE}Step 5: Deploying to Railway...${NC}"
echo "This will:"
echo "  - Build the Docker image"
echo "  - Deploy to Railway"
echo "  - Add PostgreSQL database"
echo ""
read -p "Continue with deployment? (y/N): " confirm
if [[ $confirm == [yY] ]]; then
    echo ""
    echo "Deploying..."
    railway up
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ DEPLOYED SUCCESSFULLY!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    # Get the domain
    echo "Your app URL:"
    railway domain 2>/dev/null || echo "  Check Railway dashboard for URL"
    echo ""
    
    echo "Next steps:"
    echo "  1. Set environment variables in Railway dashboard"
    echo "  2. Add PostgreSQL database"
    echo "  3. Configure Stripe webhook"
    echo "  4. Deploy frontend to Vercel"
    echo ""
else
    echo "Deployment cancelled."
    exit 0
fi
