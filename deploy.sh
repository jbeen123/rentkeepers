#!/bin/bash
# RentKeepers Deployment Script for Railway
# Usage: ./deploy.sh

set -e  # Exit on any error

echo "═══════════════════════════════════════════════════════════════"
echo "  🏠 RentKeepers Deployment Script"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}▶ Checking prerequisites...${NC}"

if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}Railway CLI not found. Installing...${NC}"
    npm install -g @railway/cli
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is required but not installed.${NC}"
    exit 1
fi

# Check if logged into Railway
echo -e "${BLUE}▶ Checking Railway authentication...${NC}"
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged into Railway.${NC}"
    echo "Please login:"
    railway login
fi

echo -e "${GREEN}✓ Authenticated as:$(railway whoami 2>/dev/null)${NC}"

# Git status check
echo -e "${BLUE}▶ Checking git status...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes.${NC}"
    read -p "Commit changes before deploying? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add -A
        read -p "Enter commit message: " msg
        git commit -m "${msg:-Deploy update}"
        git push origin main
        echo -e "${GREEN}✓ Changes committed and pushed${NC}"
    else
        echo -e "${YELLOW}⚠️  Continuing with uncommitted changes...${NC}"
    fi
else
    echo -e "${GREEN}✓ Working tree clean${NC}"
fi

# Check for existing Railway project
echo -e "${BLUE}▶ Checking for existing Railway project...${NC}"
if [ -f ".railway/config.json" ]; then
    echo -e "${GREEN}✓ Found existing Railway project${NC}"
    PROJECT_NAME=$(grep -o '"projectId":"[^"]*"' .railway/config.json 2>/dev/null | cut -d'"' -f4 || echo "unknown")
    echo "  Project ID: $PROJECT_NAME"
else
    echo -e "${YELLOW}⚠️  No Railway project linked${NC}"
    echo ""
    echo -e "${BLUE}Choose deployment option:${NC}"
    echo "  1) Create new Railway project (recommended)"
    echo "  2) Link to existing Railway project"
    echo "  3) Exit"
    echo ""
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1)
            echo -e "${BLUE}▶ Creating new Railway project...${NC}"
            echo "Please enter a project name (default: rentkeepers):"
            read -r project_name
            project_name=${project_name:-rentkeepers}
            
            # Create project via Railway API
            echo -e "${YELLOW}Creating project '$project_name'...${NC}"
            echo -e "${YELLOW}Note: If this fails, please create manually at https://railway.app/new${NC}"
            
            # Try to create using railway CLI
            railway link 2>/dev/null || true
            ;;
        2)
            echo "Please provide your Railway project ID:"
            read -r project_id
            railway link --project "$project_id"
            ;;
        *)
            echo "Exiting..."
            exit 0
            ;;
    esac
fi

# Environment variables setup
echo ""
echo -e "${BLUE}▶ Setting up environment variables...${NC}"

# Generate secret key if not exists
SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")

echo "The following environment variables will be set:"
echo ""
echo "  Required:"
echo "    - SECRET_KEY (auto-generated)"
echo "    - DATABASE_URL (auto-set by Railway PostgreSQL)"
echo ""
echo "  Optional (for email reminders):"
echo "    - MAIL_USERNAME (your Gmail address)"
echo "    - MAIL_PASSWORD (Gmail App Password, NOT your regular password)"
echo ""
echo "  Optional (for Stripe payments):"
echo "    - STRIPE_SECRET_KEY"
echo "    - STRIPE_PUBLISHABLE_KEY"
echo "    - STRIPE_WEBHOOK_SECRET"
echo "    - STRIPE_PRICE_MONTHLY"
echo ""

read -p "Configure environment variables now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Set required vars
    railway variables set SECRET_KEY="$SECRET_KEY"
    echo -e "${GREEN}✓ SECRET_KEY set${NC}"
    
    # Ask for optional vars
    read -p "Set up Gmail for email reminders? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Gmail address: " gmail
        read -sp "Gmail App Password (get at myaccount.google.com/apppasswords): " gmail_pass
        echo
        
        railway variables set MAIL_USERNAME="$gmail"
        railway variables set MAIL_PASSWORD="$gmail_pass"
        railway variables set MAIL_SERVER="smtp.gmail.com"
        railway variables set MAIL_PORT="587"
        railway variables set MAIL_USE_TLS="true"
        echo -e "${GREEN}✓ Email configuration set${NC}"
    fi
    
    read -p "Set up Stripe for payments? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Stripe Secret Key (sk_test_... or sk_live_...): " stripe_secret
        read -p "Stripe Publishable Key (pk_test_... or pk_live_...): " stripe_pub
        read -p "Stripe Webhook Secret (whsec_...): " stripe_webhook
        read -p "Stripe Monthly Price ID (price_...): " stripe_price
        
        railway variables set STRIPE_SECRET_KEY="$stripe_secret"
        railway variables set STRIPE_PUBLISHABLE_KEY="$stripe_pub"
        railway variables set STRIPE_WEBHOOK_SECRET="$stripe_webhook"
        railway variables set STRIPE_PRICE_MONTHLY="$stripe_price"
        echo -e "${GREEN}✓ Stripe configuration set${NC}"
    fi
fi

# Check if PostgreSQL database exists
echo ""
echo -e "${BLUE}▶ Checking PostgreSQL database...${NC}"
if railway variables get DATABASE_URL &>/dev/null; then
    echo -e "${GREEN}✓ DATABASE_URL already set${NC}"
else
    echo -e "${YELLOW}⚠️  No DATABASE_URL found.${NC}"
    echo "You need to add a PostgreSQL database:"
    echo ""
    echo "  1. Go to https://railway.app/dashboard"
    echo "  2. Select your project"
    echo "  3. Click '+ New' → 'Database' → 'Add PostgreSQL'"
    echo "  4. Railway will automatically set DATABASE_URL"
    echo ""
    read -p "Press Enter when PostgreSQL is added (or Ctrl+C to skip)..."
fi

# Deploy
echo ""
echo -e "${BLUE}▶ Deploying to Railway...${NC}"
echo "  This may take 2-5 minutes..."
echo ""

if railway up --detach; then
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ Deployment successful!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Get deployment URL
    echo -e "${BLUE}Getting deployment URL...${NC}"
    railway status 2>/dev/null || echo "Check your Railway dashboard for the URL"
    
    echo ""
    echo "Your app should be live at:"
    echo "  https://rentkeepers.up.railway.app (or similar)"
    echo ""
    echo "Next steps:"
    echo "  1. Visit your Railway dashboard to see the live URL"
    echo "  2. Set up custom domain (Settings → Domains)"
    echo "  3. Configure Stripe webhooks (if using Stripe)"
    echo ""
    echo -e "${BLUE}View logs:${NC} railway logs"
    echo -e "${BLUE}View dashboard:${NC} https://railway.app/dashboard"
    
else
    echo ""
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ❌ Deployment failed${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Common issues:"
    echo "  - Not logged into Railway: railway login"
    echo "  - No project linked: railway link"
    echo "  - Missing DATABASE_URL: Add PostgreSQL database"
    echo ""
    echo "For help, visit: https://docs.railway.app/"
    exit 1
fi