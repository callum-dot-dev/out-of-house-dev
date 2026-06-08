// Auto-merge policy engine (spec Phase 5). Eligible only when ALL hold:
//   risk == low, LLM review == pass, CI == green, project auto_merge != false,
//   and the global kill switch is on (settings.auto_merge_enabled).
import type { Risk } from './risk';

export type MergeInputs = {
  risk: Risk;
  review: 'pass' | 'needs_changes';
  ci: 'green' | 'red' | 'unknown';
  autoMerge: boolean; // project.metadata.auto_merge !== false
  killSwitchOn: boolean; // settings.auto_merge_enabled
};

export function isAutoMergeEligible(i: MergeInputs): boolean {
  return i.risk === 'low' && i.review === 'pass' && i.ci === 'green' && i.autoMerge && i.killSwitchOn;
}
