#!/bin/bash
# Railway deployment script

echo "=== RentKeepers Railway Deployment ==="
echo ""

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. Commit first:"
    echo "   git add -A && git commit -m 'Ready for deployment'"
    exit 1
fi

# Check if pushed to origin
echo "📤 Pushing to GitHub..."
git push origin main

if [ $? -ne 0 ]; then
    echo "❌ Failed to push. Check your GitHub token."
    exit 1
fi

echo "✅ Code pushed to GitHub"
echo ""
echo "=== Next Steps ==="
echo ""
echo "1. Go to https://railway.app/new"
echo "2. Click 'Deploy from GitHub repo'"
echo "3. Select 'jbeen123/rentkeepers'"
echo "4. Railway will auto-detect Dockerfile and deploy"
echo ""
echo "=== Required Environment Variables ==="
echo "Add these in Railway Dashboard → Variables:"
echo ""
echo "DATABASE_URL=\${{Postgres.DATABASE_URL}}"
echo "SECRET_KEY=$(openssl rand -hex 32)"
echo "MAIL_USERNAME=your_email@gmail.com"
echo "MAIL_PASSWORD=your_app_password"
echo "STRIPE_SECRET_KEY=sk_live_..."
echo "STRIPE_PUBLISHABLE_KEY=pk_live_..."
echo "STRIPE_WEBHOOK_SECRET=whsec_..."
echo "STRIPE_PRICE_MONTHLY=price_..."
echo ""
echo "5. Add PostgreSQL: New → Database → Add PostgreSQL"
echo "6. Railway will auto-connect DATABASE_URL"
echo "7. Get your domain from Settings → Domains"
echo ""
echo "Done! Your app will be live."