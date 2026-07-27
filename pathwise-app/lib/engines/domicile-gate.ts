// domicile-gate.ts — Engine B core: the eligible-alien gate + the clock-start rule.
//
// The gate IS the originality: one status fact closes the residency door (and the aid door), which
// is the cross-domain moment the whole product is built around. It runs FIRST and, when it fires,
// stops the analysis — the order SCHEV Part II §03(A) itself prescribes.
//
// This file owns the gate, the clock arithmetic and the pack-sourced constants that every domicile
// screen prints. The deeper analysis a student who PASSES the gate is entitled to — dependency,
// intent factors, construction rules — lives in domicile.ts and is built on the pieces exported
// here, so there is exactly one statement of each rule.
//
// Every regulatory value and every citation string below is read from rulepacks/va-domicile.json;
// another state's gate is a different pack, not different code.

import type { Student, Event, Finding, DecidingOffice, ISODate } from '../types';
import { formatImmigrationStatus } from '../format';
import pack from '../rulepacks/va-domicile.json';

// The pack owns the condition as a clause. Same deliberately small reader as aid-eligibility's
// matchesWhen: it understands the one shape the packs use — "immigration.status in ['F1','J1','M1']"
// — and an unrecognised shape yields no statuses, so the gate declines to fire on a rule it cannot
// read rather than guessing at one.
function statusesFromWhen(when: string): string[] {
  const m = when.match(/immigration\.status\s+in\s+\[([^\]]*)\]/);
  if (!m) return [];
  return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
}

const eligibleAlienGate = pack.gates[0];
// The single statement of "which statuses close the residency door" in the codebase. Exported so
// gate-aware consumers (consequence-engine) match on the pack's clause instead of restating it.
export const GATE_STATUSES: ReadonlySet<string> = new Set(statusesFromWhen(eligibleAlienGate.when));
export const DOMICILE_DURATION_DAYS = pack.clock.duration_days;

// Pack metadata the findings carry through to the screen. The verification date in particular is
// rendered ("Verified on …"), so a re-verified pack whose date was also typed into this file would
// keep showing the old one. Exported because the consequence engine cites the same gate.
export const DOMICILE_VERIFIED_ON = pack.verified_on;
export const DOMICILE_SOURCE_URL = pack.source_url;
const GATE_RESULT = eligibleAlienGate.result as Finding['result'];
// The pack names the deciding office once, on the gate; every domicile finding is decided by that
// same office, so every branch reads it from there rather than repeating the code.
export const DOMICILE_OFFICE = eligibleAlienGate.deciding_office as DecidingOffice;

// The pack's own section references. Nothing in the app types a "§" by hand — a citation that can
// drift from the file it came from is one that will.
export const GATE_CITE = eligibleAlienGate.cite;
// The same gate, abbreviated for a compact chip. The full form does not fit a domain card or a
// hero line, so the pack carries both spellings rather than letting the UI invent the short one.
export const GATE_DISPLAY_CITE = eligibleAlienGate.display_cite;
export const CLOCK_CITE = pack.clock.start_rule_cite;
export const CLOCK_START_RULE_NOTE = pack.clock.start_rule_note;
export const CLOCK_ANCHOR_DEFINITION = pack.clock.anchor_definition;

/**
 * How a section reference from the pack is printed alongside the pack's own authority line — the
 * one place either string is composed. A cite the authority already names is not repeated.
 */
export function domicileAuthority(...cites: string[]): string {
  const unique = cites.filter(
    (c, i) => c && cites.indexOf(c) === i && !pack.authority.includes(c),
  );
  return unique.length ? `${unique.join('; ')}; ${pack.authority}` : pack.authority;
}

/** The pack-wide volatility note, in the shape a Finding carries it. */
export const DOMICILE_VOLATILITY: NonNullable<Finding['volatility']> = {
  status: pack.volatility.status as NonNullable<Finding['volatility']>['status'],
  note: pack.volatility.note,
};

