// consequence-engine.ts — the Event Consequence Engine.
// One life event -> consequences across all three domains. This is PathWise's central
// originality: it is why PathWise is one product, not three.
//
// It reads rulepacks/consequence-map.json (declarative), evaluates each consequence's
// condition against the event, computes derived deadline DATES from the derivation strings,
// and is DOMICILE-GATE-AWARE: for a student blocked by F-1/J1/M1 status, residency-domain
// consequences are transformed into an honest "does not apply — blocked by status" note,
// which reinforces the cross-domain thesis instead of contradicting it.

import type { LifeEvent, Student, RuleCitation } from '../types';
import map from '../rulepacks/consequence-map.json';

const GATE_STATUSES = new Set(['F1', 'J1', 'M1']);

export interface DerivedConsequence {
  domain: 'immigration' | 'residency' | 'aid';
  kind: string;
  effect: string;
  counterintuitive: boolean;
  applies: boolean;             // false when suppressed (e.g. residency blocked by status)
  tone: 'warn' | 'ok' | 'info'; // drives the UI colour
  newDeadline?: { date?: string; derivation: string; consequenceOfMissing: string };
  supersedes?: string[];
  cite: RuleCitation;
}

function addDays(iso: string, n: number): string {
  const d = new Date(Date.parse(iso + 'T00:00:00Z') + n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

// Resolve the known derivation strings to concrete dates. Unknown derivations return no date
// (we show the derivation text rather than invent a date — same "unable to verify" discipline).
function resolveDeadline(derivation: string, event: LifeEvent): string | undefined {
  const start = (event.attrs.start_date as string) || event.date;
  const m = derivation.match(/\+\s*(\d+)\s*days/);
  const days = m ? parseInt(m[1], 10) : undefined;
  if (days === undefined) return undefined;
  if (derivation.includes('start_date') || derivation.includes('employment_start_date')) {
    return addDays(start, days);
  }
  if (derivation.includes('program_completion_date')) {
    const pc = event.attrs.program_completion_date as string | undefined;
    return pc ? addDays(pc, days) : undefined;
  }
  return undefined;
}

// Very small, safe condition evaluator for the handful of conditions in the map.
// Supports: "attrs.is_coop != true", "attrs.hours_per_week >= 20".
function evalCondition(cond: string | undefined, event: LifeEvent): boolean {
  if (!cond) return true;
  const hpw = event.attrs.hours_per_week;
  if (cond.includes('is_coop != true')) return event.attrs.is_coop !== true;
  if (cond.includes('hours_per_week >= 20')) return typeof hpw === 'number' && hpw >= 20;
  return true;
}

type RawConsequence = {
  domain: 'immigration' | 'residency' | 'aid';
  kind: string;
  effect: string;
  counterintuitive?: boolean;
  condition?: string;
  new_deadline?: { derivation: string; consequence_of_missing: string };
  supersedes?: string[];
  cite: RuleCitation;
};

/**
 * Apply a life event to a student and return the derived consequences across all domains.
 */
export function applyLifeEvent(student: Student, event: LifeEvent): DerivedConsequence[] {
  const events = (map as any).events as Record<string, { consequences: RawConsequence[] }>;
  const entry = events[event.type];
  if (!entry) return [];

  const gated = GATE_STATUSES.has(student.immigration.status);
  const out: DerivedConsequence[] = [];

  for (const c of entry.consequences) {
    if (!evalCondition(c.condition, event)) continue;

    // Gate awareness: residency consequences don't fire for a status-blocked student.
    if (c.domain === 'residency' && gated) {
      out.push({
        domain: 'residency',
        kind: 'eligibility_changed',
        effect:
          `You might expect a job to help your residency case — but ${student.immigration.status} status blocks Virginia domicile entirely, so this changes nothing for residency.`,
        counterintuitive: true,
        applies: false,
        tone: 'info',
        cite: {
          text: 'Holders of a student visa cannot establish domicile in Virginia.',
          authority: 'SCHEV Domicile Guidelines Pt II §03(A)',
          verified_on: '2026-07-24',
        },
      });
      continue;
    }

    const nd = c.new_deadline
      ? {
          date: resolveDeadline(c.new_deadline.derivation, event),
          derivation: c.new_deadline.derivation,
          consequenceOfMissing: c.new_deadline.consequence_of_missing,
        }
      : undefined;

    const tone: DerivedConsequence['tone'] =
      c.kind === 'clock_not_paused' || c.kind === 'obligation_created' || c.kind === 'finding_invalidated'
        ? 'warn'
        : c.domain === 'residency'
        ? 'ok'
        : 'info';

    out.push({
      domain: c.domain,
      kind: c.kind,
      effect: c.effect,
      counterintuitive: !!c.counterintuitive,
      applies: true,
      tone,
      newDeadline: nd,
      supersedes: c.supersedes,
      cite: c.cite,
    });
  }

  return out;
}
