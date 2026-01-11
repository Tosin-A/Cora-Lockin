# Railway Environment Variables Setup Guide

## ⚠️ IMPORTANT SECURITY NOTE

**DO NOT commit API keys to your repository!** The keys in `DEPLOYMENT_GUIDE.md` are examples. You've already added your keys there - please remove them from the file and use one of the methods below to set them securely in Railway.

---

## Method 1: Using Railway Dashboard (Easiest)

1. **Go to Railway Dashboard:**
   - Visit [railway.app](https://railway.app)
   - Select your project: `coresense-backend`

2. **Navigate to Variables:**
   - Click on your service (backend)
   - Go to the **"Variables"** tab

3. **Add Each Variable:**
   Click **"+ New Variable"** for each of these:

   ```
   Name: SUPABASE_URL
   Value: https://ngcmutnfqelsqiuitcfw.supabase.co
   ```

   ```
   Name: SUPABASE_SERVICE_KEY
   Value: [Get from Supabase Dashboard → Settings → API → service_role key (NOT anon key!)]
   ```

   ```
   Name: OPENAI_API_KEY
   Value: sk-proj-... (your OpenAI API key)
   ```

   ```
   Name: GPT_MODEL
   Value: gpt-4o-mini
   ```

   ```
   Name: PORT
   Value: 8000
   ```

   ```
   Name: ENVIRONMENT
   Value: production
   ```

4. **Save and Redeploy:**
   - Railway will automatically redeploy when you save variables

---

## Method 2: Using Railway CLI

### Step 1: Set Variables One by One

```bash
cd backend

# Set Supabase URL
railway variables set SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co

# Set Supabase Service Key (IMPORTANT: Get the service_role key, not anon key!)
railway variables set SUPABASE_SERVICE_KEY=your_service_role_key_here

# Set OpenAI API Key
railway variables set OPENAI_API_KEY=your_openai_api_key_here

# Set other variables
railway variables set GPT_MODEL=gpt-4o-mini
railway variables set PORT=8000
railway variables set ENVIRONMENT=production
```

### Step 2: Verify Variables Are Set

```bash
railway variables
```

This will list all your environment variables.

---

## Method 3: Using Railway CLI with .env File (Bulk Upload)

### Step 1: Create a `.env` file (DO NOT COMMIT THIS!)

```bash
cd backend
cat > .env.railway << EOF
SUPABASE_URL=https://ngcmutnfqelsqiuitcfw.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
OPENAI_API_KEY=your_openai_key_here
GPT_MODEL=gpt-4o-mini
PORT=8000
ENVIRONMENT=production
EOF
```

### Step 2: Upload to Railway

```bash
railway variables --file .env.railway
```

### Step 3: Delete the file (for security)

```bash
rm .env.railway
```

---

## 🔑 How to Get Your Supabase Service Key

⚠️ **CRITICAL**: You need the **service_role** key, NOT the anon key!

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `ngcmutnfqelsqiuitcfw`
3. Click **Settings** (gear icon) → **API**
4. Scroll down to **"Project API keys"**
5. Copy the **`service_role`** key (the secret one, not the anon/public key)
6. This key should start with `eyJhbGci...` and contain `"role":"service_role"` when decoded

**Why service_role?**
- The service_role key bypasses Row Level Security (RLS)
- Required for backend operations that need full database access
- **NEVER expose this key** in client-side code or mobile apps!

---

## ✅ Verify Variables Are Set Correctly

```bash
# Check all variables
railway variables

# Test your backend (after deployment)
railway domain  # Get your URL
curl https://your-url.railway.app/health
```

---

## 🔒 Security Best Practices

1. ✅ **Never commit** `.env` files or API keys to git
2. ✅ Use Railway's **Variables** feature for secrets
3. ✅ Rotate keys if they're accidentally exposed
4. ✅ Use **service_role** key only in backend (never in frontend)
5. ✅ Use **anon** key in mobile app (already configured)

---

## 🐛 Troubleshooting

### "Key is not valid" Error
- ✅ Verify you copied the **service_role** key, not anon key
- ✅ Check for extra spaces or newlines when pasting
- ✅ Try setting it via Railway dashboard instead

### Variables Not Appearing
- ✅ Make sure you're in the correct project: `railway link`
- ✅ Check which service you're targeting: `railway service`
- ✅ Refresh Railway dashboard

### Build Still Fails After Setting Variables
- ✅ Check Railway logs: `railway logs`
- ✅ Verify all required variables are set: `railway variables`
- ✅ Redeploy: `railway up` or trigger redeploy in dashboard

---

## 📝 Quick Command Reference

```bash
# List all variables
railway variables

# Set a single variable
railway variables set KEY=value

# Get a variable value
railway variables get KEY

# Delete a variable
railway variables unset KEY

# View logs
railway logs

# Get your service URL
railway domain

# Redeploy
railway up
```

---

**After setting variables, your Railway deployment should work!** 🚀
