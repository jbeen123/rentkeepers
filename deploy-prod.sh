#!/bin/bash
# RentKeepers Production Deployment Script
# Run this to prepare for deployment

set -e

echo "🚀 RentKeepers Deployment Prep"
echo "================================"
echo ""

# Check Python version
echo "✓ Checking Python version..."
python3 --version

# Install dependencies (skip psycopg2 for local - only needed in production)
echo "✓ Installing dependencies..."
./venv/bin/pip install -r requirements.txt --no-build-isolation 2>&1 | grep -v "psycopg2" || true
./venv/bin/pip install flask sqlalchemy flask-login stripe reportlab 2>/dev/null || true

# Run database migrations
echo "✓ Running database migrations..."
./venv/bin/python migrate_database.py

# Run tests
echo "✓ Running feature tests..."
./venv/bin/python test_features.py

# Generate secret key if not exists
if ! grep -q "SECRET_KEY=" .env 2>/dev/null; then
    echo "✓ Generating SECRET_KEY..."
    SECRET=$(./venv/bin/python -c "import secrets; print(secrets.token_hex(32))")
    echo "SECRET_KEY=$SECRET" >> .env
fi

echo ""
echo "================================"
echo "✅ Deployment prep complete!"
echo ""
echo "Next steps:"
echo "1. Push to GitHub: git push"
echo "2. Deploy to Render: https://render.com"
echo "3. Upload render.yaml"
echo "4. Set Stripe keys in Render dashboard"
echo "5. Set email credentials"
echo ""
echo "Your app will be live at: https://rentkeepers.onrender.com"
