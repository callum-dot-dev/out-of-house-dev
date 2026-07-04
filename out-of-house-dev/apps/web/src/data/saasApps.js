// SaaS / AIaaS catalog.
//
// LogoVault is the first product. Each entry feeds:
//   - /saas index card
//   - /saas/:slug detail page
//   - Header dropdown (if exposed)

export const SAAS_APPS = [
  {
    slug: 'logovault',
    title: 'LogoVault',
    tagline: 'Every company logo, every format, every background. One API.',
    status: 'beta',
    statusLabel: 'Public beta',
    flag: 'AIaaS',
    navCaption: 'Logos in every format and background',
    accent: '#2bbf86',
    summary: `A searchable, AI-tagged library of company logos in SVG, PNG, and JPG, in black / white / colour / transparent variants. Built so a developer can stop scraping Google Images for a client landing page. One search box, one API, one consistent file structure.`,
    hero: {
      eyebrow: 'AIaaS — LogoVault',
      title: 'Every company logo. Every format. One API.',
      accent: 'every format',
      lead: `Stop scraping Google Images at midnight. LogoVault gives you SVG, PNG, and JPG of any company logo, in black, white, colour, and transparent variants — searchable from a UI, scriptable from an API.`,
      proofPoints: [
        // 900k+ count dropped until confirmed (products.md gate; BLOCKERS A8).
        { kicker: 'SVG/PNG/JPG', value: 'every format' },
        { kicker: 'B / W / Colour', value: 'every variant' },
      ],
    },
    offer: {
      eyebrow: 'What you get',
      title: 'Logos, the way you actually use them.',
      items: [
        { title: 'Search by name',          body: 'Type "Stripe" — get the official mark in every flavour, mapped to known aliases (Stripe Inc, Stripe.com, etc).' },
        { title: 'Search by domain',         body: 'Pass a domain — get the logo. Pass an email — get the logo of the sender\'s company. Built for SDR tools.' },
        { title: 'Every format',             body: 'SVG, PNG (1x/2x/3x), and JPG. Picked or generated, never scaled from a 64×64 favicon.' },
        { title: 'Every variant',            body: 'Original, monochrome black, monochrome white, transparent background, square padded — already generated, no work for you.' },
        { title: 'API + UI',                  body: 'One REST + Edge Function API, with TypeScript / Python clients. Plus a UI to browse and tag custom logos for your own private library.' },
        { title: 'Private logos',            body: 'Upload your own brand assets. Same tagging, same access. Your team always grabs the right file.' },
      ],
    },
    process: {
      eyebrow: 'How it works',
      title: 'Three ways to use it — each less than a minute.',
      steps: [
        { num: '01', label: 'UI',    title: 'Search the web UI',            body: 'Free to browse. Drag-and-drop into Figma, Notion, your design tool of choice.' },
        { num: '02', label: 'API',   title: 'Hit the API',                  body: 'POST { domain: "stripe.com" } → JSON with signed URLs for every format and variant.' },
        { num: '03', label: 'MCP',   title: 'Plug into Claude / Cursor',     body: 'Our MCP server makes LogoVault a tool your AI assistant can call. "Put the customer logos in this hero" — done.' },
      ],
    },
    deliverables: {
      eyebrow: 'Pricing',
      title: 'Honest tiers.',
      items: [
        'Free: browse + 50 API calls a day',
        'Indie £9 / month: 5,000 API calls, unlimited UI downloads',
        'Studio £39 / month: 50,000 API calls, private logo library, team seats',
        'Agency £149 / month: 500,000 API calls, MCP, white-label',
        'Custom: enterprise rate-limits, on-prem, contact us',
      ],
    },
    cta: { primary: 'Try LogoVault', secondary: 'See the API' },
  },
  {
    slug: 'prompt-locker',
    title: 'Prompt Locker',
    status: 'planned',
    statusLabel: 'Planned · Q3 2026',
    flag: 'AIaaS',
    navCaption: 'Prompt library + evals for teams',
    summary: 'A team prompt library with version history, per-model A/B testing, and an eval suite that catches regressions before they hit prod.',
  },
  {
    slug: 'inbox-fox',
    title: 'Inbox Fox',
    status: 'planned',
    statusLabel: 'Planned · Q4 2026',
    flag: 'AIaaS',
    navCaption: 'Inbox triage agent as a service',
    summary: 'Drop-in inbox triage. Connect Gmail or Outlook, choose the rules, the agent triages, drafts, and routes for you.',
  },
  {
    slug: 'fingerprint-fund',
    title: 'Fingerprint Fund',
    status: 'planned',
    statusLabel: 'Planned · Q1 2027',
    flag: 'AIaaS',
    navCaption: 'Lead discovery for small agencies',
    summary: 'A standalone version of our lead-discovery engine for small agencies. Find businesses with no website, score them, surface them.',
  },
];

export const getSaasAppBySlug = (slug) => SAAS_APPS.find((a) => a.slug === slug);
