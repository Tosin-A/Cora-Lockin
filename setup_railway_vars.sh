#!/bin/bash
# Script to set Railway environment variables
# Usage: ./setup_railway_vars.sh

echo "🚂 Railway Environment Variables Setup"
echo "========================================"
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed!"
    echo "Install it with: npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway!"
    echo "Login with: railway login"
    exit 1
fi

echo "⚠️  SECURITY WARNING:"
echo "You need the SUPABASE_SERVICE_KEY (service_role key), NOT the anon key!"
echo "Get it from: Supabase Dashboard → Settings → API → service_role key"
echo ""
read -p "Press Enter to continue..."

cd backend

# Set variables with prompts
echo ""
echo "Setting environment variables..."
echo ""

read -p "Enter SUPABASE_SERVICE_KEY (service_role key): " SUPABASE_SERVICE_KEY
railway variables set SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY"

read -p "Enter OPENAI_API_KEY: " OPENAI_API_KEY
railway variables set OPENAI_API_KEY="$OPENAI_API_KEY"

# Set variables that don't need secrets
railway variables set SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co
railway variables set GPT_MODEL=gpt-4o-mini
railway variables set PORT=8000
railway variables set ENVIRONMENT=production

echo ""
echo "✅ All variables set!"
echo ""
echo "Verifying variables..."
railway variables

echo ""
echo "🚀 Next steps:"
echo "1. Verify all variables are correct: railway variables"
echo "2. Deploy: railway up"
echo "3. Get your URL: railway domain"
echo "4. Test: curl https://your-url.railway.app/health"
