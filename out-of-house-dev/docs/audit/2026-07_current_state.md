# Current-state audit — out-of-house.dev (July 2026)

Date: 2026-07-04 · Author: Fable 5 (Phase A of `docs/prompts/FRONTEND_DESIGN_PROMPT.md`, §0.B) · Status: ground truth for the redesign. Everything below was verified against the live site, the GitHub remote, or this working copy on the date above; anything not directly verifiable is marked `ASSUMED:` or `UNVERIFIED:`.

## 1. Executive summary

The live site is healthy and consistent with what GitHub `main` would build — but **GitHub `main` is not this codebase**. The remote `main` still holds the pre-v4 flat CRA app; the v4 monorepo (this working copy) has never been pushed. The Render migration (ADR 0001) is code-complete locally and **not live anywhere**. The GitHub Pages deploy workflow that currently keeps production up will **break on the first push of the monorepo to `main`**. Hosting cutover is therefore not optional polish for Phase B — it is coupled to merging the redesign at all.

## 2. Hosting reconciliation (what is actually deployed)

| Question | Answer | Evidence |
|---|---|---|
| What serves `out-of-house.dev`? | GitHub Pages, repo `callum-dot-dev/out-of-house-dev`, branch `gh-pages` (root), CNAME `out-of-house.dev`, HTTPS enforced | Live `asset-manifest.json` is byte-identical to `gh-pages` branch's; DNS below |
| DNS | Apex `@` A → 185.199.108/109/110/111.153 (GitHub Pages shared IPs); `www` CNAME → `callum-dot-dev.github.io` | `dig` on 2026-07-04. Zone hosted at IONOS |
| Live bundle | `main.8dc2b53a.js` / `main.b4f995db.css` | `https://out-of-house.dev/asset-manifest.json` |
| Which workflow deployed it? | Repo-root `.github/workflows/deploy.yml` (on push to `main` + manual): checkout → Node 20 → `npm install` + `CI=false npm run build` with `working-directory: out-of-house-dev` → `peaceiris/actions-gh-pages@v4` publishes `out-of-house-dev/build` with cname | Fetched raw from `main` on 2026-07-04 |
| What is on GitHub `main`? | **The pre-v4 flat CRA app.** `out-of-house-dev/package.json` on `main` = name `out-of-house-dev` v0.1.0, `react-scripts` at the subfolder root, `@supabase/supabase-js` dependency, `gh-pages` deploy scripts | Fetched raw from `main` on 2026-07-04 |
| Is the v4 monorepo deployed anywhere? | **No.** It exists only in the local working copy (`out-of-house-platform` workspace root: `apps/web|api|jobs|builder`, `packages/shared`, `db/`, Render-targeted). Render hosting is NOT live | Local tree vs. remote `main` package.json |
| Last deploy | ASSUMED 2026-06-27 (the deploy-workflow fix): the live bundle hash matches the build recorded live immediately after that fix, and `main` has the flat CRA the workflow builds | UNVERIFIED: Actions run history and `gh-pages` commit dates — `api.github.com`/`github.com` HTML not reachable from this audit environment |

### Stale build artifacts in the working copy (do not trust them)

- Workspace-root `build/` — `main.1fcc93f2.js`, mtime 2026-05-22. Pre-monorepo local artifact. Gitignored (`.gitignore` line 7), so it is NOT what CI publishes.
- `apps/web/build/` — `main.329a71ed.js`, mtime 2026-06-08. Local dev build of the v4 web app. Also not deployed.
- Neither matches live (`8dc2b53a`); that is expected, not drift in itself.

### The deploy-workflow time bomb

`deploy.yml` runs `npm run build` at the workspace root. On `main` today (flat CRA) that produces `out-of-house-dev/build` and works. **After the monorepo lands on `main`:** root `npm run build` compiles `packages/shared` + `apps/api|jobs|builder` only (the web app is `npm run build:web` → `apps/web/build`), and `out-of-house-dev/build` will not exist in CI → the publish step fails (or worse, publishes nothing meaningful). **Phase B must, in the same change that merges to `main`, either (a) cut over to Render static hosting per ADR 0001 (recommended — the redesign is the natural cutover point, §3.5), or (b) patch `deploy.yml` to `npm run build:web` + `publish_dir: out-of-house-dev/apps/web/build` as a stopgap.** Either way, the branch-model rule holds: nothing merges to `main` without explicit go-ahead.

## 3. Route inventory (v4 working copy, `apps/web/src/App.js`)

### Public / marketing (Header + footer shown)

