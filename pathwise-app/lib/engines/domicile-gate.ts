// domicile-gate.ts — Engine B core: the eligible-alien gate + clock-start rule.
// Per decision D1 (docs/08-decisions-log.md) residency is a GATE, not a full 400-line engine.
// The gate IS the originality: one status fact closes the residency door (and the aid door),
// which is the cross-domain moment the whole product is built around.
//
// The gated statuses and the one-year duration are read from rulepacks/va-domicile.json; another
// state's gate is a different pack, not different code.

import type { Student, Event, Finding, DecidingOffice, ISODate } from '../types';
import { formatStatusCode } from '../status-display';
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
const DOMICILE_DURATION_DAYS = pack.clock.duration_days;

// Pack metadata the findings carry through to the screen. The verification date in particular is
// rendered ("Verified on …"), so a re-verified pack whose date was also typed into this file would
// keep showing the old one. Exported because the consequence engine cites the same gate.
export const DOMICILE_VERIFIED_ON = pack.verified_on;
const DOMICILE_SOURCE_URL = pack.source_url;
const GATE_RESULT = eligibleAlienGate.result as Finding['result'];
// The pack names the deciding office once, on the gate; every domicile finding is decided by that
// same office, so both branches below read it from there rather than repeating the code.
const DOMICILE_OFFICE = eligibleAlienGate.deciding_office as DecidingOffice;

export interface DomicileInput {
  student: Student;
  events: Event[];
  // Which intent factors are satisfied, and when (the date each occurred).
  intentFactors: { id: string; date: ISODate }[];
  // The date of alleged entitlement = first official day of class of the term in question.
  allegedEntitlementDate: ISODate;
}

function toOrdinal(iso: string): number {
  return Math.floor(Date.parse(iso + 'T00:00:00Z') / 86_400_000);
}
function addDays(iso: string, n: number): ISODate {
  const d = new Date(Date.parse(iso + 'T00:00:00Z') + n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/**
 * Run the Virginia domicile gate. Returns a Finding.
 * Order matters and mirrors SCHEV Part II §03(A): determine alien status FIRST.
 */
export function runDomicileGate(input: DomicileInput): Finding {
  const { student, intentFactors, allegedEntitlementDate } = input;
  const status = student.immigration.status;
  // The code is what the gate matches on; this is only how it gets written for a reader.
  const statusText = formatStatusCode(status);

  // GATE — runs first, stops analysis if it fires.
  if (GATE_STATUSES.has(status)) {
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
          claim:
            'Holders of student or temporary visas do not have the capacity to establish domicile in Virginia, so no further domicile analysis is performed.',
          from_events: [],
          from_evidence: [],
        },
      ],
      rule_citation: {
        text: 'The institution shall first determine whether the student is a national or an alien. Holders of student/temporary visas cannot establish domicile.',
        authority: 'SCHEV Domicile Guidelines, Part II §03(A) & §02(4); Code of Virginia 23.1-510(D)',
        source_url: DOMICILE_SOURCE_URL,
        verified_on: DOMICILE_VERIFIED_ON,
      },
      unknowns: [],
      deciding_office: DOMICILE_OFFICE,
      volatility: {
        status: pack.volatility.status as NonNullable<Finding['volatility']>['status'],
        note: 'Tuition-equity provision subject to DOJ challenge; re-verify before relying on it.',
      },
    };
  }

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
        text: 'The institution must look at the date on which the last of the factors supporting domicile occurred.',
        authority: 'SCHEV Domicile Guidelines §05(C)(1)',
        verified_on: DOMICILE_VERIFIED_ON,
      },
      unknowns: [
        {
          what: 'Which intent factors (continuous residence, VA tax filing, employment, etc.) are satisfied?',
          why_it_matters: 'The one-year clock cannot start until the last qualifying factor is established.',
          how_to_resolve: 'Collect evidence of each intent factor and its date.',
        },
      ],
      deciding_office: DOMICILE_OFFICE,
    };
  }

  const lastFactor = intentFactors
    .slice()
    .sort((a, b) => toOrdinal(a.date) - toOrdinal(b.date))
    .at(-1)!;
  const clockStart = lastFactor.date;
  const earliestEligibility = addDays(clockStart, DOMICILE_DURATION_DAYS);
  const meetsDuration = toOrdinal(allegedEntitlementDate) - toOrdinal(clockStart) >= DOMICILE_DURATION_DAYS;

  return {
    rule_id: `${pack.pack_id}:clock`,
    domain: 'residency',
    result: meetsDuration ? 'review_recommended' : 'potential_risk',
    headline: meetsDuration
      ? 'One-year domicile duration appears satisfied (officer confirms)'
      : `Domicile clock is running; earliest eligibility ${earliestEligibility}`,
    reasoning_steps: [
      {
        claim: `The last qualifying intent factor ("${lastFactor.id}") occurred on ${clockStart}; the one-year clock starts there, not on arrival.`,
        from_events: [],
        from_evidence: [],
      },
      {
        claim: `Earliest date of alleged entitlement that satisfies the one-year requirement is ${earliestEligibility}.`,
        from_events: [],
        from_evidence: [],
      },
    ],
    rule_citation: {
      text: 'Domicile must be established for one year prior to the date of alleged entitlement; the clock starts at the last qualifying factor.',
      authority: 'SCHEV Domicile Guidelines §05(C)(1)',
      verified_on: DOMICILE_VERIFIED_ON,
    },
    unknowns: [],
    deciding_office: DOMICILE_OFFICE,
  };
}
