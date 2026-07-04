# Learn — coaching + courses

Covers `/coaching`, `/coaching/business`, `/coaching/developers`, `/courses`, `/courses/:slug`, `/verify/:code`. The `data/programmes.js` copy passed the audit (prices all match the committed price book) — ADOPT rules as elsewhere. Changes are framing and stale-data handling.

## `/coaching` hub

**Eyebrow:** Coaching · **H1:** Learn to build it yourselves — **with a senior beside you**. (accent as marked)

**Lead:**
> Projects are us building *for* you. Coaching is us building *with* you — so the capability stays in your team when we leave. 1:1 at £100/hour, or fixed-price 3, 6, and 12-week programmes.

(That for-you / with-you sentence is the frame that stops coaching cannibalising project sales — pricing_review §2. It appears here and nowhere needs repeating.)

Two track cards: title + `navCaption` + from-price (£100/hr · programmes from £1,500 for business, courses from £395 for developers) + `See the track →`.

## `/coaching/business` and `/coaching/developers`

ADOPT every field of both `COACHING_TRACKS` records verbatim (summary, accordion, hero, offer, process, deliverables, cta). No changes — both already carry exact prices consistent with the price book.

## `/courses` index

**Eyebrow:** Cohort courses · **H1:** Small cohorts, real projects, **verifiable certificates**.

**Lead:**
> 3, 6, and 12-week courses for developers (£395 / £795 / £1,495) and business teams (£1,500 / £3,500 / £6,500). Live sessions, async review, and a capstone you ship for real. Developer certificates are publicly verifiable at out-of-house.dev/verify.

Course cards: name, tagline, duration_label, price_label from data (ADOPT); plus seats line — see stale-data rule below.

## `/courses/:slug` detail pages

ADOPT all `COURSES` record fields (tagline, outcomes, modules, cta) verbatim, all six courses.

**Stale-data rule (blocking):** `next_cohort` dates and `seats_taken` in `programmes.js` are stale (several dates already past as of 2026-07-04). `[TODO:callum: set real next-cohort dates + seat counts for all six courses]`. Until real dates exist, render the date slot as:
> Next cohort: **dates announced at enrolment** — apply and we'll confirm within one business day.

Do not render a past date or a fake seats bar under any circumstances; an out-of-date "14 of 20 seats taken" is worse than none.

## `/verify/:code`

**Success:** `Verified.` + certificate name, course, difficulty, issue date, holder — from API (no copy change). Line under: `Issued by {out-of-house.dev}. Questions about this certificate: support@out-of-house.dev.`
**Failure:** `We couldn't verify that code.` + `Check for typos, or ask the certificate holder for a fresh link. If you think this is our mistake: support@out-of-house.dev.`
