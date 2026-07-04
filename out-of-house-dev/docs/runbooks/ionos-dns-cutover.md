# Runbook — IONOS DNS cutover (GitHub Pages → Render)

Point `out-of-house.dev` at the Render deployment (redesigned site + API) instead
of GitHub Pages. Companion to `hosting-cutover.md`; this one is the exact IONOS
click-path. **Nothing here is destructive to Render or the repo — it's DNS only,
and fully reversible (§6).** Do it once the Render services are green.

Current Render services (lean stack): `ooh-web` (static site → apex + www) and
`ooh-api` (web service → api subdomain). `ooh-jobs` + `ooh-db` are internal and
need no DNS.

---

## 0. What changes

| Host | Today (GitHub Pages) | After (Render) | Record type |
|---|---|---|---|
| `out-of-house.dev` (apex `@`) | A → `185.199.108.153` / `.109` / `.110` / `.111` | Render's apex IP (dashboard shows it) | **A** |
| `www` | CNAME → `callum-dot-dev.github.io` | `ooh-web-XXXX.onrender.com` | **CNAME** |
| `api` | *(none today)* | `ooh-api-XXXX.onrender.com` | **CNAME** (new) |

> ⚠️ **Always use the exact values Render shows you** when you add each custom
> domain (below). Render's apex IP and the `*.onrender.com` hostnames are
> specific to your services — the values in this table are the *shape*, not the
> literal values to paste.

---

## 1. First, add the domains in Render (this is where you get the DNS values)

1. Render → **`ooh-web`** → **Settings → Custom Domains → Add Custom Domain** →
   add `out-of-house.dev`, then add `www.out-of-house.dev`.
2. Render → **`ooh-api`** → **Settings → Custom Domains → Add Custom Domain** →
   add `api.out-of-house.dev`.
3. For each domain Render now shows the DNS record to create — **an A record IP
   for the apex** and a **CNAME target (`…onrender.com`) for `www` and `api`**.
   Keep this tab open; you'll copy these into IONOS.

Render will say the domains are "unverified" until DNS points at them — that's
expected; it flips to "verified" + issues TLS automatically once you finish §2.

---

## 2. Change the records at IONOS

Log in to IONOS → **Menu → Domains & SSL** → click **out-of-house.dev** → open the
**DNS** tab. You'll edit three things. Set **TTL to 5 minutes** on each while you
cut over (so a rollback propagates fast); raise it again once stable.

**a) Apex `@` (the root domain) — replace the GitHub A records**
- Delete the four existing A records pointing to `185.199.108–111.153`.
- **Add record → Type A**, Host name `@` (IONOS may show this as blank/root),
  Value = **the apex IP Render showed** for `ooh-web`, TTL 5 min.
- (If Render shows more than one apex IP, add one A record per IP.)

**b) `www` — repoint the CNAME**
- Edit the existing `www` CNAME (currently `callum-dot-dev.github.io`) →
  change **Points to** to **`ooh-web-XXXX.onrender.com`** (the value Render showed).
- If IONOS won't let you edit it, delete it and **Add record → Type CNAME**,
  Host name `www`, Points to `ooh-web-XXXX.onrender.com`, TTL 5 min.

**c) `api` — add a new CNAME**
- **Add record → Type CNAME**, Host name `api`, Points to
  **`ooh-api-XXXX.onrender.com`** (the value Render showed for `ooh-api`), TTL 5 min.

Save. Leave the MX / any email records untouched — you're only changing web
routing.

> IONOS note: the apex (`@`) must be an **A** record (registrars, IONOS included,
> don't allow a CNAME at the root). `www` and `api` are subdomains, so they use
> **CNAME**. That's why the apex points to an IP and the others to a hostname.

---

## 3. Verify

Give it a few minutes (5-min TTL), then check:

```bash
dig out-of-house.dev +short          # → Render's apex IP
dig www.out-of-house.dev +short      # → ooh-web-XXXX.onrender.com …
dig api.out-of-house.dev +short      # → ooh-api-XXXX.onrender.com …
```
(or use a browser DNS checker if `dig` isn't handy.)

Then, in Render:
- `ooh-web` + `ooh-api` custom domains flip to **Verified**, certificate
  **Issued** (Render provisions Let's Encrypt automatically).

Then in a browser:
- `https://out-of-house.dev` and `https://www.out-of-house.dev` load the redesign,
  valid padlock, no mixed-content warnings, deep links work (e.g.
  `/services/ai-automations` loads directly — SPA rewrite).
- `https://api.out-of-house.dev/api/v1/health` returns `{ "ok": true }`.
- On the site, a page that calls the API (e.g. `/changelog`) shows no CORS errors
  in the browser console — confirms the site is talking to the live API.
- `curl -sI https://out-of-house.dev | grep -i strict-transport` shows the HSTS
  header from `render.yaml`.

---

## 4. Flip email out of dry-run (only when you're ready for real emails)

The API/jobs ship with `EMAIL_DRY_RUN=true` (no real emails sent). When you're
ready, set `EMAIL_DRY_RUN=false` on **`ooh-api`** and **`ooh-jobs`** in Render →
Environment, and redeploy. Keep it `true` until you've sanity-checked the flows.

---

## 5. Retire GitHub Pages (only after §3 is green and stable a day or two)

1. GitHub repo → **Settings → Pages** → Source **None** (unpublish).
2. Delete the `gh-pages` branch.
3. Delete `.github/workflows/deploy.yml` (the transition fallback) — no longer needed.

---

## 6. Rollback (any time before §5)

GitHub Pages stays fully intact until §5, so rollback is just reverting DNS:

1. IONOS → set the apex `@` A records back to `185.199.108.153`, `.109`, `.110`,
   `.111`, and the `www` CNAME back to `callum-dot-dev.github.io`. Remove the new
   `api` CNAME if you like.
2. Wait for the 5-min TTL to swing back; the old site serves again.
   *(If the gh-pages content is stale, run the **Deploy (GitHub Pages —
   transition fallback)** workflow manually — Actions → Run workflow — to rebuild
   it from the current repo before pointing DNS back.)*

---

## Quick reference — the three IONOS records after cutover

```
@     A      <render-apex-ip>              (from ooh-web custom-domain page)
www   CNAME  ooh-web-XXXX.onrender.com     (from ooh-web custom-domain page)
api   CNAME  ooh-api-XXXX.onrender.com     (from ooh-api custom-domain page)
```
