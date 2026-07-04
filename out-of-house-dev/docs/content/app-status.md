# Authed app — status, empty-state, and notification copy

Covers `/app/*` client-facing strings. **§0.D applies in full:** every line below describes outcomes and turnaround only. Nothing in the client UI ever references internal delivery mechanics — no batching, no queue positions, no tooling names, no "your request was merged with…". If Phase B needs a string not listed here, it's a blocker, not an improvisation.

## Request statuses (`submitted / scoped / building / review / shipped / rejected`)

| Status | Badge label | One-line description (shown on RequestDetail) |
|---|---|---|
| submitted | Submitted | We've got it. You'll have a scope and a fixed price within one working day. |
| scoped | Scoped | Fixed price and acceptance criteria are ready for your sign-off. |
| building | Building | In progress. Working updates land here as pieces ship — typically every 2–3 days. |
| review | In review | Done on our side — over to you. Check it against the acceptance criteria and approve, or tell us what's off. |
| shipped | Shipped | Live. 30 days of post-launch fixes are included from today. |
| rejected | Not proceeding | We've closed this one — the note below says why. Reply or rescope any time. |

## Project statuses (`discovery / building / live / paused / completed`)

| Status | Badge | Description |
|---|---|---|
| discovery | Discovery | We're scoping. Expect a written plan and fixed price within 24 hours of the kick-off call. |
| building | Building | Actively shipping. Watch the requests list for what's landing. |
| live | Live | In production and under care. Raise a request any time something needs changing. |
| paused | Paused | On hold at your request. Nothing is billed for paused months; resume with one click. |
| completed | Completed | Wrapped and handed over. The code, docs, and infrastructure are yours. |

## Empty states

- **Dashboard, no projects:** `Nothing here yet. Book a discovery call and this page gets interesting.` → `Book a call`
- **Requests, none open:** `No open requests. When you need something changed, added, or fixed — this is the button.` → `New request`
- **Documents, empty:** `Contracts, scopes, and handover docs will appear here as they're issued.`
- **Notifications, empty:** `All caught up.`
- **Billing, no invoices:** `No invoices yet. Everything we bill shows up here first.`

## Notification / email one-liners (transactional)

- Request scoped: `Your request "{title}" has a fixed price — £{amount}. Review and approve in the app.`
- Request in review: `"{title}" is ready for your review.`
- Request shipped: `"{title}" is live. Post-launch fix window runs until {date}.`
- Invoice issued: `Invoice {number} for {period} is available.`
- Project paused/resumed: `"{project}" is paused — nothing bills until you resume.` / `"{project}" is back on. First update within 2–3 days.`

## Tone rules for anything else in `/app`

Plain, short, first person plural. Say when ("within one working day", "every 2–3 days"), never how. Buttons are verbs (`Approve scope`, `Request a change`, `Book a call`). No exclamation marks in the app.
