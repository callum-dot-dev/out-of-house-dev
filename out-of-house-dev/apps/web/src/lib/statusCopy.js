// Client-facing status + empty-state copy for the authed app (app-status.md).
// §0.D applies in full: every string here describes OUTCOMES and TURNAROUND
// only — never internal delivery mechanics (no batching, queue positions, or
// tooling names). If a page needs a client-facing string not here, that's a
// blocker, not an improvisation.

export const REQUEST_STATUS = {
  submitted: { label: 'Submitted', description: 'We’ve got it. You’ll have a scope and a fixed price within one working day.' },
  scoped: { label: 'Scoped', description: 'Fixed price and acceptance criteria are ready for your sign-off.' },
  building: { label: 'Building', description: 'In progress. Working updates land here as pieces ship — typically every 2–3 days.' },
  review: { label: 'In review', description: 'Done on our side — over to you. Check it against the acceptance criteria and approve, or tell us what’s off.' },
  shipped: { label: 'Shipped', description: 'Live. 30 days of post-launch fixes are included from today.' },
  rejected: { label: 'Not proceeding', description: 'We’ve closed this one — the note below says why. Reply or rescope any time.' },
};

export const PROJECT_STATUS = {
  discovery: { label: 'Discovery', description: 'We’re scoping. Expect a written plan and fixed price within 24 hours of the kick-off call.' },
  building: { label: 'Building', description: 'Actively shipping. Watch the requests list for what’s landing.' },
  live: { label: 'Live', description: 'In production and under care. Raise a request any time something needs changing.' },
  paused: { label: 'Paused', description: 'On hold at your request. Nothing is billed for paused months; resume with one click.' },
  completed: { label: 'Completed', description: 'Wrapped and handed over. The code, docs, and infrastructure are yours.' },
};

export const requestStatusLabel = (s) => REQUEST_STATUS[s]?.label || s;
export const requestStatusDescription = (s) => REQUEST_STATUS[s]?.description || '';
export const projectStatusLabel = (s) => PROJECT_STATUS[s]?.label || s;
export const projectStatusDescription = (s) => PROJECT_STATUS[s]?.description || '';

// Empty-state copy (app-status.md). Buttons are verbs; say when, never how.
export const EMPTY = {
  dashboardNoProjects: 'Nothing here yet. Book a discovery call and this page gets interesting.',
  requestsNoneOpen: 'No open requests. When you need something changed, added, or fixed — this is the button.',
  documentsEmpty: 'Contracts, scopes, and handover docs will appear here as they’re issued.',
  notificationsEmpty: 'All caught up.',
  billingNoInvoices: 'No invoices yet. Everything we bill shows up here first.',
};
