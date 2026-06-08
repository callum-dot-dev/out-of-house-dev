// Legal status transitions for the build pipeline (spec Phase 5 state machine).
export const TRANSITIONS: Record<string, string[]> = {
  submitted: ['scoped', 'rejected', 'blocked'],
  scoped: ['quoted', 'planned', 'rejected', 'blocked'],
  quoted: ['planned', 'rejected', 'blocked'],
  planned: ['building', 'blocked'],
  building: ['review', 'blocked'],
  review: ['approved', 'rejected', 'blocked', 'building'],
  approved: ['deploying', 'blocked'],
  deploying: ['shipped', 'blocked'],
  shipped: [],
  rejected: [],
  blocked: ['scoped', 'planned', 'building', 'review'],
};

export const ALL_STATUSES = Object.keys(TRANSITIONS);

export function canTransition(from: string, to: string): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}
