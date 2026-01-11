#!/bin/bash
# Quick script to set Railway environment variables
# Usage: ./SET_ENV_VARIABLES.sh

echo "🚀 Setting Railway Environment Variables..."
echo ""

cd backend

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it with: npm install -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Run: railway login"
    exit 1
fi

echo "Setting environment variables..."
echo ""

# Set variables (replace with your actual values)
railway variables set SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co

echo "⚠️  IMPORTANT: You need to set these manually with your actual keys:"
echo ""
echo "   railway variables set SUPABASE_SERVICE_KEY=your_service_role_key"
echo "   railway variables set OPENAI_API_KEY=your_openai_key"
echo ""
echo "To get SUPABASE_SERVICE_KEY:"
echo "   1. Go to https://app.supabase.com"
echo "   2. Select your project"
echo "   3. Settings → API"
echo "   4. Copy the 'service_role' key (NOT anon key!)"
echo ""

railway variables set GPT_MODEL=gpt-4o-mini
railway variables set PORT=8000
railway variables set ENVIRONMENT=production

echo ""
echo "✅ Basic variables set!"
echo ""
echo "📋 Current variables:"
railway variables

echo ""
echo "⚠️  Don't forget to set SUPABASE_SERVICE_KEY and OPENAI_API_KEY manually!"
