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
// Every regulatory value and every citation string below is read from the domicile pack the caller
// supplies; another state's gate is a different pack, not different code. Nothing in this file names
// Virginia, and nothing in it imports a pack — see engines/jurisdiction.ts for where one comes from.

import type { Student, Event, Finding, DecidingOffice, ISODate } from '../types';
import type { DomicilePack, JurisdictionPacks } from '../rulepacks';
import { formatImmigrationStatus } from '../format';
import { jurisdictionByCode } from '../coverage';

// The pack owns the condition as a clause. Same deliberately small reader as aid-eligibility's
// matchesWhen: it understands the one shape the packs use — "immigration.status in ['F1','J1','M1']"
// — and an unrecognised shape yields no statuses, so the gate declines to fire on a rule it cannot
// read rather than guessing at one.
function statusesFromWhen(when: string): string[] {
  const m = when.match(/immigration\.status\s+in\s+\[([^\]]*)\]/);
  if (!m) return [];
  return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
}

/**
 * One pack, read once, in the vocabulary the engines and screens actually use.
 *
 * These were module constants when the Virginia pack was imported at the top of this file. They are
 * the same values read the same way — the only change is WHOSE pack they come from, which is now
 * the caller's question to answer instead of this file's to assume.
 */
export interface DomicileView {
  packId: string;
  /** The pack's own jurisdiction, and that jurisdiction's name as the coverage file spells it. */
  jurisdictionCode: string;
  jurisdictionName: string;
  /** Which statuses close the residency door, per this pack's gate clause. */
  gateStatuses: ReadonlySet<string>;
  durationDays: number;
  verifiedOn: string;
  sourceUrl: string;
  office: DecidingOffice;
  /** The gate's own section reference, and the abbreviated spelling the pack carries for chips. */
  gateId: string;
  gateCite: string;
  gateDisplayCite: string;
  gateExplain: string;
  /**
   * The gate's headline for a given status label. The pack authors the sentence for one example
   * status ("F-1 status blocks domicile in Virginia"); this swaps in the status the student actually
   * holds, so J-1 and M-1 read correctly without the pack carrying three near-identical headlines.
   * The jurisdiction's own wording is the pack's, never a sentence this engine composes.
   */
  gateHeadlineFor: (statusText: string) => string;
  gateResult: Finding['result'];
  gateStopsAnalysis: boolean;
  clockCite: string;
  clockStartRuleNote: string;
  clockAnchorDefinition: string;
  /** The section reference behind this pack's dependency presumption. */
  dependencyCite: string;
  /**
   * The ids of the factors this pack actually weighs. Exposed so a question about "which intent
   * factors" can name the pack's own, rather than a list of Virginia examples typed into an engine
   * every jurisdiction shares.
   */
  intentFactorIds: readonly string[];
  volatility: NonNullable<Finding['volatility']>;
  /**
   * How a section reference is printed alongside this pack's authority line — the one place either
   * string is composed. A cite the authority already names is not repeated.
   */
  authority: (...cites: string[]) => string;
}

/** Read a domicile pack into the view above. Pure; no pack is imported to build it. */
export function domicileView(pack: DomicilePack): DomicileView {
  const gate = pack.gates[0];
  return {
    packId: pack.pack_id,
    jurisdictionCode: pack.jurisdiction,
    // The pack states its code; coverage.json states how that code is spelled for a reader. Falling
    // back to the code keeps a pack whose jurisdiction is missing from coverage readable rather than
    // printing "undefined" into a finding.
    jurisdictionName: jurisdictionByCode(pack.jurisdiction)?.name ?? pack.jurisdiction,
    gateStatuses: new Set(statusesFromWhen(gate.when)),
    durationDays: pack.clock.duration_days,
    // The verification date is rendered ("Verified on …"), so it is read from the pack every time
    // rather than copied anywhere a re-verified pack could leave it stale.
    verifiedOn: pack.verified_on,
    sourceUrl: pack.source_url,
    // The pack names the deciding office once, on the gate; every domicile finding is decided by
    // that same office, so every branch reads it from there rather than repeating the code.
    office: gate.deciding_office as DecidingOffice,
    gateId: gate.id,
    gateCite: gate.cite,
    gateDisplayCite: gate.display_cite,
    gateExplain: gate.explain,
    gateHeadlineFor: (statusText: string) => gate.headline.replace(/^\S+(?=\s+status\b)/, statusText),
    gateResult: gate.result as Finding['result'],
    gateStopsAnalysis: gate.stops_analysis,
    clockCite: pack.clock.start_rule_cite,
    clockStartRuleNote: pack.clock.start_rule_note,
    clockAnchorDefinition: pack.clock.anchor_definition,
    dependencyCite: pack.dependency.cite,
    intentFactorIds: pack.intent_factors.map((f) => f.id),
    volatility: {
      status: pack.volatility.status as NonNullable<Finding['volatility']>['status'],
      note: pack.volatility.note,
    },
    authority: (...cites: string[]) => {
      const unique = cites.filter(
        (c, i) => c && cites.indexOf(c) === i && !pack.authority.includes(c),
      );
      return unique.length ? `${unique.join('; ')}; ${pack.authority}` : pack.authority;
    },
  };
}

/**
 * Turn a pack id into readable prose without a hardcoded label table.
 *
 * A pack names some of its ids after its own state ("va_income_tax_filed"), and that token is an
 * initialism, not a word. Which token counts is the PACK's jurisdiction code, passed in — not a
 * literal, and not "any two-letter token": "id", "in", "or" and "me" are all state codes and all
 * plausible id fragments, so a blanket rule would mangle ids no pack meant as an abbreviation.
 */
