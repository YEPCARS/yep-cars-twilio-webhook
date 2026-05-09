# Deploy to Railway (Step-by-Step)

## Files You Have
- `server.js` — the webhook server
- `package.json` — dependencies
- `.gitignore` — ignore node_modules

## Step 1: Create GitHub Repo (Optional but Easiest)

1. Go to github.com
2. Create new repository: `yep-cars-twilio-webhook`
3. Clone to your computer
4. Copy these 3 files into it:
   - `server.js`
   - `package.json`
   - `.gitignore`
5. Commit and push:
   ```
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

**Alternative (No GitHub):** You can upload the files directly to Railway.

---

## Step 2: Deploy to Railway

### Using GitHub (Easier):
1. Go to railway.app
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Authorize GitHub and select your `yep-cars-twilio-webhook` repo
5. Railway auto-detects Node.js and deploys
6. Click your project → Settings → "Generate Domain"
7. Copy the domain URL (looks like `yep-cars-twilio-webhook-production-xxxx.railway.app`)

### Using Upload (No GitHub):
1. Go to railway.app
2. Click "New Project"
3. Select "Empty Project"
4. Click "Add Service" → "New Service"
5. Upload these files as a zip OR paste code
6. Railway will ask for a start command: `npm install && node server.js`
7. Deploy
8. Get your public URL from "Deployments"

---

## Step 3: Add Environment Variables in Railway

1. In Railway dashboard, open your project
2. Click "Variables" or "Settings"
3. Add these 4 variables:
   ```
   TWILIO_ACCOUNT_SID = SKce0ebcc2893ec71faa03061afdd6bf72
   TWILIO_AUTH_TOKEN = kjv5uZwepN2btWdoJ4dkKWca4cagjY8s
   TWILIO_PHONE_FROM = +13342581719
   TWILIO_PHONE_TO = +13342002411
   ```
4. Save/deploy
5. Railway will redeploy with the new variables

---

## Step 4: Get Your Public URL

Once deployed:
1. Go to Deployments tab
2. Find the "Domain" (looks like `https://yep-cars-twilio-webhook-production-xxxx.railway.app`)
3. Copy it
4. Test it: open `https://yep-cars-twilio-webhook-production-xxxx.railway.app/health` in your browser
5. Should see: `{"status":"ok","timestamp":"2026-05-08..."}`

If you see that, the server is live. ✓

---

## Step 5: Give Me the URL

Once you have the public URL, send it to me in Telegram:

"Deployed to: `https://yep-cars-twilio-webhook-production-xxxx.railway.app`"

Then I'll:
1. Test it
2. Add the webhook URL to Cartesia
3. Call your agent to verify SMS works

---

## Troubleshooting

**"Cannot find module":**
- Railway didn't install npm dependencies
- Click "Redeploy" or check build logs

**"Port is already in use":**
- Shouldn't happen on Railway, but if it does, the app will use `process.env.PORT`

**"Twilio auth failed":**
- Check that env variables are spelled exactly right
- Copy-paste from here, don't retype

**Health check returns error:**
- Check Railway logs (click "Logs" tab)
- Look for error messages

---

## Cost

Railway free tier covers:
- ~1000 requests/month
- Unlimited bandwidth
- Enough for 100+ leads/month

If you exceed free tier, Railway charges ~$5/mo for overage.

For Yep Cars, you'll never exceed free tier.

---

**Questions?** Ask before deploying and I'll clarify.

**Ready?** Deploy and send me the URL.
