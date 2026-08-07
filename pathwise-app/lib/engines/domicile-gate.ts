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
import type { JurisdictionPacks } from '../rulepacks';
import type {
  Agency,
  Capability,
  CapabilityLevel,
  Clock,
  DomicilePack,
  Gate,
  PackDomain,
  StatusClassification,
} from '../rulepacks/schema';
import { DETERMINATE_LEVELS } from '../rulepacks/schema';
import { computeDomicileClock, type IntentFactorFact } from './domicile-clock';
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
  /**
   * Every gate the pack states, in the order it states them — which is the order the source applies
   * them in. `gates[0]` was the only one this view ever exposed, so a jurisdiction with two gates
   * (Texas requires lawful presence AND a durational period) silently lost the second. A dropped
   * gate is the worst shape of that bug, because the pack looks complete.
   */
  gates: readonly Gate[];
  /**
   * The gate that fires for a given status, or undefined if none does. This is what the engines
   * ask; the singular `gate*` fields below are jurisdiction-level display and mean the FIRST gate.
   * On a one-gate pack the two are the same gate, which is why Virginia's output is untouched.
   */
  statusGateFor: (status: string) => Gate | undefined;
  /** The union of every status any gate in this pack closes the door on. */
  gateStatuses: ReadonlySet<string>;
  /**
   * How far this pack's status rule was actually read, or undefined where it states none.
   *
   * Undefined is NOT "everything is classified" — it is "this pack makes no claim either way", which
   * is the honest description of Texas and Tennessee, and why `classifiesStatus` below leaves them
   * untouched. Their status gap is already carried by `unmodelledStatusGateUnknowns`.
   */
  statusClassification?: StatusClassification;
  /**
   * Whether this pack has been authored against a given status.
   *
   * True where the pack states no classification at all: a pack that makes no claim about its own
   * reach cannot have this check applied to it, and applying it anyway would silently convert every
   * gateless jurisdiction to unable_to_verify — a change to two states' findings smuggled in under a
   * fix for a third.
   */
  classifiesStatus: (status: string) => boolean;
  /**
   * The pack's durational clock, or undefined where the jurisdiction has none. Optional because
   * some states genuinely have no durational component, and a missing clock must not be read as a
   * clock of zero days.
   */
  clock?: Clock;
  /** Convenience for the common case; undefined when there is no clock. */
  durationDays?: number;
  verifiedOn: string;
  sourceUrl: string;
  /** Every body this pack says decides something, with what each one decides. */
  agencies: readonly Agency[];
  /** What this pack claims to answer, per domain — authored, never inferred. */
  capabilities: readonly Capability[];
  /** How far this pack has been carried in one domain. `not_modelled` when it says nothing. */
  levelFor: (domain: PackDomain) => CapabilityLevel;
  /** Whether this pack may return a determinate answer in one domain. */
  canDecide: (domain: PackDomain) => boolean;
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


// ---------------------------------------------------------------------------------------------
// Shared factor qualification. Used by BOTH this file's gate path and the full analysis in
// domicile.ts, because one pack and one record must not produce two different answers depending on
// which entry point the caller happened to use.
//
// These lived in domicile.ts and were reachable only from the full analysis, so the gate path
// counted factors the analysis disqualified: a non-citizen's voter registration (excluded by the
// pack's own `inapplicable_when`) and co-op employment (excluded by the pack's own caveat) both
// started the durational clock on one path and not on the other. Moved rather than reimplemented —
// a second implementation of a rule is a second thing to keep in sync, which is how the divergence
// started.
// ---------------------------------------------------------------------------------------------

/**
 * Evaluate a pack clause about immigration status — `in ['F1','J1']`, `== 'citizen'`,
 * `!= 'citizen'`. Returns undefined for a shape this reader does not understand, so an unreadable
 * rule is declined rather than guessed at (the same discipline as the gate and the aid engine).
 */
