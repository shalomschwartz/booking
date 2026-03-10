# Client Setup Guide
Step-by-step instructions for deploying a new client instance.

---

## What you need before you start
- A GitHub account (you already have this)
- A Vercel account (you already have this)
- A Supabase account (free at [supabase.com](https://supabase.com))
- The client's Google account credentials (they need to be present or do step 3 themselves)

---

## Step 1 — Fork / duplicate the repo on GitHub

1. Go to your GitHub repo: `https://github.com/shalomschwartz/booking`
2. Click **Use this template** → **Create a new repository**
   (or just fork it)
3. Name it something like `booking-clientname`
4. Keep it **private**

---

## Step 2 — Create a new project on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import the new GitHub repo you just created
3. Leave build settings as-is (Vite is auto-detected)
4. **Do NOT deploy yet** — set env vars first (Step 4)

---

## Step 3 — Set up Google Cloud for the client

> If the client already has a Google Cloud project with OAuth credentials, skip to sub-step 5.

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with **the client's Google account**
3. Create a new project (name it anything)
4. Go to **APIs & Services → Library** and enable:
   - **Google Calendar API**
   - **Gmail API**
5. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: add `https://YOUR-VERCEL-URL.vercel.app/api/auth/callback`
     (you can get this URL after Step 2 — it looks like `booking-clientname.vercel.app`)
6. Copy the **Client ID** and **Client Secret** — you'll need them in Step 5

---

## Step 4 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Give it a name (e.g. `booking-clientname`) and set a database password
3. Wait for it to finish creating (~1 minute)
4. Go to **SQL Editor** and run this to create the bookings table:

```sql
create table bookings (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  notes text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  meet_link text,
  event_id text,
  created_at timestamptz default now()
);

alter table bookings enable row level security;
create policy "service role full access" on bookings
  using (true) with check (true);
```

5. Go to **Settings → API** and copy:
   - **Project URL** → this is your `SUPABASE_URL`
   - **service_role** key (under "Project API keys") → this is your `SUPABASE_SERVICE_KEY`

6. Create the admin login user:
   - Go to **Authentication → Users → Add user → Create new user**
   - Enter the email and password you'll use to log into the dashboard

---

## Step 5 — Add environment variables in Vercel

In your Vercel project → **Settings → Environment Variables**, add all of the following:

| Variable | Value | Notes |
|---|---|---|
| `GOOGLE_CLIENT_ID` | from Step 3 | |
| `GOOGLE_CLIENT_SECRET` | from Step 3 | |
| `GOOGLE_REFRESH_TOKEN` | _fill in after Step 6_ | |
| `CALENDAR_ID` | `primary` | or a specific calendar ID |
| `TIMEZONE` | e.g. `America/New_York` | [full list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) |
| `WORK_DAYS` | e.g. `1,2,3,4,5` | 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat |
| `WORK_START_HOUR` | e.g. `9` | 24-hour format |
| `WORK_END_HOUR` | e.g. `18` | 24-hour format |
| `SLOT_DURATION_MINS` | e.g. `30` | |
| `BUSINESS_NAME` | e.g. `John's Consulting` | shown in emails |
| `ACCENT_COLOR` | e.g. `#4F46E5` | hex color for email branding |
| `SUPABASE_URL` | from Step 4 | server-side only |
| `SUPABASE_SERVICE_KEY` | from Step 4 | server-side only |
| `VITE_BUSINESS_NAME` | same as `BUSINESS_NAME` | shown in the UI |
| `VITE_ACCENT_COLOR` | same as `ACCENT_COLOR` | UI brand color |
| `VITE_SLOT_DURATION_MINS` | same as `SLOT_DURATION_MINS` | shown in the UI |

Common timezone values:
- Israel: `Asia/Jerusalem`
- New York: `America/New_York`
- London: `Europe/London`
- Los Angeles: `America/Los_Angeles`
- Dubai: `Asia/Dubai`

Common work day combos:
- Sun–Thu: `0,1,2,3,4`
- Mon–Fri: `1,2,3,4,5`
- Mon–Thu: `1,2,3,4`

---

## Step 6 — Deploy and connect Google account

1. Click **Deploy** in Vercel (now that env vars are set)
2. Wait for deployment to finish
3. Visit: `https://YOUR-VERCEL-URL.vercel.app/api/auth`
4. Sign in with **the client's Google account**
5. Grant access to Calendar and Gmail
6. You'll be redirected back and see a **refresh token** on screen
7. Copy that token and paste it as the `GOOGLE_REFRESH_TOKEN` env var in Vercel
8. Go to Vercel → **Deployments → Redeploy** (so the new token takes effect)

---

## Step 7 — Test it

1. Open the booking page and make a test booking
2. Check that:
   - [ ] Available dates show up correctly
   - [ ] Booking goes through without errors
   - [ ] A Google Calendar event is created with a Meet link
   - [ ] A confirmation email arrives in the booker's inbox
   - [ ] The booking appears in the admin dashboard at `/admin`
3. Log into the admin dashboard at `https://YOUR-VERCEL-URL.vercel.app/admin`
   with the email and password from Step 4
4. If something says "Something went wrong", go to Vercel → **Functions** tab → check the logs

---

## Done!

Send the client their booking URL: `https://YOUR-VERCEL-URL.vercel.app`

The admin dashboard is at: `https://YOUR-VERCEL-URL.vercel.app/admin` (keep this private — for your eyes only)

You can also add a custom domain in Vercel → **Settings → Domains** if the client has one.
