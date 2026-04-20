# FleetGuard — Deployment Guide

## What you have
A full web app with:
- User login / accounts
- Fleet management (add/edit/delete trucks)
- AI-powered photo inspection (Claude vision)
- Baseline vs new damage comparison
- Damage history & CSV export
- Mobile-friendly layout (works on iPhone/Android browsers)

---

## Step 1 — Set up your Supabase database

1. Go to https://supabase.com/dashboard and open your project
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Open the file `supabase-schema.sql` from this folder
5. Copy the entire contents and paste into the SQL editor
6. Click **Run**

You should see "Success" — this creates all your tables and storage.

---

## Step 2 — Get your Anthropic API key

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Click **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)

---

## Step 3 — Deploy to Vercel

### Option A: Deploy via GitHub (recommended)

1. Create a free account at https://github.com if you don't have one
2. Create a new repository called `fleetguard`
3. Upload all these files to that repository
4. Go to https://vercel.com/dashboard
5. Click **Add New → Project**
6. Connect your GitHub account and select the `fleetguard` repo
7. Before clicking Deploy, click **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://mpwkpctxfbmnlupvnklf.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your full key)
   - `ANTHROPIC_API_KEY` = your key from Step 2
8. Click **Deploy**

### Option B: Deploy via Vercel CLI

1. Install Node.js from https://nodejs.org (if not installed)
2. Open Terminal / Command Prompt
3. Navigate to this folder: `cd path/to/fleetguard`
4. Run: `npm install -g vercel`
5. Run: `vercel`
6. Follow the prompts — log in with your Vercel account
7. When asked about environment variables, add the three keys above
8. Your app will be live at a `.vercel.app` URL

---

## Step 4 — Set up email confirmation in Supabase (optional)

By default Supabase requires email confirmation. To disable for testing:
1. Go to Supabase → **Authentication** → **Providers** → **Email**
2. Toggle off "Confirm email" for easier testing
3. Re-enable it when you go live

---

## Step 5 — Share with your team

Once deployed, your app is at something like `https://fleetguard-xxx.vercel.app`

- Share that URL with your managers
- On iPhone: open in Safari → tap Share → "Add to Home Screen" → it installs like an app
- On Android: open in Chrome → tap menu → "Add to Home Screen"

---

## Monthly costs (estimated)

| Service | Free tier | Paid |
|---|---|---|
| Vercel (hosting) | Free for small teams | $20/mo for more |
| Supabase (database) | Free up to 500MB | $25/mo for more |
| Anthropic API (AI) | Pay per use | ~$0.01–0.05 per inspection |

For a fleet of 12–50 trucks with weekly inspections: **roughly $10–30/month total.**

---

## File structure

```
fleetguard/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── layout.tsx            # Auth wrapper
│   ├── globals.css           # Styles
│   ├── components/
│   │   ├── Navbar.tsx        # Navigation
│   │   └── AuthPage.tsx      # Login/signup
│   ├── fleet/page.tsx        # Fleet management
│   ├── inspect/page.tsx      # Run inspections
│   ├── reports/page.tsx      # Damage reports
│   └── api/analyze/route.ts  # AI analysis endpoint
├── lib/
│   └── supabase.ts           # Database client
├── supabase-schema.sql       # Run this in Supabase
├── .env.local                # Your credentials (never share this)
└── package.json
```

---

## Need help?
If anything goes wrong during deployment, the most common fixes are:
- Make sure all 3 environment variables are set in Vercel
- Make sure you ran the SQL schema in Supabase
- Make sure email confirmation is disabled for testing