export function humanizeId(id: string, jurisdictionCode?: string): string {
  const code = jurisdictionCode?.toLowerCase();
  const words = id.split('_').map((w) => (code && w === code ? w.toUpperCase() : w));
  const first = words[0];
  const isInitialism = /^[A-Z]{2,}$/.test(first);
  return [isInitialism ? first : first.charAt(0).toUpperCase() + first.slice(1), ...words.slice(1)].join(' ');
}

/** A label inside a sentence. An initialism is left alone — "VA income tax filed" must not become "vA…". */
export function lowerLabel(s: string): string {
  if (/^[A-Z]{2,}/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

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

/**
 * A DomicileInput with the packs that decide it attached.
 *
 * Callers build the pack-free `DomicileInput` — a fixture is facts about a student, not a claim
 * about which rules apply to them. The jurisdiction router resolves the student's state and injects
 * `packs` here, which is why an engine can no longer be run without someone having answered "under
 * whose rules?" first.
 */
export type DomicileRun = DomicileInput & { packs: JurisdictionPacks };

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
export function checkEligibleAlienGate(student: Student, v: DomicileView): Finding | undefined {
  const status = student.immigration.status;
  if (!v.gateStatuses.has(status)) return undefined;

  // The code is what the gate matches on; this is only how it gets written for a reader.
  const statusText = formatImmigrationStatus(status);

  return {
    rule_id: `${v.packId}:${v.gateId}`,
    domain: 'residency',
    result: v.gateResult,
    headline: v.gateHeadlineFor(statusText),
    reasoning_steps: [
      {
        claim: `The student holds ${statusText} status, a temporary (student) visa.`,
        from_events: [],
        from_evidence: [],
      },
      {
        claim: v.gateStopsAnalysis
          ? `${v.gateExplain} No further domicile analysis is performed.`
          : v.gateExplain,
        from_events: [],
        from_evidence: [],
      },
    ],
    rule_citation: {
      text: v.gateExplain,
      authority: v.authority(v.gateCite),
      source_url: v.sourceUrl,
      verified_on: v.verifiedOn,
    },
    unknowns: [],
    deciding_office: v.office,
    volatility: v.volatility,
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
  durationDays: number,
): DomicileClock {
  const base = {
    durationDays,
    allegedEntitlementDate,
  };
  if (qualifying.length === 0) {
    return { ...base, meetsDuration: false, daysShort: durationDays };
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
    earliestEntitlement: addDays(clockStart, durationDays),
    meetsDuration: daysHeld >= durationDays,
    daysShort: Math.max(0, durationDays - daysHeld),
  };
}

/**
 * Run the supplied pack's domicile gate and, past it, the durational clock. Returns a Finding.
 * Order matters and mirrors the gate's own placement in the guidelines: alien status FIRST.
 *
 * This is the narrow reading — status and dates only. runDomicileAnalysis in domicile.ts is the
 * full one, and it starts by calling the same gate.
 */
export function runDomicileGate(run: DomicileRun): Finding {
  const { student, intentFactors, allegedEntitlementDate } = run;
  const v = domicileView(run.packs.domicile);

  // GATE — runs first, stops analysis if it fires.
  const gated = checkEligibleAlienGate(student, v);
  if (gated) return gated;

  // Past the gate: compute the clock start = date of the LAST qualifying intent factor (not arrival).
  if (intentFactors.length === 0) {
    return {
      rule_id: `${v.packId}:clock`,
      domain: 'residency',
      result: 'unable_to_verify',
      headline: 'No qualifying intent factors on record',
      reasoning_steps: [
        { claim: 'The domicile clock starts at the last qualifying intent factor; none are recorded.', from_events: [], from_evidence: [] },
      ],
      rule_citation: {
        text: v.clockStartRuleNote,
        authority: v.authority(v.clockCite),
        source_url: v.sourceUrl,
        verified_on: v.verifiedOn,
      },
      unknowns: [
        {
          // The examples are the pack's own first three factors, not a list typed here. A pack
          // that weighs different things asks about the things it weighs.
          what: `Which intent factors (${v.intentFactorIds
            .slice(0, 3)
            .map((id) => lowerLabel(humanizeId(id, v.jurisdictionCode)))
            .join(', ')}, etc.) are satisfied?`,
          why_it_matters: `The ${v.durationDays}-day clock cannot start until the last qualifying factor is established.`,
          how_to_resolve: 'Collect evidence of each intent factor and its date.',
        },
      ],
      deciding_office: v.office,
    };
  }

  const clock = computeDomicileClock(intentFactors, allegedEntitlementDate, v.durationDays);

  return {
    rule_id: `${v.packId}:clock`,
    domain: 'residency',
    result: clock.meetsDuration ? 'review_recommended' : 'potential_risk',
    headline: clock.meetsDuration
      ? `Domicile duration of ${v.durationDays} days appears satisfied (officer confirms)`
      : `Domicile clock is running; earliest eligibility ${clock.earliestEntitlement}`,
    reasoning_steps: [
      {
        claim: `The last qualifying intent factor ("${clock.startFactor!.id}") occurred on ${clock.clockStart}; the ${v.durationDays}-day clock starts there, not on arrival.`,
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
      text: v.clockStartRuleNote,
      authority: v.authority(v.clockCite),
      source_url: v.sourceUrl,
      verified_on: v.verifiedOn,
    },
    unknowns: [],
    deciding_office: v.office,
  };
}
