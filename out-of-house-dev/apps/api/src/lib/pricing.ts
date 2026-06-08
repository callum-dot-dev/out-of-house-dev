// Server-side price book (Appendix A). Checkout NEVER trusts a client amount —
// it resolves price + mode from here by product_ref. Amounts are integer pence.
export type Mode = 'one_off' | 'monthly';
export type Sku = {
  sku: string;
  name: string;
  pence: number;
  mode: Mode;
  product_type: string; // payments.product_type
};

// Keyed by canonical product_ref.
export const CATALOGUE: Record<string, Sku> = {
  // Courses (developer)
  'course:ai-fast-start-3w': { sku: 'OOH-COURSE-ai-fast-start-3w', name: 'AI Fast-Start (3w dev)', pence: 39500, mode: 'one_off', product_type: 'course' },
  'course:ai-builder-6w': { sku: 'OOH-COURSE-ai-builder-6w', name: 'AI Builder (6w dev)', pence: 79500, mode: 'one_off', product_type: 'course' },
  'course:ai-engineer-12w': { sku: 'OOH-COURSE-ai-engineer-12w', name: 'AI / Automation Engineer (12w dev)', pence: 149500, mode: 'one_off', product_type: 'course' },
  // Courses (business)
  'course:business-ai-fast-3w': { sku: 'OOH-COURSE-business-ai-fast-3w', name: 'Business AI Fast-Start (3w)', pence: 150000, mode: 'one_off', product_type: 'course' },
  'course:business-ai-department-6w': { sku: 'OOH-COURSE-business-ai-department-6w', name: 'Build an AI Department (6w)', pence: 350000, mode: 'one_off', product_type: 'course' },
  'course:business-ai-transformation-12w': { sku: 'OOH-COURSE-business-ai-transformation-12w', name: 'AI Business Transformation (12w)', pence: 650000, mode: 'one_off', product_type: 'course' },
  // Coaching
  'coaching:hour': { sku: 'OOH-COACH-HOUR', name: '1:1 coaching hour', pence: 10000, mode: 'one_off', product_type: 'coaching_hour' },
  'team:training': { sku: 'OOH-TEAM-TRAINING', name: 'Internal team training (from)', pence: 250000, mode: 'one_off', product_type: 'custom' },
  // LogoVault SaaS
  'saas:logovault:indie': { sku: 'OOH-LV-INDIE', name: 'LogoVault Indie', pence: 900, mode: 'monthly', product_type: 'saas_subscription' },
  'saas:logovault:studio': { sku: 'OOH-LV-STUDIO', name: 'LogoVault Studio', pence: 3900, mode: 'monthly', product_type: 'saas_subscription' },
  'saas:logovault:agency': { sku: 'OOH-LV-AGENCY', name: 'LogoVault Agency', pence: 14900, mode: 'monthly', product_type: 'saas_subscription' },
  // Website care
  'care:site': { sku: 'OOH-CARE-SITE', name: 'Website hosting & care', pence: 10000, mode: 'monthly', product_type: 'retainer' },
  // Maintenance retainers
  'retainer:lightweight': { sku: 'OOH-RETAINER-LIGHT', name: 'Maintenance retainer — lightweight', pence: 150000, mode: 'monthly', product_type: 'retainer' },
  'retainer:standard': { sku: 'OOH-RETAINER-STD', name: 'Maintenance retainer — standard', pence: 250000, mode: 'monthly', product_type: 'retainer' },
  'retainer:heavy': { sku: 'OOH-RETAINER-HEAVY', name: 'Maintenance retainer — heavy', pence: 400000, mode: 'monthly', product_type: 'retainer' },
  // Lead engine
  'leads:starter:setup': { sku: 'OOH-LEADS-STARTER-SETUP', name: 'Lead engine starter — setup', pence: 50000, mode: 'one_off', product_type: 'custom' },
  'leads:starter:mo': { sku: 'OOH-LEADS-STARTER-MO', name: 'Lead engine starter — monthly', pence: 25000, mode: 'monthly', product_type: 'saas_subscription' },
  'leads:pipeline:setup': { sku: 'OOH-LEADS-PIPELINE-SETUP', name: 'Lead engine pipeline — setup', pence: 150000, mode: 'one_off', product_type: 'custom' },
  'leads:pipeline:mo': { sku: 'OOH-LEADS-PIPELINE-MO', name: 'Lead engine pipeline — monthly', pence: 75000, mode: 'monthly', product_type: 'saas_subscription' },
  'leads:engine:setup': { sku: 'OOH-LEADS-ENGINE-SETUP', name: 'Lead engine room — setup', pence: 400000, mode: 'one_off', product_type: 'custom' },
  'leads:engine:mo': { sku: 'OOH-LEADS-ENGINE-MO', name: 'Lead engine room — monthly', pence: 200000, mode: 'monthly', product_type: 'saas_subscription' },
  // AISEO
  'aiseo:foundation:setup': { sku: 'OOH-AISEO-FOUNDATION-SETUP', name: 'AISEO Foundation — setup', pence: 150000, mode: 'one_off', product_type: 'custom' },
  'aiseo:foundation:mo': { sku: 'OOH-AISEO-FOUNDATION-MO', name: 'AISEO Foundation — monthly', pence: 50000, mode: 'monthly', product_type: 'saas_subscription' },
  'aiseo:authority:setup': { sku: 'OOH-AISEO-AUTHORITY-SETUP', name: 'AISEO Authority — setup', pence: 350000, mode: 'one_off', product_type: 'custom' },
  'aiseo:authority:mo': { sku: 'OOH-AISEO-AUTHORITY-MO', name: 'AISEO Authority — monthly', pence: 150000, mode: 'monthly', product_type: 'saas_subscription' },
};

export const resolveSku = (productRef: string): Sku | null => CATALOGUE[productRef] ?? null;
export const allSkus = (): Sku[] => Object.values(CATALOGUE);