export function evaluateStatusClause(clause: string, student: Student): boolean | undefined {
  const status = student.immigration.status;

  const inMatch = clause.match(/immigration\.status\s+in\s+\[([^\]]*)\]/);
  if (inMatch) {
    return inMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .includes(status);
  }

  const cmp = clause.match(/immigration\.status\s*(!==|!=|===|==|=)\s*['"]?([A-Za-z0-9_-]+)['"]?/);
  if (cmp) {
    const [, op, value] = cmp;
    return op.startsWith('!') ? status !== value : status === value;
  }

  return undefined;
}

/**
 * The facts a pack's caveats turn on. Each entry names a fact the timeline actually carries, matched
 * against the pack's own words — a caveat whose fact is not recognised is never silently applied and
 * never silently dropped.
 */
export const CAVEAT_FACTS: { attr: string; matches: RegExp }[] = [
  { attr: 'is_coop', matches: /co-?op/i },
];

/** Whether a pack's caveat on a factor is ENGAGED by this record. Undefined when unresolvable. */
export function caveatApplies(
  caveat: string | undefined,
  attrs: Record<string, unknown> | undefined,
): boolean | undefined {
  if (!caveat) return false;
  const recogniser = CAVEAT_FACTS.find((c) => c.matches.test(caveat));
  const value = recogniser ? attrs?.[recogniser.attr] : undefined;
  if (!recogniser || value === undefined) return undefined;
  return value === true;
}

/** Read a domicile pack into the view above. Pure; no pack is imported to build it. */
export function domicileView(pack: DomicilePack): DomicileView {
  // The primary gate — for jurisdiction-level DISPLAY only ("the clause that closes this door").
  // Every engine decision goes through `statusGateFor`, which considers all of them.
  //
  // Optional, because a jurisdiction may state no gate at all: Tennessee classifies on domicile and
  // nothing else. This used to be read as `pack.gates[0]` and dereferenced unconditionally, which
  // crashed the moment such a pack was registered — the schema had made a gate mandatory, so no
  // code had ever had to consider a pack without one.
  const gate: Gate | undefined = pack.gates[0];

  // Which statuses each gate closes, computed once. A gate whose clause this reader does not
  // understand contributes nothing — it declines rather than guessing, same as everywhere else.
  const byGate = pack.gates.map((g) => ({ gate: g, statuses: new Set(statusesFromWhen(g.when)) }));

  const capabilityFor = (domain: PackDomain): Capability | undefined =>
    pack.capabilities.find((c) => c.domain === domain);

  return {
    packId: pack.pack_id,
    jurisdictionCode: pack.jurisdiction,
    // The pack states its code; coverage.json states how that code is spelled for a reader. Falling
    // back to the code keeps a pack whose jurisdiction is missing from coverage readable rather than
    // printing "undefined" into a finding.
    jurisdictionName: jurisdictionByCode(pack.jurisdiction)?.name ?? pack.jurisdiction,
    gates: pack.gates,
    // Pack order is the source's order, so the first gate that matches is the one that decides.
    statusGateFor: (status) => byGate.find((g) => g.statuses.has(status))?.gate,
    gateStatuses: new Set(byGate.flatMap((g) => [...g.statuses])),
    statusClassification: pack.status_classification,
    // No classification block ⇒ the pack claims nothing about its reach ⇒ nothing to fail closed on.
    classifiesStatus: (status) =>
      !pack.status_classification || pack.status_classification.classified.includes(status),
    clock: pack.clock,
    durationDays: pack.clock?.duration_days,
    agencies: pack.agencies,
    capabilities: pack.capabilities,
    levelFor: (domain) => capabilityFor(domain)?.level ?? 'not_modelled',
    canDecide: (domain) => {
      const level = capabilityFor(domain)?.level;
      return level !== undefined && DETERMINATE_LEVELS.includes(level);
    },
    // The verification date is rendered ("Verified on …"), so it is read from the pack every time
    // rather than copied anywhere a re-verified pack could leave it stale.
    verifiedOn: pack.verified_on,
    sourceUrl: pack.source_url,
    // A gated pack names the office on each gate; a gateless one states it at the top of the pack,
    // which the parser requires precisely so this can never be undefined. Where gates disagree, the
    // FIRING gate's own office travels on the finding — see checkEligibleAlienGate.
    office: pack.deciding_office ?? gate?.deciding_office ?? 'registrar',
    // All empty on a pack that states no gate. Every consumer either guards on `gates.length` or
    // renders the empty string, which is the honest output: there is no clause to quote.
    gateId: gate?.id ?? '',
    gateCite: gate?.cite ?? '',
    // The gate's abbreviation where there is a gate; the pack's where there is not. Empty only
    // when the pack states neither, which renders as no chip rather than an empty one.
    gateDisplayCite: gate?.display_cite ?? pack.display_cite ?? '',
    gateExplain: gate?.explain ?? '',
    gateHeadlineFor: (statusText: string) =>
      gate ? gate.headline.replace(/^\S+(?=\s+status\b)/, statusText) : '',
    gateResult: gate?.result ?? 'unable_to_verify',
    gateStopsAnalysis: gate?.stops_analysis ?? false,
    // Absent where the pack has no clock. Every consumer reads them through the optional `clock`
    // above or guards on `durationDays`, so a clockless jurisdiction renders nothing rather than a
    // blank citation.
    clockCite: pack.clock?.start_rule_cite ?? '',
    clockStartRuleNote: pack.clock?.start_rule_note ?? '',
    clockAnchorDefinition: pack.clock?.anchor_definition ?? '',
    dependencyCite: pack.dependency?.cite ?? '',
    intentFactorIds: (pack.intent_factors ?? []).map((f) => f.id),
    volatility: {
      status: pack.volatility.status,
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

/**
 * A status the pack's own status rule was never written about.
 *
 * A gate is a BLACKLIST — `immigration.status in ['F1','J1','M1']` — and "no gate matched" was being
 * read as "this jurisdiction permits this status". For an enumerated status somebody considered,
 * that inference is sound. For `other` it is not: `other` is not a status, it is the absence of one,
 * and no clause can have been authored about it. Virginia was returning, for a student whose status
 * PathWise cannot name, output byte-identical to what it returns for a U.S. citizen — "Domicile
 * duration of 365 days appears satisfied", with zero open questions, under a pack declaring its
 * status gate `modelled`.
 *
 * So the pack now says which statuses it was read against, and one outside that list stops here.
 *
 * WHAT THIS IS NOT: it is not a finding that the status is barred, and it must never become one.
 * The result is `unable_to_verify` — the same verdict the product gives an unmodelled jurisdiction —
 * because the honest claim is about PathWise's reading, not about the student's rights. Turning an
 * unclassified status into `ineligible` would be inventing a bar with no source, which is the same
 * error pointed the other way and is exactly what this codebase refuses to do everywhere else.
 *
 * Every sentence below is composed from pack STRUCTURE — the size of the classified list, the
 * jurisdiction's name, the pack's own cite and note — and none of it from a judgement about the
 * jurisdiction's law. Same discipline as `unmodelledStatusGateUnknowns`, and it disappears on its
 * own the day someone classifies that status in the pack.
 */
export function checkStatusClassification(
  student: Student,
  v: DomicileView,
): Finding | undefined {
  const status = student.immigration.status;
  if (v.classifiesStatus(status)) return undefined;

  const sc = v.statusClassification!;
  const statusText = formatImmigrationStatus(status);

  return {
    rule_id: `${v.packId}:status-not-classified`,
    domain: 'residency',
    result: 'unable_to_verify',
    headline: `PathWise has not read ${v.jurisdictionName}'s domicile rules for this immigration status`,
    reasoning_steps: [
      {
        claim: `The record gives the student's immigration status as "${statusText}", which is not one of the ${sc.classified.length} statuses ${v.jurisdictionName}'s pack has been authored against.`,
        from_events: [],
        from_evidence: [],
      },
      {
        claim: `${sc.note} PathWise therefore cannot say whether this status can establish domicile in ${v.jurisdictionName}, and does not run the durational clock on a status whose capacity to hold domicile it has not established.`,
        from_events: [],
        from_evidence: [],
      },
      {
        // The sentence that stops a reader converting silence into a denial.
        claim: `This is not a finding that the status is barred. ${v.jurisdictionName} may well recognise it; PathWise has not read the rule either way, and will not guess in either direction.`,
        from_events: [],
        from_evidence: [],
      },
    ],
    rule_citation: {
      text: sc.note,
      authority: v.authority(sc.cite),
      source_url: v.sourceUrl,
      verified_on: v.verifiedOn,
    },
    unknowns: [
      {
        what: `Which immigration status does "${statusText}" stand for, and how does ${v.jurisdictionName} treat it?`,
        why_it_matters:
          `${v.jurisdictionName}'s domicile rules turn on the specific status held. PathWise has read ` +
          `that source for ${sc.classified.length} statuses and this is not one of them, so any ` +
          `durational or intent finding underneath it would rest on a question nobody has answered. ` +
          `It is not a finding that the status is barred — it is PathWise declining to answer.`,
        how_to_resolve:
          `Give ${v.jurisdictionName}'s domicile officer the exact status on the record (the visa ` +
          `category or classification, not "other") and ask whether it can establish domicile there.`,
      },
    ],
    deciding_office: v.office,
    volatility: v.volatility,
  };
}

/**
 * The gate itself, as its own step: returns a Finding when the pack's status rule DECIDES the
 * question, and undefined when it leaves the question open for the analysis below to continue.
 * Callers MUST run this before any other domicile reasoning — SCHEV Part II §03(A) determines
 * national-or-alien first, and the pack's own `stops_analysis` flag says the answer ends the enquiry.
 *
 * Two ways it returns a Finding, and they mean opposite things: a gate fired and closed the door, or
 * the pack was never authored against this status at all and cannot answer. The classification check
 * lives HERE rather than in `runDomicileGate` on purpose — this function is the single entry point
 * both the narrow gate path and the full analysis in domicile.ts call, and a check placed in one of
 * them would let the two disagree about the same pack and the same record. That divergence is the
 * defect this file's own history is a record of; there is one statement of the rule and both callers
 * get it.
 */
export function checkEligibleAlienGate(student: Student, v: DomicileView): Finding | undefined {
  const status = student.immigration.status;

  // ALL of the pack's gates are considered, in pack order, and the first that matches decides.
  // This used to read `gates[0]` only. Every value below comes off the gate that actually fired —
  // its own citation, its own office, its own headline — so a jurisdiction whose second gate closes
  // the door cannot be cited to its first.
  //
  // A firing gate wins over the classification check below, and the order is load-bearing: F-1 is
  // both classified AND barred, and a pack that listed a status it also gates must still return the
  // gate's determinate `ineligible` rather than "PathWise has not read this".
  const gate = v.statusGateFor(status);
  if (!gate) return checkStatusClassification(student, v);

  // The code is what the gate matches on; this is only how it gets written for a reader.
  const statusText = formatImmigrationStatus(status);

  return {
    rule_id: `${v.packId}:${gate.id}`,
    domain: 'residency',
    result: gate.result,
    headline: gate.headline.replace(/^\S+(?=\s+status\b)/, statusText),
    reasoning_steps: [
      {
        claim: `The student holds ${statusText} status, a temporary (student) visa.`,
        from_events: [],
        from_evidence: [],
      },
      {
        claim: gate.stops_analysis
          ? `${gate.explain} No further domicile analysis is performed.`
          : gate.explain,
        from_events: [],
        from_evidence: [],
      },
    ],
    rule_citation: {
      text: gate.explain,
      authority: v.authority(gate.cite),
      source_url: v.sourceUrl,
      verified_on: v.verifiedOn,
    },
    unknowns: [],
    deciding_office: gate.deciding_office,
    volatility: v.volatility,
  };
}

// The clock, its two strategies and its result type now live in ./domicile-clock.ts — the anchor
// and start rule were fields every pack wrote down and nothing read, with Virginia's arithmetic
// hardcoded underneath them. Re-exported here because this is where every caller already imports
// domicile vocabulary from.
export {
  computeDomicileClock,
  clockStartFor,
  clockAnchorFor,
  ClockStrategyError,
  toOrdinal,
  addDays,
  type DomicileClock,
  type ClockContext,
  type IntentFactorFact,
} from './domicile-clock';

/**
 * What a pack that states NO status gate has not said.
 *
 * `checkEligibleAlienGate` returns undefined in two situations that mean opposite things, and
 * downstream they were indistinguishable:
 *
 *   · the pack states gates and none closes on THIS student's status — a real finding. The
 *     jurisdiction was asked and answered: that status is not barred here.
 *   · the pack states no gates at all — PathWise has never read whether this jurisdiction bars any
 *     status. Nobody has been asked anything.
 *
 * Collapsing the second into the first is how Texas came to return "Domicile duration of 365 days
 * appears satisfied" for an F-1 student, with no mention of visa status, on the same screen where
 * Virginia returns Blocked on that identical fact. Every sentence in the Texas finding was true.
 * The SILENCE was not: a reader comparing the two states reads it as "F-1 doesn't matter in Texas",
 * which is a legal claim PathWise has never made and has no source for.
 *
 * So the gap is declared as an open question. Deliberately not a block — inventing a bar is the
 * same error pointed the other way, and asserting one without a source is precisely what this
 * codebase refuses to do everywhere else. The pack's `partial` capability level already says this
 * jurisdiction is half-read; this says WHICH half.
 *
 * Derived from pack STRUCTURE (`gates.length === 0`) and never from a judgement about the
 * jurisdiction's law — which is why it needed no legal research to add, and why it disappears on
 * its own the day someone authors a gate for that pack.
 */
export function unmodelledStatusGateUnknowns(v: DomicileView): Finding['unknowns'] {
  if (v.gates.length > 0) return [];
  return [
    {
      what: `Does immigration status affect domicile in ${v.jurisdictionName}?`,
      why_it_matters:
        `PathWise has not modelled a status gate for ${v.jurisdictionName}, so this finding answers ` +
        `the durational and intent questions ONLY. It is not a finding that status does not matter ` +
        `here: some states bar certain statuses outright, and a reading with no gate modelled would ` +
        `not have detected such a bar.`,
      how_to_resolve:
        `Confirm with ${v.jurisdictionName}'s deciding office whether your immigration status ` +
        `affects domicile before relying on this reading.`,
    },
  ];
}

/**
 * Run the supplied pack's domicile gate and, past it, the durational clock. Returns a Finding.
 * Order matters and mirrors the gate's own placement in the guidelines: alien status FIRST.
 *
 * This is the narrow reading — status and dates only. runDomicileAnalysis in domicile.ts is the
 * full one, and it starts by calling the same gate.
 */
export function runDomicileGate(run: DomicileRun): Finding {
  const { student, allegedEntitlementDate } = run;
  const v = domicileView(run.packs.domicile);

  // GATE — runs first, stops analysis if it fires.
  const gated = checkEligibleAlienGate(student, v);
  if (gated) return gated;

  // Only factors this pack actually weighs can start this pack's clock.
  //
  // This path used to hand `run.intentFactors` straight to the clock with no check, so ANY id
  // started it — `{ id: 'i_simply_declare_myself_a_resident' }` returned "Domicile duration of 365
  // days appears satisfied". The full analysis in domicile.ts has always matched supplied factors
  // against `pack.intent_factors` and rejected the same input, so one pack and one record produced
  // two contradictory answers depending only on which entry point the caller used. That divergence
  // was the defect; a wrong answer from the permissive half was how it showed up.
  //
  // Dropped rather than thrown, which is what every other reader in this codebase does with input
  // it cannot account for: the gate declines a clause it cannot parse, the consequence engine
  // declines a condition it cannot evaluate. An id the pack does not know is not an error by the
  // caller, it is a fact PathWise has no rule for — and the honest response is to not count it and
  // to say so, which `ignoredFactors` below does through the finding's own `unknowns`.
  //
  // Three disqualifications, and all three are the PACK's own: the factor must be one this
  // jurisdiction weighs, its `inapplicable_when` clause must not exclude this student, and its
  // caveat must not be engaged by this record. The full analysis has always applied all three; this
  // path applied none of them, so a non-citizen's voter registration and co-op employment each
  // started the clock here and were correctly refused there.
  const declared = new Map((run.packs.domicile.intent_factors ?? []).map((f) => [f.id, f]));
  const counts = (f: IntentFactorFact): boolean => {
    const factor = declared.get(f.id);
    if (!factor) return false;
    if (factor.inapplicable_when && evaluateStatusClause(factor.inapplicable_when, student) === true) {
      return false;
    }
    // Disqualified only when the caveat DEFINITELY applies. `undefined` means the record cannot
    // settle whether it does, and the analysis counts such a factor while raising the caveat as an
    // open question — so `!== true` rather than `=== false`, which would drop it.
    //
    // Worth stating plainly, because the first version of this line got it backwards: fail-closed
    // is about not asserting more than the rules support, NOT about refusing everything uncertain.
    // Dropping an unresolved factor would have understated a student's own case on the strength of
    // a fact nobody has established either way, which is its own kind of wrong answer.
    return caveatApplies(factor.caveat, f.attrs) !== true;
  };

  const intentFactors = run.intentFactors.filter(counts);
  const ignoredFactors = run.intentFactors.filter((f) => !counts(f));

  // A jurisdiction with no durational requirement has no clock to run, and inventing one of zero
  // days would be inventing a rule. The honest answer names what PathWise does model here.
  if (!v.clock) {
    return {
      rule_id: `${v.packId}:no-durational-clock`,
      domain: 'residency',
      result: 'review_recommended',
      headline: `${v.jurisdictionName} sets no durational requirement PathWise can count`,
      reasoning_steps: [
        {
          // "The gate does not close domicile for this student" is a true sentence only where a
          // gate was actually consulted. On a pack that states none it asserts a check that never
          // happened, which is the same silence this branch's `unknowns` exists to break.
          claim:
            v.gates.length > 0
              ? `The gate does not close domicile for this student, and this jurisdiction's pack states no durational period — so there is no waiting clock to compute.`
              : `${v.jurisdictionName}'s pack states no status gate PathWise has modelled and no durational period — so there is no waiting clock to compute.`,
          from_events: [],
          from_evidence: [],
        },
        {
          claim: `What remains is the officer's own determination on the record as it stands.`,
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
      unknowns: unmodelledStatusGateUnknowns(v),
      deciding_office: v.office,
    };
  }

  // Past the gate: the clock start comes from the PACK's own start rule, not from a rule this
  // function knows. Same for the anchor it is measured to.
  if (intentFactors.length === 0) {
    return {
      rule_id: `${v.packId}:clock`,
      domain: 'residency',
      result: 'unable_to_verify',
      headline: 'No qualifying intent factors on record',
      reasoning_steps: [
        { claim: 'The domicile clock starts at the last qualifying intent factor; none are recorded.', from_events: [], from_evidence: [] },
        // Only when something WAS supplied and none of it counted. Saying so is the difference
        // between "you told me nothing" and "what you told me is not a factor this state weighs",
        // and a reader who supplied a date deserves to know which of those happened.
        ...(ignoredFactors.length > 0
          ? [
              {
                claim: `${ignoredFactors.length} supplied ${
                  ignoredFactors.length === 1 ? 'factor does' : 'factors do'
                } not count toward ${v.jurisdictionName}'s clock — either not weighed by this jurisdiction, excluded by the pack's own condition on the factor, or caught by its caveat: ${ignoredFactors
                  .map((f) => f.id)
                  .join(', ')}.`,
                from_events: [],
                from_evidence: [],
              },
            ]
          : []),
      ],
      rule_citation: {
        text: v.clockStartRuleNote,
        authority: v.authority(v.clockCite),
        source_url: v.sourceUrl,
        verified_on: v.verifiedOn,
      },
      unknowns: [
        ...unmodelledStatusGateUnknowns(v),
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

  const clock = computeDomicileClock(v.clock, {
    qualifying: intentFactors,
    events: run.events,
    allegedEntitlementDate,
  });

  // Anything supplied and not counted is surfaced as an open question rather than dropped in
  // silence, so "I gave PathWise a date and nothing happened" is never a mystery.
  // The status-gate gap leads, because it qualifies the whole finding rather than one supplied fact.
  const ignoredUnknowns: Finding['unknowns'] = ignoredFactors.map((f) => ({
    what: `"${f.id}" did not count toward ${v.jurisdictionName}'s durational clock.`,
    why_it_matters: `It was supplied with this record and was not counted — either ${v.jurisdictionName} does not weigh it, or the pack's own condition on that factor excludes this student, or its caveat is engaged. PathWise will not start a clock on a factor the jurisdiction's own rules do not credit.`,
    how_to_resolve: `Check it against the ${v.intentFactorIds.length} factors ${v.jurisdictionName} weighs, or ask its deciding office how this fact is treated.`,
  }));

  return {
    rule_id: `${v.packId}:clock`,
    domain: 'residency',
    result: clock.meetsDuration ? 'review_recommended' : 'potential_risk',
    headline: clock.meetsDuration
      ? `Domicile duration of ${clock.durationDays} days appears satisfied (officer confirms)`
      : `Domicile clock is running; earliest eligibility ${clock.earliestEntitlement}`,
    reasoning_steps: [
      {
        claim: `The last qualifying intent factor ("${clock.startFactor!.id}") occurred on ${clock.clockStart}; the ${clock.durationDays}-day clock starts there, not on arrival.`,
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
    unknowns: [...unmodelledStatusGateUnknowns(v), ...ignoredUnknowns],
    deciding_office: v.office,
  };
}
