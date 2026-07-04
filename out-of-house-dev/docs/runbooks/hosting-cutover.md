# Runbook — frontend hosting cutover (GitHub Pages → Render)

Audience: Callum. This is the exact click-path to move the live marketing site
from GitHub Pages onto the Render static site (`ooh-web` in `render.yaml`), plus
the rollback. **Claude does not run any of this** — DNS, the `main` merge, and
gh-pages retirement are yours (PHASE_B §B8). See ADR 0006 for the decision.

## 0. Where things stand today (audit §2)

- **Live:** `out-of-house.dev` = GitHub Pages, `gh-pages` branch, served from the
  pre-v4 flat CRA on remote `main`. DNS at **IONOS**: apex `@` A →
  `185.199.108–111.153` (GitHub Pages IPs); `www` CNAME → `callum-dot-dev.github.io`.
- **Render:** not live yet. `render.yaml` is ready to create everything.
- **This branch** (`feat/redesign-v4`) is the redesigned monorepo web app. It has
  never been on `main`.

## 1. Preconditions (before you touch DNS)

1. The redesign PR chain (`feat/redesign-v4` → `dev` → `staging` → `main`) is
   reviewed and you're ready to go live. **Merging to `main` is your call.**
2. On the `main` merge, make sure the repo-root **`.github/workflows/deploy.yml`
   is the patched version from this branch** (build:web + publish
   `out-of-house-dev/apps/web/build`, dispatch-only) — NOT the old flat-CRA one.
   If git surfaces a conflict there, keep this branch's version. This defuses the
   "time bomb" (the old workflow builds the wrong thing on the monorepo).
3. Decide the legal publish flag: if you're cutting over AND have supplied the
   `[TODO:callum:]` facts + solicitor sign-off, flip `PUBLISH_NEW_LEGAL` to
   `true` (`apps/web/src/config/flags.js`) in the same release. Otherwise leave
   it `false` (current legal content keeps serving). See `docs/prompts/BLOCKERS.md`.

## 2. Create the Render services (Blueprint)

1. Render Dashboard → **New → Blueprint** → connect the `callum-dot-dev/out-of-house-dev`
   repo → Render reads `render.yaml` at the repo root and proposes: `ooh-db`,
   `ooh-api`, `ooh-jobs`, `ooh-builder`, `ooh-web`.
2. Fill the `sync:false` secrets it prompts for (or set them per service after
   create). The static `ooh-web` needs none beyond `REACT_APP_API_URL`
   (already in the blueprint → `https://api.out-of-house.dev`).
3. Apply. Wait for `ooh-web` to build (`npm install && npm run build:web`) and
   go **Live** on its `*.onrender.com` URL. Open that URL — confirm the redesign
   renders and the SPA rewrite works (deep-link e.g. `/services/ai-automations`
   loads directly, not a 404).

> If you'd rather not stand up the whole platform yet, you can create **just**
> `ooh-web` as a standalone Static Site (New → Static Site → same repo, root dir
> `out-of-house-dev`, build `npm run build:web`, publish `apps/web/build`, add the
> SPA rewrite `/*` → `/index.html` and the headers from `render.yaml`). The API
> stays wherever it is until you cut that over too.

## 3. Add the custom domains on Render

1. `ooh-web` → **Settings → Custom Domains → Add** `out-of-house.dev`, then add
   `www.out-of-house.dev`.
2. Render shows the DNS target(s) to create. For the **apex** (`out-of-house.dev`)
   Render will give you either an **A record** (Render's anycast IP) or ask you to
   use an **ALIAS/ANAME** to `<service>.onrender.com`. For **www** it gives a
   **CNAME** → `<service>.onrender.com`. Copy the exact values Render shows —
   don't reuse the GitHub ones below.

## 4. Change DNS at IONOS

IONOS → Domains → `out-of-house.dev` → **DNS**. You are replacing the GitHub
Pages records with Render's:

1. **Apex `@`:** delete the four GitHub A records (`185.199.108–111.153`). Add the
   record Render gave you:
   - If Render gave an **A record**: add it as the apex `A`.
   - If Render recommends **ALIAS/ANAME**: IONOS supports this — add an `ALIAS`
     (or "Point to" a target) → `<service>.onrender.com`.
2. **`www`:** change the CNAME from `callum-dot-dev.github.io` →
   `<service>.onrender.com` (the value Render showed).
3. Leave TTL low (e.g. 300s / 5 min) for the cutover so you can roll back fast;
   raise it again once stable.

DNS propagates in minutes-to-an-hour at this TTL. Verify with
`dig out-of-house.dev` and `dig www.out-of-house.dev` (or an online DNS checker)
until they show the Render targets.

## 5. Verify TLS + the live site

1. Back on Render → Custom Domains: wait until both domains show **Verified** and
   a certificate is **Issued** (Render provisions Let's Encrypt automatically once
   DNS resolves to it).
2. Load `https://out-of-house.dev` and `https://www.out-of-house.dev`:
   - Redesign renders, no mixed-content warnings, padlock valid.
   - Deep links work (SPA rewrite).
   - `curl -sI https://out-of-house.dev | grep -i strict-transport` shows the HSTS
     header from `render.yaml`.
   - The site talks to `https://api.out-of-house.dev` (check a page that calls the
     API, e.g. `/changelog`, in the browser console — no CORS errors).

## 6. Retire GitHub Pages

Only after §5 is green and stable for a day or two:

1. Repo → **Settings → Pages** → set Source to **None** (unpublish).
2. Delete the `gh-pages` branch.
3. Delete `.github/workflows/deploy.yml` (the fallback) — it's no longer needed.
4. Remove the old GitHub Pages A/CNAME records from IONOS if any lingered.

## 7. Rollback (any time before §6)

GitHub Pages is still fully intact until you do §6, so rollback is just DNS:

1. IONOS → restore the apex `A` records to `185.199.108/109/110/111.153` and the
   `www` CNAME to `callum-dot-dev.github.io`.
2. If the `gh-pages` content is stale (it was built from the flat CRA), run the
   **Deploy (GitHub Pages — transition fallback)** workflow manually
   (Actions → Run workflow) to rebuild gh-pages from the current monorepo web app
   before/while pointing DNS back at it.
3. Wait for the low-TTL DNS to swing back; verify the old site serves.

## 8. Follow-ups

- **Content-Security-Policy:** `render.yaml` ships HSTS + the standard hardening
  headers but *not* a CSP — a CSP must be tuned against the live third-party
  embeds (cal.com, Stripe, Google OAuth, analytics/voice) so it doesn't break
  them. Add and test a `Content-Security-Policy` header once the site is on Render.
- **`EMAIL_DRY_RUN`:** flip to `false` on `ooh-api`/`ooh-jobs` at go-live (see
  `go-live.md`), separately from the frontend cutover.