/** One satisfied intent factor: which of the pack's factors, and the date it occurred. */
export interface IntentFactorFact {
  /** Matches an `id` in the pack's intent_factors list. */
  id: string;
  date: ISODate;
  /** Facts the pack's caveats turn on — e.g. `is_coop` for the employment factor. */
  attrs?: Record<string, unknown>;
  /** Timeline events this factor rests on, so a claim on screen can show its evidence chain. */
  event_ids?: string[];
}

export interface DomicileInput {
  student: Student;
  events: Event[];
  // Which intent factors are satisfied, and when (the date each occurred).
  intentFactors: IntentFactorFact[];
  // The date of alleged entitlement = first official day of class of the term in question.
  allegedEntitlementDate: ISODate;
  /**
   * Dependency exceptions from the pack that the record asserts (ids from
   * dependency.exceptions). The ones the timeline can prove are derived, not asserted — see
   * domicile.ts — so this is only for the facts no event carries.
   */
  dependencyExceptions?: string[];
}

/** Days since the epoch. Exported so every domicile screen does date maths one way. */
export function toOrdinal(iso: string): number {
  return Math.floor(Date.parse(iso + 'T00:00:00Z') / 86_400_000);
}
export function addDays(iso: string, n: number): ISODate {
  const d = new Date(Date.parse(iso + 'T00:00:00Z') + n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/**
 * The gate itself, as its own step: returns a Finding when the student's status closes domicile,
 * and undefined when it does not. Callers MUST run this before any other domicile reasoning —
 * SCHEV Part II §03(A) determines national-or-alien first, and the pack's own `stops_analysis`
 * flag says the answer ends the enquiry.
 */
export function checkEligibleAlienGate(student: Student): Finding | undefined {
  const status = student.immigration.status;
  if (!GATE_STATUSES.has(status)) return undefined;

  // The code is what the gate matches on; this is only how it gets written for a reader.
  const statusText = formatImmigrationStatus(status);

  return {
    rule_id: `${pack.pack_id}:${eligibleAlienGate.id}`,
    domain: 'residency',
    result: GATE_RESULT,
    headline: `${statusText} status blocks domicile in Virginia`,
    reasoning_steps: [
      {
        claim: `The student holds ${statusText} status, a temporary (student) visa.`,
        from_events: [],
        from_evidence: [],
      },
      {
        claim: eligibleAlienGate.stops_analysis
          ? `${eligibleAlienGate.explain} No further domicile analysis is performed.`
          : eligibleAlienGate.explain,
        from_events: [],
        from_evidence: [],
      },
    ],
    rule_citation: {
      text: eligibleAlienGate.explain,
      authority: domicileAuthority(GATE_CITE),
      source_url: DOMICILE_SOURCE_URL,
      verified_on: DOMICILE_VERIFIED_ON,
    },
    unknowns: [],
    deciding_office: DOMICILE_OFFICE,
    volatility: DOMICILE_VOLATILITY,
  };
}

export interface DomicileClock {
  /** The factor whose date starts the clock: the LAST qualifying one, never the earliest. */
  startFactor?: IntentFactorFact;
  /** Its date. */
  clockStart?: ISODate;
  durationDays: number;
  /** The earliest date of alleged entitlement that satisfies the duration requirement. */
  earliestEntitlement?: ISODate;
  allegedEntitlementDate: ISODate;
  meetsDuration: boolean;
  /** How many days short the alleged date falls. 0 once the requirement is met. */
  daysShort: number;
}

/**
 * The durational clock. Two rules, both the pack's: it runs for `duration_days` before the date of
 * alleged entitlement, and it starts on the date of the LAST qualifying factor — not on arrival,
 * which is the part every student gets wrong.
 */
export function computeDomicileClock(
  qualifying: IntentFactorFact[],
  allegedEntitlementDate: ISODate,
): DomicileClock {
  const base = {
    durationDays: DOMICILE_DURATION_DAYS,
    allegedEntitlementDate,
  };
  if (qualifying.length === 0) {
    return { ...base, meetsDuration: false, daysShort: DOMICILE_DURATION_DAYS };
  }

  const startFactor = qualifying
    .slice()
    .sort((a, b) => toOrdinal(a.date) - toOrdinal(b.date))
    .at(-1)!;
  const clockStart = startFactor.date;
  const daysHeld = toOrdinal(allegedEntitlementDate) - toOrdinal(clockStart);

  return {
    ...base,
    startFactor,
    clockStart,
    earliestEntitlement: addDays(clockStart, DOMICILE_DURATION_DAYS),
    meetsDuration: daysHeld >= DOMICILE_DURATION_DAYS,
    daysShort: Math.max(0, DOMICILE_DURATION_DAYS - daysHeld),
  };
}

/**
 * Run the Virginia domicile gate and, past it, the durational clock. Returns a Finding.
 * Order matters and mirrors SCHEV Part II §03(A): determine alien status FIRST.
 *
 * This is the narrow reading — status and dates only. runDomicileAnalysis in domicile.ts is the
 * full one, and it starts by calling the same gate.
 */
export function runDomicileGate(input: DomicileInput): Finding {
  const { student, intentFactors, allegedEntitlementDate } = input;

  // GATE — runs first, stops analysis if it fires.
  const gated = checkEligibleAlienGate(student);
  if (gated) return gated;

  // Past the gate: compute the clock start = date of the LAST qualifying intent factor (not arrival).
  if (intentFactors.length === 0) {
    return {
      rule_id: `${pack.pack_id}:clock`,
      domain: 'residency',
      result: 'unable_to_verify',
      headline: 'No qualifying intent factors on record',
      reasoning_steps: [
        { claim: 'The domicile clock starts at the last qualifying intent factor; none are recorded.', from_events: [], from_evidence: [] },
      ],
      rule_citation: {
        text: CLOCK_START_RULE_NOTE,
        authority: domicileAuthority(CLOCK_CITE),
        source_url: DOMICILE_SOURCE_URL,
        verified_on: DOMICILE_VERIFIED_ON,
      },
      unknowns: [
        {
          what: 'Which intent factors (continuous residence, VA tax filing, employment, etc.) are satisfied?',
          why_it_matters: `The ${DOMICILE_DURATION_DAYS}-day clock cannot start until the last qualifying factor is established.`,
          how_to_resolve: 'Collect evidence of each intent factor and its date.',
        },
      ],
      deciding_office: DOMICILE_OFFICE,
    };
  }

  const clock = computeDomicileClock(intentFactors, allegedEntitlementDate);

  return {
    rule_id: `${pack.pack_id}:clock`,
    domain: 'residency',
    result: clock.meetsDuration ? 'review_recommended' : 'potential_risk',
    headline: clock.meetsDuration
      ? `Domicile duration of ${DOMICILE_DURATION_DAYS} days appears satisfied (officer confirms)`
      : `Domicile clock is running; earliest eligibility ${clock.earliestEntitlement}`,
    reasoning_steps: [
      {
        claim: `The last qualifying intent factor ("${clock.startFactor!.id}") occurred on ${clock.clockStart}; the ${DOMICILE_DURATION_DAYS}-day clock starts there, not on arrival.`,
        from_events: [],
        from_evidence: [],
      },
      {
        claim: `Earliest date of alleged entitlement that satisfies the duration requirement is ${clock.earliestEntitlement}.`,
        from_events: [],
        from_evidence: [],
      },
    ],
    rule_citation: {
      text: CLOCK_START_RULE_NOTE,
      authority: domicileAuthority(CLOCK_CITE),
      source_url: DOMICILE_SOURCE_URL,
      verified_on: DOMICILE_VERIFIED_ON,
    },
    unknowns: [],
    deciding_office: DOMICILE_OFFICE,
  };
}
