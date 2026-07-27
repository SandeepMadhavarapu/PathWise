// consequence-engine.ts — the Event Consequence Engine.
// One life event -> consequences across all three domains. This is PathWise's central
// originality: it is why PathWise is one product, not three.
//
// It reads rulepacks/consequence-map.json (declarative), evaluates each consequence's
// condition against the event, computes derived deadline DATES from the derivation strings,
// and is DOMICILE-GATE-AWARE: for a student whose status trips the domicile gate (read from the
// jurisdiction context the caller resolved, not from any pack this file imports), residency-domain
// consequences are transformed into an honest "does not apply — blocked by status" note,
// which reinforces the cross-domain thesis instead of contradicting it.
//
// The map is the one rulepack an engine still binds at module scope, and that is only safe because
// it is jurisdiction-agnostic. It was not: its residency entries used to carry SCHEV section
// references, which every state would have worn the moment a second pack was registered — the
// original bug, hiding one file outside the seam. Residency authorities are now resolved from the
// student's own domicile pack via `cite_from`. See lib/test/jurisdiction-routing.test.ts, which
// fails if a state's name or authority reappears in this map.

import type { LifeEvent, Student, RuleCitation } from '../types';
import { formatImmigrationStatus } from '../format';
import { domicileView, type DomicileView } from './domicile-gate';
import type { JurisdictionContext } from './jurisdiction';
import map from '../rulepacks/consequence-map.json';

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
// Same deliberately small reader as domicile-gate's statusesFromWhen: it understands the one
// shape the map uses — "attrs.<field> <operator> <literal>", e.g. "attrs.is_coop != true" or
// "attrs.hours_per_week >= 20" — and takes BOTH the operator and the operand out of the clause,
// so a threshold like 20 hrs/week is stated once, in the pack, and never restated here.
type Comparison = { field: string; op: string; operand: string | number | boolean };

function parseLiteral(raw: string): string | number | boolean | undefined {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  const quoted = raw.match(/^'([^']*)'$/) ?? raw.match(/^"([^"]*)"$/);
  return quoted ? quoted[1] : undefined;
}

function parseCondition(cond: string): Comparison | undefined {
  const m = cond.match(/^\s*attrs\.([A-Za-z_]\w*)\s*(>=|<=|==|!=|>|<)\s*(.+?)\s*$/);
  if (!m) return undefined;
  const operand = parseLiteral(m[3]);
  if (operand === undefined) return undefined;
  return { field: m[1], op: m[2], operand };
}

function evalCondition(cond: string | undefined, event: LifeEvent): boolean {
  if (!cond) return true;

  const c = parseCondition(cond);
  // An unrecognised shape fails closed: the consequence declines to fire on a condition it
  // cannot read, rather than guessing that the condition passed.
  if (!c) return false;

  const value = event.attrs[c.field];
  if (c.op === '==') return value === c.operand;
  if (c.op === '!=') return value !== c.operand;

  // Ordered comparisons are numeric only; a missing or non-numeric attribute cannot satisfy one.
  if (typeof value !== 'number' || typeof c.operand !== 'number') return false;
  switch (c.op) {
    case '>=': return value >= c.operand;
    case '<=': return value <= c.operand;
    case '>': return value > c.operand;
    case '<': return value < c.operand;
    default: return false;
  }
}

type RawConsequence = {
  domain: 'immigration' | 'residency' | 'aid';
  kind: string;
  effect: string;
  counterintuitive?: boolean;
  condition?: string;
  new_deadline?: { derivation: string; consequence_of_missing: string };
  supersedes?: string[];
  /** Which section of the student's domicile pack a residency consequence rests on. */
  cite_from?: 'clock' | 'dependency';
  cite: RuleCitation;
};

/**
 * The citation for one consequence.
 *
 * Immigration and aid entries carry their own: 8 CFR and SEVP guidance answer for every student.
 * A residency entry does not and must not — the rule it states is general, but the authority for it
 * belongs to whichever state is deciding. So the map names the pack SECTION (`cite_from`) and the
 * pack supplies the reference, the source link and the verification date.
 */
function citeFor(c: RawConsequence, v: DomicileView | undefined): RuleCitation {
  if (c.domain !== 'residency' || !v) return c.cite;
  const section =
    c.cite_from === 'clock' ? v.clockCite : c.cite_from === 'dependency' ? v.dependencyCite : undefined;
  return {
    text: c.cite.text,
    // No section named means the pack has no reference for this one; its own authority line stands
    // alone rather than being padded with a section it does not say.
    authority: section ? v.authority(section) : v.authority(),
    source_url: v.sourceUrl,
    verified_on: v.verifiedOn,
  };
}

/**
 * Apply a life event to a student and return the derived consequences across all domains.
 *
 * The immigration and aid consequences are federal or pack-driven and answer for any student. The
 * residency ones depend on a state's gate, so they need the jurisdiction context: with a pack, the
 * gate's own statuses and citation decide; without one, PathWise has no gate to reason from and
 * says so rather than borrowing another state's.
 */
export function applyLifeEvent(
  student: Student,
  event: LifeEvent,
  ctx: JurisdictionContext,
): DerivedConsequence[] {
  const events = (map as any).events as Record<string, { consequences: RawConsequence[] }>;
  const entry = events[event.type];
  if (!entry) return [];

  // No pack means no gate: `undefined`, not `false`. The distinction matters below — "the gate does
  // not fire" and "there is no gate" are different answers and must not collapse into each other.
  const v = ctx.packs ? domicileView(ctx.packs.domicile) : undefined;
  const gated = v ? v.gateStatuses.has(student.immigration.status) : undefined;
  const statusText = formatImmigrationStatus(student.immigration.status);
  const out: DerivedConsequence[] = [];

  for (const c of entry.consequences) {
    if (!evalCondition(c.condition, event)) continue;

    // Gate awareness: residency consequences don't fire for a status-blocked student.
    if (c.domain === 'residency' && gated && v) {
      out.push({
        domain: 'residency',
        kind: 'eligibility_changed',
        effect: `You might expect a job to help your residency case — but ${statusText} status blocks ${v.jurisdictionName} domicile entirely, so this changes nothing for residency.`,
        counterintuitive: true,
        applies: false,
        tone: 'info',
        cite: {
          // The gate's own words and section reference, not a sentence retyped beside them.
          text: v.gateExplain,
          authority: v.authority(v.gateCite),
          verified_on: v.verifiedOn,
        },
      });
      continue;
    }

    // No pack for this state: PathWise cannot say whether the residency door is open, so it will
    // not say that this event moved it. No citation is attached, because there is none to attach.
    if (c.domain === 'residency' && gated === undefined) {
      out.push({
        domain: 'residency',
        kind: 'eligibility_changed',
        effect: `What this means for residency depends on ${ctx.name}'s own rules, which PathWise has not modelled. It will not guess at them from another state's.`,
        counterintuitive: false,
        applies: false,
        tone: 'info',
        cite: {
          text: `PathWise has not authored and verified a residency rule pack for ${ctx.name}.`,
          authority: ctx.unmodelled?.authority ?? `${ctx.name} residency rules — no source verified by PathWise yet`,
          source_url: ctx.unmodelled?.source_url,
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
      cite: citeFor(c, v),
    });
  }

  return out;
}
