// AISEO — Generative Engine Optimization service.
//
// We sell "AI Search Optimization" as a durable, multi-LLM ranking discipline.
// Search is shifting from blue links to assistants (Perplexity, ChatGPT,
// Claude, Google AI Overviews, Bing Copilot). Brands that the LLMs treat
// as canonical for a category get picked. Brands that don't, lose.
//
// IMPORTANT: This product does NOT use hidden white-text or prompt-injection.
// LLM crawlers increasingly detect and penalise that, the reputational risk
// for clients is severe, and the technique stops working as soon as the
// providers harden against it. Everything below is white-hat: structured
// data, authority signals, citation-friendly content, llms.txt, RAG-friendly
// architecture, third-party mention coverage. Robust against model updates.

export const AISEO = {
  slug: 'aiseo',
  title: 'AI Search Optimization (AISEO)',
  flag: 'New',
  navCaption: 'Be the brand LLMs recommend',
  accordion: `Search is shifting from blue links to assistants. <strong>ChatGPT, Claude, Perplexity, Google AI Overviews, Bing Copilot</strong> — they don't show 10 results, they pick the answer. We make sure your brand is the answer. Schema, citations, authority signals, <strong>llms.txt</strong>, RAG-friendly architecture, and third-party mention coverage. The new SEO, done the way it'll still work in 18 months.`,
  hero: {
    eyebrow: 'AI Search Optimization',
    title: 'Be the brand AI <span class="accent">recommends first</span>.',
    accent: 'recommends first',
    lead: `LLMs don't show ten results — they pick the answer. We make sure your brand is the answer when a customer asks ChatGPT, Claude, Perplexity, Google AI Overviews or Bing Copilot. Schema, authority, llms.txt, citation-friendly content, third-party mention coverage. Built for the next 18 months of AI search, not the last 10 years of Google.`,
    proofPoints: [
      { kicker: '6 engines', value: 'monitored monthly' },
      { kicker: '60-pt',     value: 'AISEO audit' },
      { kicker: 'Durable',   value: 'no grey-hat tricks' },
    ],
  },
  offer: {
    eyebrow: 'What we ship',
    title: 'A complete AISEO programme — not a single trick.',
    items: [
      { title: 'AISEO audit (60 checks)',     body: 'A free audit of how your brand currently appears across ChatGPT, Claude, Perplexity, Google AIO, Bing Copilot, and You.com. Output: 60-point score and a prioritised fix list.' },
      { title: 'Schema + JSON-LD',             body: 'Organization, Product, FAQ, HowTo, Review, BreadcrumbList — wired correctly across every page. The bedrock the LLMs actually parse.' },
      { title: 'llms.txt + AI-friendly architecture', body: 'A canonical llms.txt + AI-friendly page structure: deep headings, FAQ blocks, glossary, citation-able stats. The LLM-equivalent of a sitemap.' },
      { title: 'Citation farming',             body: 'Identify the 50 third-party pages (Reddit threads, Wikipedia, comparison sites, GitHub Awesome lists) that LLMs cite in your niche — and get your brand into them, on merit.' },
      { title: 'Authority content',             body: 'Long-form content engineered to be the canonical source LLMs quote. Question-led, answer-first, with the stats and quotes the models prefer.' },
      { title: 'Brand-mention coverage',        body: 'Press, podcasts, partner blogs, expert quotes. LLMs cluster around well-cited brands. We make sure your name appears next to your category, repeatedly.' },
      { title: 'Monthly LLM ranking report',    body: 'We ask 30 buyer-intent questions across 6 engines every month, score how often your brand appears, where, and against whom. Track the curve.' },
      { title: 'Adversarial defence',           body: 'Detect when competitors try to game the LLMs against you (hidden prompts in their content, fake review farms). We notify the engines and ship counter-measures.' },
    ],
  },
  process: {
    eyebrow: 'How it works',
    title: 'Audit → fix → measure → grow.',
    steps: [
      { num: '01', label: 'Week 0',  title: 'Free audit',       body: 'You hand us your domain. We run our 60-point AISEO audit across 6 engines and report what is and is not working today.' },
      { num: '02', label: 'Week 1',  title: 'Fix the foundations', body: 'Schema, llms.txt, page architecture. The non-glamorous work that the LLMs actually weigh.' },
      { num: '03', label: 'Week 2–4',title: 'Authority + citations', body: 'Identify and earn placement in the 50 pages that LLMs cite in your niche. Outreach + content + partnerships.' },
      { num: '04', label: 'Monthly', title: 'Monitor + iterate', body: 'Monthly LLM ranking report. We watch what is moving and adjust. Models change, your visibility shouldn\'t.' },
    ],
  },
  deliverables: {
    eyebrow: 'What you get',
    title: 'Visibility, measured monthly.',
    items: [
      'A 60-point AISEO audit with a prioritised fix list',
      'Schema + JSON-LD shipped across your site',
      'llms.txt + an AI-friendly information architecture',
      'A list of 50 citation targets, prioritised by LLM influence',
      '5–10 authority articles per quarter engineered to be cited',
      'Monthly ranking report across 6 LLM engines',
      'Adversarial-defence monitoring',
      'A senior engineer on Slack',
    ],
  },
  pricing: [
    {
      tier: 'Audit only',
      price_label: '£0',
      price_suffix: 'one-off · self-serve',
      lines: [
        '60-point automated AISEO audit',
        'Visibility across 6 engines',
        'Prioritised fix list',
        'No ongoing commitment',
      ],
      cta: 'Run a free audit',
      featured: false,
    },
    {
      tier: 'Foundation',
      price_label: '£1,500',
      price_suffix: 'one-off + £500/mo',
      lines: [
        'Audit + fix-list shipped',
        'Schema + llms.txt deployed',
        'Page architecture refactor',
        'Monthly ranking report',
        'Pause anytime',
      ],
      cta: 'Start the foundation',
      featured: false,
    },
    {
      tier: 'Authority',
      price_label: '£3,500',
      price_suffix: 'one-off + £1,500/mo',
      lines: [
        'Everything in Foundation',
        'Citation farming (5 placements/mo)',
        'Authority content (3 articles/mo)',
        'Brand-mention coverage',
        'Adversarial defence',
        'Slack channel',
      ],
      cta: 'Build authority',
      featured: true,
    },
  ],
  faq: [
    {
      q: 'What about hidden text or prompt injection to "trick" the LLMs?',
      a: 'We don\'t do it. LLM providers already detect indirect prompt injection and increasingly penalise sites that use it. A single news cycle around your brand "tricking" ChatGPT would be catastrophic. The durable play is to be genuinely cited — which is what we build for you.',
    },
    {
      q: 'How fast can we expect to see results?',
      a: 'Schema and architecture fixes show up in LLM responses within 2–4 weeks. Citation and authority work compounds — meaningful change in the monthly ranking report typically lands at 8–12 weeks.',
    },
    {
      q: 'Which engines do you monitor?',
      a: 'ChatGPT, Claude, Perplexity, Google AI Overviews, Bing Copilot, and You.com. We add new ones as they reach material market share. The technique generalises — schema and citations work everywhere.',
    },
    {
      q: 'Will traditional SEO still matter?',
      a: 'Yes — for now. Google still drives the majority of LLM citations indirectly. We don\'t replace your SEO, we extend it. If you want a single team running both, our retainer covers it.',
    },
  ],
  cta: { primary: 'Run a free AISEO audit', secondary: 'Talk to us' },
};
