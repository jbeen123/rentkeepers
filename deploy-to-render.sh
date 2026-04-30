#!/bin/bash

# RentKeepers - Deploy to Render
# This script prepares your app for Render deployment

set -e

echo "🚀 RentKeepers - Render Deployment Prep"
echo "========================================"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit - Ready for Render deployment"
fi

# Check for remote
echo ""
echo "🔗 Checking Git remote..."
if ! git remote get-url origin &> /dev/null; then
    echo "⚠️  No remote repository configured."
    echo ""
    echo "Create a repository on GitHub or GitLab, then run:"
    echo "   git remote add origin https://github.com/yourusername/rentkeepers.git"
    echo "   git push -u origin main"
    echo ""
    read -p "Press Enter after adding remote..."
fi

# Check package.json
echo ""
echo "📋 Validating package.json..."
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

if ! grep -q '"start"' package.json; then
    echo "⚠️  Warning: 'start' script not found in package.json"
fi

# Check for render.yaml
echo ""
echo "✅ Checking render.yaml..."
if [ -f "render.yaml" ]; then
    echo "✅ render.yaml found"
else
    echo "⚠️  render.yaml not found - will use manual setup"
fi

# Check environment variables
echo ""
echo "🔐 Checking environment configuration..."
if [ -f ".env" ]; then
    echo "⚠️  .env file found - DO NOT commit this to Git!"
    echo "   You'll need to add these variables in Render dashboard"
else
    echo "ℹ️  No .env file found - you'll need to configure all variables in Render"
fi

# Git status
echo ""
echo "📊 Git Status:"
git status --short

# Push to remote
echo ""
read -p "🚀 Push to remote repository? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Pushing changes..."
    git add .
    git commit -m "Prepare for Render deployment" || echo "No changes to commit"
    git push origin main
    echo ""
    echo "✅ Pushed successfully!"
fi

# Display deployment instructions
echo ""
echo "========================================"
echo "🎉 Ready to Deploy to Render!"
echo "========================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Go to https://render.com and sign in"
echo ""
echo "2. Click 'New +' → 'Web Service'"
echo ""
echo "3. Connect your repository:"
git remote get-url origin 2>/dev/null && echo "   Repository: $(git remote get-url origin)"
echo ""
echo "4. Configure:"
echo "   - Build Command: npm install"
echo "   - Start Command: node main-server.js"
echo "   - Environment: Node"
echo ""
echo "5. Add environment variables:"
echo "   - NODE_ENV=production"
echo "   - STRIPE_SECRET_KEY=sk_test_... or sk_live_..."
echo "   - (Optional) SMTP credentials for email"
echo ""
echo "6. Click 'Create Web Service'"
echo ""
echo "7. Wait 2-5 minutes for deployment"
echo ""
echo "📖 Full guide: DEPLOY-RENDER.md"
echo ""
echo "✅ Deployment preparation complete!"
echo ""
