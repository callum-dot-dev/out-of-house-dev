# Platform setup

This repo now ships with two things:

1. The public marketing site at `/`
2. A logged-in platform at `/#/app/*` for clients, developers, and admins

The platform is gated behind Supabase auth. Setup takes about 10 minutes.

## 1. Create the Supabase project

1. Go to https://supabase.com → New project. Pick a region close to you.
2. Once it's up, open **Project Settings → API**. Copy:
   - **Project URL** → goes in `REACT_APP_SUPABASE_URL`
   - **anon public key** → goes in `REACT_APP_SUPABASE_ANON_KEY`
   - **service_role secret** → goes in `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose this)

## 2. Set environment variables

```bash
cp .env.example .env.local
# Open .env.local, paste in the three values above.
```

## 3. Run the schema

In the Supabase dashboard → **SQL Editor** → New query → paste the contents of
`supabase/migrations/001_initial.sql` → **Run**.

This creates the tables, RLS policies, triggers, and helper functions.

## 4. Configure auth providers

In **Authentication → Providers**:

- **Email** — leave enabled. Recommended: turn **off** "Confirm email" while developing so signup is instant. Turn it back on for production.
- **Google** (optional) — toggle on. Add your Google OAuth client ID and secret from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Authorized redirect URI in Google: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.

In **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` for dev, your production URL for prod.
- **Redirect URLs**: add both
  - `http://localhost:3000/#/auth/callback`
  - `https://out-of-house.dev/#/auth/callback` (and any other production URL)

(The `#` matters — this repo uses HashRouter so magic-link and Google redirects land on the hash path.)

## 5. Install + seed

```bash
npm install
npm run seed
```

The seed script creates:

- **Demo admin** — `callum.saxon@elevatesl.co.uk` / `change-me-after-seeding`
- **Demo developer** — `demo.developer@out-of-house.dev` / `demo-developer-2026`
- **Demo client** — `demo.client@out-of-house.dev` / `demo-client-2026`
- A demo project with 5 feature requests
- All 5 plan-of-action templates with Claude Code handoffs
- A few demo applications in the admin review queue

Change the admin password immediately after first login (`/app/settings`).

## 6. Run

```bash
npm start
```

Open http://localhost:3000.

- Marketing site: `/`
- Apply (public): `/#/apply`
- Login: `/#/login`
- App (gated): `/#/app`

## What's where

| Path | Visible to | What it does |
|---|---|---|
| `/#/app`                         | All roles | Role-routed dashboard |
| `/#/app/projects`                | All roles | Project list (client sees own; devs/admins see all) |
| `/#/app/projects/:id`            | All roles | Project detail + requests + plan progress |
| `/#/app/requests/:id`            | All roles | Request detail + comments + status |
| `/#/app/book`                    | Client | Cal.com embed |
| `/#/app/settings`                | All roles | Profile + password |
| `/#/app/board`                   | Developer/Admin | Kanban across all requests |
| `/#/app/plans`                   | Developer/Admin | Plan-of-action template library |
| `/#/app/plans/:id`               | Developer/Admin | Template detail + Claude Code handoff |
| `/#/app/admin/applications`     | Admin | Review applications (approve/reject) |
| `/#/app/admin/users`             | Admin | Manage roles |

## Application → account flow

1. Prospect submits at `/#/apply`. Row created in `applications` (status: `pending`).
2. You (admin) review at `/#/app/admin/applications`.
3. Approve → if the email already has a profile, a project is auto-created. Otherwise a magic-link invite is sent; on first sign-in their profile is created automatically (role: `client`), and you can re-open the application to attach a project.
4. Reject or Trash for declines.

## Plan-of-action library

The `/#/app/plans` library has 5 universal templates (one per project type). Each template has phased steps and a **Claude Code handoff brief** — a markdown doc designed to be copy-pasted as the first message to Claude Code when you start a project.

You can attach a template to any project from inside that project (devs see a "Spawn plan" button when none is attached). Progress through phases is tracked on the project page.

## Deployment

The existing `gh-pages` deploy script still works for static hosting. For production with auth working, ensure your **Supabase URL configuration** (step 4) includes your live URL.

If you want pretty URLs without the `#`, switch `HashRouter` to `BrowserRouter` in `src/App.js` and configure your host to serve `index.html` on unknown paths. The included `public/404.html` already handles this for GitHub Pages.

## Security notes

- The service-role key (`SUPABASE_SERVICE_ROLE_KEY`) is only used by `scripts/seed.js`. It must never be exposed to the browser.
- RLS policies enforce that clients only see their own data. Test by signing in as the demo client.
- The Apply form is public (anyone can submit), but only admins can read the queue.
