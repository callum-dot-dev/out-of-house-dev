// Lead-gen-as-a-Service marketing page data.
// This is the customer-facing copy. The actual engine runs inside
// /app/admin/leads with a Supabase edge-function pipeline (see
// /supabase/functions/lead-* + supabase/migrations/005_v3_business_expansion.sql).

export const LEADGEN_PAGE = {
  slug: 'lead-engine',
  title: 'Autonomous Lead Engine',
  flag: 'New',
  navCaption: 'A pipeline engine that runs itself',
  hero: {
    eyebrow: 'Lead-gen-as-a-Service',
    title: 'An always-on engine that finds you leads — while you sleep.',
    accent: 'while you sleep',
    lead: `We deploy the same lead-finding engine we use on ourselves. It crawls public business registries, social signals, and search to find your ideal customers, scores them with an LLM against your ICP, drafts personalised outreach, and posts on your channels. Plugged into your CRM, your inbox, your calendar. Pause anytime.`,
    proofPoints: [
      { kicker: 'Autonomous',  value: '24/7 discovery' },
      { kicker: 'Scored',      value: 'against your ICP' },
      { kicker: 'Booked',      value: 'meetings, not lists' },
    ],
  },
  pipeline: [
    {
      num: '01',
      title: 'Discovery',
      body: 'A worker fleet crawls Google Places, Companies House (UK), Yelp, Reddit, and other public sources to surface ideal-fit accounts. Configurable per ICP.',
      automated: true,
    },
    {
      num: '02',
      title: 'Enrichment',
      body: 'Each lead is enriched with website status, tech-stack, headcount, recent news, and intent signals (hiring, funding, competitor adoption).',
      automated: true,
    },
    {
      num: '03',
      title: 'Scoring',
      body: 'An LLM scores each lead against your ICP (1–10) and writes a one-sentence reason. Low scores are dropped. High scores enter the funnel.',
      automated: true,
    },
    {
      num: '04',
      title: 'Outreach drafting',
      body: 'For each accepted lead, the engine drafts a personalised email referencing the actual signal that surfaced them. Drafts arrive in your inbox or auto-send if you trust the bot.',
      automated: true,
    },
    {
      num: '05',
      title: 'Meeting booking',
      body: 'Replies are parsed and the engine handles the calendar ping-pong. Confirmed meetings land on your Cal.com calendar with a one-paragraph brief.',
      automated: true,
    },
    {
      num: '06',
      title: 'Ads + content',
      body: 'A creative agent generates ad variants and social posts on your brand and pushes them to Meta + Google + LinkedIn via API. Performance feeds the scoring loop.',
      automated: true,
    },
    {
      num: '07',
      title: 'Human override',
      body: 'You can mark a draft "do not send", reject a lead, retrain the scorer, or pause the whole engine in one click. This is the only manual surface.',
      automated: false,
    },
  ],
  proof: [
    { kicker: 'Engine sources',  value: '6 public + 4 commercial' },
    { kicker: 'Daily leads',     value: '50–500 depending on ICP' },
    { kicker: 'Drafts / day',    value: 'up to 200 personalised' },
    { kicker: 'Cost / meeting',  value: '~£15 (vs. ~£150 SDR cost)' },
  ],
  pricing: [
    {
      tier: 'Starter',
      price_label: '£500',
      price_suffix: 'one-off setup + £250/mo',
      lines: [
        '1 ICP, 1 outreach channel',
        'Up to 1,000 leads / month surfaced',
        'AI drafts to your inbox (manual send)',
        'CRM write (HubSpot, Pipedrive, or Airtable)',
        'Pause anytime',
      ],
      featured: false,
    },
    {
      tier: 'Pipeline',
      price_label: '£1,500',
      price_suffix: 'one-off setup + £750/mo',
      featured: true,
      lines: [
        '3 ICPs, 3 channels (email + LinkedIn + one social)',
        'Up to 10,000 leads / month surfaced',
        'Auto-send with safe-rate limiting',
        'Ads creative + social content engine',
        'Direct Slack channel with the engineer running it',
        'First-month money-back guarantee',
      ],
    },
    {
      tier: 'Engine room',
      price_label: 'from £4,000',
      price_suffix: 'one-off + £2,000+/mo',
      lines: [
        'Unlimited ICPs and channels',
        'Custom data sources (your CRM, your scraping targets)',
        'Bespoke scoring model trained on your closed-won data',
        'A senior engineer on retainer to tune monthly',
        'Multi-region, multi-language',
      ],
      featured: false,
    },
  ],
  cta: { primary: 'Book a 30-min demo', secondary: 'See architecture' },
};