| Route | Component | Notes |
|---|---|---|
| `/` | HomePage (inline in App.js) | Hero, proof bar, positioning ("trilemma"), services accordion, capabilities, HorizontalSteps, Showcase strip, benefits, pricing cards, calculator, FAQ, contact, footer |
| `/services/:slug` | pages/ServicePage | 6 slugs from `data/services.js`: ai-automations, ai-growth, websites, web-apps, internal-tools, maintenance |
| `/coaching` | pages/Coaching | Hub |
| `/coaching/:track` | pages/CoachingTrack | `business`, `developers` (data/programmes.js) |
| `/courses` | pages/Courses | Index |
| `/courses/:slug` | pages/CourseDetail | 6 course slugs (data/programmes.js) |
| `/saas` | pages/Saas | Product index (data/saasApps.js) |
| `/saas/logovault` | pages/LogoVault | Only routed product page (others `planned`) |
| `/lead-engine` | pages/LeadGen | data/leadgen.js |
| `/aiseo` | pages/AISEO | data/aiseo.js |
| `/showcase` | pages/Showcase | Also a strip component `src/Showcase.js` on `/` |
| `/changelog`, `/changelog/:slug` | pages/Changelog | |
| `/developers` | Developers (root-level) | Bench / hiring page |
| `/trust` | pages/Trust | |
| `/subprocessors` | pages/Subprocessors | |
| `/terms-and-conditions` | TermsAndConditions (root-level) | |
| `/privacy-policy` | PrivacyPolicy (root-level) | |
| `/verify/:code` | pages/CertificateVerify | Header hidden |
| `*` | redirect to `/` | |

### Auth (Header hidden)

`/apply` (PublicOnly), `/login` (PublicOnly), `/password-reset`, `/auth/callback`.

### Authed app `/app/*` (ProtectedRoute, AppShell layout)

Index Dashboard; `projects`, `projects/:id`, `requests/:id`, `documents`, `book`, `settings`, `notifications`; role-gated: `billing` (client/admin), `board`, `plans`, `plans/:id` (developer/admin), `admin/applications`, `admin/users`, `admin/audit` (admin). Per §0.C these keep their wiring; they get restyled only.

### Navigation (Header.js)

Three data-driven dropdowns — Services ("What we build", 6 items from services.js), Learn ("Coaching & courses": 2 coaching tracks + Cohort Courses), Products ("SaaS & AIaaS": live/beta SaaS apps + All SaaS + Lead Engine + AISEO) — plus a Developers link and login/app CTA. Footer (on `/`): Developers, Showcase, Changelog, Trust & Security; legal strip: Terms, Privacy, Sub-processors. IA simplification is Phase B §3.1; input from this audit: 14+ nav destinations across 3 dropdowns is above what a first-time visitor needs — candidates for consolidation are Showcase/Changelog (into one "Work" surface) and the Products dropdown (LogoVault is the only shipped product).

## 4. Styling ground truth

Plain CSS only: `apps/web/src/App.css` (~187 KB — the active v3 system, includes a full custom-property token block: `--bg #fbfaf8`, `--ink #11140f`, `--accent #2bbf86` family, `--dark #121413`, fluid type scale, radius/duration/easing tokens) plus legacy `src/styles/v3.css` (~35 KB). No Tailwind, no CSS-in-JS in `apps/web/package.json`. The redesign does not start from zero — `docs/design/design_tokens.md` builds on this base. The 187 KB monolith and the v3.css remnant are the main structural debts for Phase B's styling-approach ADR.

Meta/theme: live page and local `public/index.html` share the same meta description and `theme-color #14140f` — marketing head content is in sync between `main` and the monorepo copy.

## 5. Screenshots of live routes

**Deferred to Phase B, deliberately.** ASSUMED acceptable because: (a) Phase B's deliverable 2 already requires before/after captures via the configured Playwright setup (`apps/web/e2e`), and the "before" set satisfies this section; (b) this audit environment cannot render the SPA (client-rendered; raw fetch returns the JS shell). Phase B: capture every route in §3's tables against the live site *before* the first restyle commit, store under `docs/audit/screenshots/2026-07-live/`.

## 6. Data-layer state relevant to the redesign

- `src/data/` is the single source for services (22.4 KB), programmes/courses (19.2 KB), saasApps (4.7 KB), leadgen (4.5 KB), aiseo (7.7 KB), planTemplates (65.7 KB, v4 handoffs — no customer-facing prices in it).
- `PricingCalculator.js` (6.5 KB) holds its own `BUILD_TYPES`/`ADDONS` price constants — i.e. **calculator prices live in the component, not in `src/data/`**. Phase B should move them to `src/data/` per §1's "keep the calculator wired to the same data" instruction; the corrected numbers are specified in `docs/content/pricing_review.md`.
- Factually stale data found (flagged per §3.3): course `next_cohort` dates (2026-06-08/15/22 already past; 2026-07-06 imminent) and `seats_taken` counts; hero-workshop items and "4 shipping this week" stats on `/` are hardcoded demo props.

## 7. What Phase A/B must reconcile (action list)

1. Phase B merges = deploy pipeline change (see §2 "time bomb"). Recommend Render cutover per ADR 0001; GH Pages stays live until DNS flips.
2. Calculator constants → `src/data/`, corrected per `docs/content/pricing_review.md`.
3. Cohort dates/seat counts need real values from Callum before publish (listed in `docs/content/legal_review_needed.md` companion notes).
4. Live "before" screenshots via Playwright before first restyle commit.
