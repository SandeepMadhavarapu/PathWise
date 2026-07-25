// domicile-gate.ts — Engine B core: the eligible-alien gate + clock-start rule.
// Per decision D1 (docs/08-decisions-log.md) residency is a GATE, not a full 400-line engine.
// The gate IS the originality: one status fact closes the residency door (and the aid door),
// which is the cross-domain moment the whole product is built around.

import type { Student, Event, Finding, ISODate } from '../types';
import { formatStatusCode } from '../status-display';

const GATE_STATUSES = new Set(['F1', 'J1', 'M1']);
const DOMICILE_DURATION_DAYS = 365;

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
      rule_id: 'va-domicile:eligible_alien_gate',
      domain: 'residency',
      result: 'ineligible',
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
        source_url:
          'https://www.schev.edu/students/resources-for-students/paying-for-college/determining-domicile',
        verified_on: '2026-07-24',
      },
      unknowns: [],
      deciding_office: 'domicile_officer',
      volatility: {
        status: 'under_litigation',
        note: 'Tuition-equity provision subject to DOJ challenge; re-verify before relying on it.',
      },
    };
  }

  // Past the gate: compute the clock start = date of the LAST qualifying intent factor (not arrival).
  if (intentFactors.length === 0) {
    return {
      rule_id: 'va-domicile:clock',
      domain: 'residency',
      result: 'unable_to_verify',
      headline: 'No qualifying intent factors on record',
      reasoning_steps: [
        { claim: 'The domicile clock starts at the last qualifying intent factor; none are recorded.', from_events: [], from_evidence: [] },
      ],
      rule_citation: {
        text: 'The institution must look at the date on which the last of the factors supporting domicile occurred.',
        authority: 'SCHEV Domicile Guidelines §05(C)(1)',
        verified_on: '2026-07-24',
      },
      unknowns: [
        {
          what: 'Which intent factors (continuous residence, VA tax filing, employment, etc.) are satisfied?',
          why_it_matters: 'The one-year clock cannot start until the last qualifying factor is established.',
          how_to_resolve: 'Collect evidence of each intent factor and its date.',
        },
      ],
      deciding_office: 'domicile_officer',
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
    rule_id: 'va-domicile:clock',
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
      verified_on: '2026-07-24',
    },
    unknowns: [],
    deciding_office: 'domicile_officer',
  };
}
