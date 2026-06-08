# Kill switches + key rotation

## Kill switches (`settings` table, toggled from /app/admin/ops or SQL)
- `auto_merge_enabled` — when false, no PR is ever auto-merged; everything queues
  for senior review (the orchestrator's merge policy reads this).
- `outreach_enabled` — gate outbound sending (checked before `outreach.send`).
- `builder_enabled` — pause the builder worker consuming `builder.run`.

Toggle: `update settings set value='false'::jsonb where key='auto_merge_enabled';`

Other safety flags (env):
- `BUILDER_DRY_RUN=true` — builder does everything except push/PR (writes the diff
  to FileStore for inspection).
- `EMAIL_DRY_RUN=true` — no real Resend sends; `email_events` rows still recorded.

## Key rotation (per vendor)
1. Generate the new key in the vendor dashboard.
2. Update the env var on the relevant Render service(s) (ooh-api / ooh-jobs /
   ooh-builder) → triggers a redeploy.
3. Revoke the old key.
`SESSION_JWT_SECRET` rotation invalidates all access tokens (users re-auth via the
refresh cookie); `REFRESH_TOKEN_PEPPER` rotation forces a full re-login.

## Incident response (uptime/deliverability)
- `ops.uptime_check` opens a `status_incidents` row after 3 consecutive fails and
  closes it after 3 OKs; surfaced on `/status` + `/app/admin/ops`.
- Deliverability dip: check `email_events` bounce/complaint rates; pause the
  campaign (`outreach_enabled=false`); warm up a fresh sending domain.
