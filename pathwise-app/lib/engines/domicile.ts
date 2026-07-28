// domicile.ts — Engine B, the whole of it.
//
// domicile-gate.ts answers the first question SCHEV asks and, for a student on a temporary visa,
// the only one: national or alien. This file is what a student who gets PAST that gate is actually
// entitled to — the analysis the guidelines spend nine sections on and that no chatbot performs,
// because it is not one rule but four readings of one timeline, in a fixed order:
//
//   §03(A)  the eligible-alien gate            — runs FIRST, and stops everything if it fires
//   §09(C)(1) dependency                       — WHOSE intent is examined at all
//   §06(B)  the intent factors and their weight — WHAT the record shows of that intent
//   §05(C)(1) the durational clock             — WHEN the last of those factors landed
//
// Dependency comes before the factors even though its section number is higher: until it is settled
// the analysis does not know whose acts it is reading — the student's own, or their parents'.
//
// Every threshold, weight, exception, caveat, warning and section reference is read from the
// domicile pack the caller supplies. This file states no regulatory value of its own and names no
// jurisdiction; where the pack speaks in prose (a caveat, a warning, a rule of construction), the
// prose is carried through verbatim and the engine's job is only to decide whether the record
// engages it — and to say so honestly when it cannot tell.

import type { Event, Finding, ISODate, ProgramLevel, Student } from '../types';
import type { DomicilePack } from '../rulepacks';
import { formatImmigrationStatus } from '../format';
import {
  CAVEAT_FACTS,
  checkEligibleAlienGate,
  computeDomicileClock,
  domicileView,
  evaluateStatusClause,
  humanizeId,
  lowerLabel,
  toOrdinal,
  unmodelledStatusGateUnknowns,
  type DomicileClock,
  type DomicileRun,
  type DomicileView,
  type IntentFactorFact,
} from './domicile-gate';

// ---- pack shapes (a JSON import cannot carry the optional fields we branch on) ----

// These mirror the schema's own shapes. They stay as local aliases rather than importing the schema
// types directly because this file reads a narrowed projection of the pack, not the pack itself.
type RawIntentFactor = { id: string; weight: string; inapplicable_when?: string; caveat?: string };
type RawConstructionRule = { id: string; note: string; cite?: string; kind?: string };

/**
 * The parts of a domicile pack this file reads, resolved once per run.
 *
 * These were module constants back when the Virginia pack was imported at the top of this file.
 * Same values, same reads — the difference is that the pack now arrives with the student, so an
 * analysis cannot be run without someone having said whose rules it is under.
 */
interface DomicileRules {
  intentFactors: RawIntentFactor[];
  constructionRules: RawConstructionRule[];
  auxiliaryCite: string;
  auxiliaryNote: string;
  auxiliaryActs: readonly string[];
  dependencyAgeThreshold: number;
  dependencyCite: string;
  dependencyExceptions: readonly string[];
  // The pack gives a section reference to the auxiliary-acts warning but not to the factor list
  // itself, so the factor analysis is cited to the pack's own authority line rather than to a
  // section number PathWise would be inventing for it.
  intentFactorsAuthority: string;
  /** The pack's own code, so `humanizeId` knows which token this pack abbreviates itself with. */
  jurisdictionCode: string;
}

// Every block below is optional on the pack, because not every jurisdiction has every rule: a state
// may weigh no enumerated intent factors, publish no auxiliary-acts warning, or state no rules of
// construction. An absent block reads as "this jurisdiction has no such rule", which is why each
// default is EMPTY rather than Virginia's — an empty list produces no claims, whereas a borrowed
// one produces claims sourced to the wrong state.
function domicileRules(pack: DomicilePack): DomicileRules {
  return {
    jurisdictionCode: pack.jurisdiction,
    intentFactors: pack.intent_factors ?? [],
    constructionRules: pack.construction_rules ?? [],
    auxiliaryCite: pack.auxiliary_acts_warning?.cite ?? '',
    auxiliaryNote: pack.auxiliary_acts_warning?.note ?? '',
    auxiliaryActs: pack.auxiliary_acts_warning?.acts ?? [],
    dependencyAgeThreshold: pack.dependency?.presumed_dependent_under_age ?? 0,
    dependencyCite: pack.dependency?.cite ?? '',
    dependencyExceptions: pack.dependency?.exceptions ?? [],
    intentFactorsAuthority: pack.authority,
  };
}

// ---- prose helpers -----------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Exported so the screen prints a date exactly as the reasoning steps print it. */
export function formatDomicileDate(iso: ISODate): string {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

// `humanizeId` lives in domicile-gate.ts, which the gate's own unknowns also need it for, and is
// re-exported here because this is where every screen already imports it from.
export { humanizeId };

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

function isAre(n: number): string {
  return n === 1 ? 'is' : 'are';
}


// A few English inflections, stripped so the pack's own two spellings of one act resolve to each
// other: the warning calls it `va_tax_filing`, the factor list calls it `va_income_tax_filed`.
// Display and matching only — no rule is decided by this.
const SUFFIXES = ['ations', 'ation', 'ments', 'ment', 'ings', 'ing', 'ies', 'ed', 'es', 's', 'e'];

function stem(word: string): string {
  for (const s of SUFFIXES) {
    if (word.endsWith(s) && word.length - s.length >= 3) return word.slice(0, -s.length);
  }
  return word;
}

function stems(id: string): Set<string> {
  return new Set(id.split('_').map(stem));
}

// ---- the one condition shape the pack's clauses use ---------------------------------------------

// evaluateStatusClause and CAVEAT_FACTS moved to domicile-gate.ts so the GATE path applies the
// same disqualifications this file does. Two implementations of one rule is how the paths came
// to disagree; there is one now, imported above.

// ---- dependency (§09(C)(1)) ---------------------------------------------------------------------

// ProgramLevel is PathWise's own enum, not the pack's vocabulary — this is what our levels mean,
// which is why it lives here and not in the rulepack.
const GRADUATE_LEVELS: ProgramLevel[] = ['masters', 'doctoral'];

export type DependencyStatus = 'presumed_dependent' | 'independent' | 'not_presumed';

export interface DependencyDetermination {
  ageAtEntitlement: number;
  thresholdAge: number;
  /** Whether the age presumption applies at all. */
  presumptionApplies: boolean;
  status: DependencyStatus;
  /** The exception that rebutted the presumption, if one did. */
  exception?: {
    id: string;
    label: string;
    /** How PathWise knows — derived from the timeline, or asserted on the record. */
    basis: string;
    derived: boolean;
    eventIds: string[];
  };
  /** The pack's exceptions still open, when none has been established. */
  openExceptions: readonly string[];
  cite: string;
}

/**
 * One exception the timeline can prove on its own. The other six are facts no event in the record
 * carries (a marriage, a guardianship, a discharge), so they arrive as assertions on the input and
 * are validated against the pack's list. The id below is matched against the pack: rename it there
 * and this derivation simply stops firing, which is the safe direction — the exception falls back to
 * an assertion, and an unasserted exception falls back to an open question.
 */
function deriveGraduateException(
  events: Event[],
  institutions: Student['institutions'],
  on: ISODate,
): { basis: string; eventIds: string[] } | undefined {
  const started = events.filter(
    (e) =>
      e.type === 'program_start' &&
      e.program_level &&
      GRADUATE_LEVELS.includes(e.program_level) &&
      toOrdinal(e.date) <= toOrdinal(on),
  );
  if (started.length > 0) {
    const first = started.sort((a, b) => toOrdinal(a.date) - toOrdinal(b.date))[0];
    const inst = institutions.find((i) => i.id === first.institution_id);
    return {
      basis: `The timeline carries a ${first.program_level}-level program starting ${formatDomicileDate(
        first.date,
      )}${inst ? ` at ${inst.name}` : ''}, on or before the date of alleged entitlement.`,
      eventIds: [first.id],
    };
  }
  return undefined;
}

export function determineDependency(input: DomicileRun): DependencyDetermination {
  const { student, events, allegedEntitlementDate } = input;
  const R = domicileRules(input.packs.domicile);
  const age = ageOn(student.dob, allegedEntitlementDate);
  const presumptionApplies = age < R.dependencyAgeThreshold;

  // Only exception ids the pack actually lists are honoured; anything else on the input is not a
  // rule this jurisdiction has.
  const asserted = (input.dependencyExceptions ?? []).filter((id) => R.dependencyExceptions.includes(id));

  const graduateId = 'graduate_or_professional_student';
  const derived = R.dependencyExceptions.includes(graduateId)
    ? deriveGraduateException(events, student.institutions, allegedEntitlementDate)
    : undefined;

  // Pack order is the guidelines' order, so the first exception the pack lists that this record
  // establishes is the one named — and a derived fact is preferred over an asserted one.
  const establishedIds = R.dependencyExceptions.filter(
    (id) => asserted.includes(id) || (id === graduateId && derived),
  );
  const firedId = establishedIds[0];

  const exception = firedId
    ? {
        id: firedId,
        label: humanizeId(firedId, R.jurisdictionCode),
        basis:
          firedId === graduateId && derived
            ? derived.basis
            : 'Asserted on the student record; the officer verifies it against the underlying document.',
        derived: firedId === graduateId && Boolean(derived),
        eventIds: firedId === graduateId && derived ? derived.eventIds : [],
      }
    : undefined;

  const status: DependencyStatus = !presumptionApplies
    ? 'not_presumed'
    : exception
      ? 'independent'
      : 'presumed_dependent';

  return {
    ageAtEntitlement: age,
    thresholdAge: R.dependencyAgeThreshold,
    presumptionApplies,
    status,
    exception,
    openExceptions: presumptionApplies && !exception ? R.dependencyExceptions : [],
    cite: R.dependencyCite,
  };
}

function ageOn(dob: ISODate, on: ISODate): number {
  const [by, bm, bd] = dob.split('-').map(Number);
  const [y, m, d] = on.split('-').map(Number);
  const before = m < bm || (m === bm && d < bd);
  return y - by - (before ? 1 : 0);
}

// ---- intent factors (§06(B)) --------------------------------------------------------------------

export type FactorState = 'satisfied' | 'does_not_count' | 'inapplicable' | 'not_on_record';
export type CaveatResolution = 'applies' | 'does_not_apply' | 'unresolved';

export interface IntentFactorRow {
  id: string;
  label: string;
  /** The pack's own weight word. */
  weight: string;
  state: FactorState;
  date?: ISODate;
  eventIds: string[];
  /** True when the pack's auxiliary-acts warning names this act. */
  auxiliary: boolean;
  /** Which act in the warning it matched, in the warning's own words. */
  auxiliaryAct?: string;
  /** The pack's clause, verbatim, when the factor cannot apply to this student. */
  inapplicableWhen?: string;
  inapplicableBecause?: string;
  /** The pack's caveat, verbatim, and whether this record engages it. */
  caveat?: string;
  caveatResolution?: CaveatResolution;
  /** Whether this factor can start the durational clock. */
  counts: boolean;
}

export interface IntentAnalysis {
  rows: IntentFactorRow[];
  qualifying: IntentFactorRow[];
  /** Satisfied and counting, but every one of them an act the warning names. */
  auxiliaryOnly: boolean;
  auxiliaryQualifying: IntentFactorRow[];
  inapplicable: IntentFactorRow[];
  disqualified: IntentFactorRow[];
  notOnRecord: IntentFactorRow[];
  warning: { cite: string; note: string; acts: readonly string[] };
  cite: string;
  /** Set when an auxiliary act is dated relative to a milestone the timeline does not carry. */
  unresolvedMilestones: string[];
}

// The pack states its caveats and its auxiliary acts in prose and in ids. The engine can only
// APPLY one whose disqualifying fact it recognises on the record; each entry below names a fact the
// timeline actually carries, matched against the pack's own words. A caveat whose fact is not
// recognised is surfaced verbatim as a question for the officer — never silently applied, never
// silently dropped.
// CAVEAT_FACTS moved to domicile-gate.ts — see the note above.

// An auxiliary act id may carry a temporal qualifier ("post_admission_employment"): the act is only
// auxiliary if it happened after a milestone the timeline can date. The milestone is resolved
// against the event types that name it, so no date is written down here.
const TEMPORAL_QUALIFIERS = ['post', 'pre'];

/** The date of the milestone an auxiliary act is qualified against, or undefined if unknowable. */
function milestoneDate(milestone: string, events: Event[]): ISODate | undefined {
  const target = stem(milestone);
  const dates = events
    .filter((e) => e.type.split('_').some((t) => stem(t) === target))
    .map((e) => e.date)
    .sort((a, b) => toOrdinal(a) - toOrdinal(b));
  // The LATEST such milestone, not the earliest: where a record carries more than one and the rule
  // could be read against either, the reading that makes fewer of the student's acts "auxiliary" is
  // the one the pack's own rule of construction directs.
  return dates.at(-1);
}

interface AuxMatch {
  act: string;
  /** Set when the act's temporal qualifier could not be evaluated. */
  unresolvedMilestone?: string;
}

/**
 * Does the pack's auxiliary-acts warning name this factor? The pack owns WHICH acts carry little
 * weight; this decides only whether one of its ids refers to the factor in front of us — every
 * distinctive word of the act has to appear in the factor, so `va_tax_filing` matches
 * `va_income_tax_filed` while `vehicle_registration` does not match `voter_registration`.
 */
function matchAuxiliaryAct(
  factor: RawIntentFactor,
  fact: IntentFactorFact | undefined,
  events: Event[],
  auxiliaryActs: readonly string[],
): AuxMatch | undefined {
  const factorStems = stems(factor.id);

  for (const act of auxiliaryActs) {
    const words = act.split('_');
    // A temporal qualifier is followed by the milestone it qualifies — "post_admission_employment"
    // is the act `employment`, qualified as after `admission`. Everything else is the act itself,
    // and every word of it has to be present in the factor.
    const qi = words.findIndex((w) => TEMPORAL_QUALIFIERS.includes(w));
    const qualifier = qi >= 0 ? words[qi] : undefined;
    const milestone = qi >= 0 ? words[qi + 1] : undefined;

    const actWords = words.filter((_, i) => i !== qi && !(milestone && i === qi + 1));
    if (actWords.length === 0) continue;
    if (!actWords.every((w) => factorStems.has(stem(w)))) continue;

    if (!qualifier || !milestone) return { act };

    // A qualified act needs both a milestone date and the factor's own date to be comparable.
    const on = milestoneDate(milestone, events);
    if (!on || !fact) return { act, unresolvedMilestone: milestone };
    const after = toOrdinal(fact.date) >= toOrdinal(on);
    if (qualifier === 'post' ? after : !after) return { act };
  }

  return undefined;
}

export function analyseIntentFactors(input: DomicileRun): IntentAnalysis {
  const { student, events } = input;
  const R = domicileRules(input.packs.domicile);
  const byId = new Map(input.intentFactors.map((f) => [f.id, f]));
  const unresolvedMilestones = new Set<string>();

  const rows: IntentFactorRow[] = R.intentFactors.map((factor) => {
    const fact = byId.get(factor.id);
    const aux = matchAuxiliaryAct(factor, fact, events, R.auxiliaryActs);
    if (aux?.unresolvedMilestone && fact) unresolvedMilestones.add(aux.unresolvedMilestone);

    const row: IntentFactorRow = {
      id: factor.id,
      label: humanizeId(factor.id, R.jurisdictionCode),
      weight: factor.weight,
      state: 'not_on_record',
      date: fact?.date,
      eventIds: fact?.event_ids ?? [],
      auxiliary: Boolean(aux && !aux.unresolvedMilestone),
      auxiliaryAct: aux && !aux.unresolvedMilestone ? aux.act : undefined,
      inapplicableWhen: factor.inapplicable_when,
      caveat: factor.caveat,
      counts: false,
    };

    // 1. Can this factor apply to this student at all? The pack's clause decides.
    if (factor.inapplicable_when) {
      const inapplicable = evaluateStatusClause(factor.inapplicable_when, student);
      if (inapplicable) {
        row.state = 'inapplicable';
        row.inapplicableBecause = `${formatImmigrationStatus(student.immigration.status)} status: the pack's own condition on this factor excludes it.`;
        return row;
      }
    }

    // 2. Is it on the record?
    if (!fact) return row;

    // 3. Does the pack attach a caveat, and does this record engage it?
    if (factor.caveat) {
      const recogniser = CAVEAT_FACTS.find((c) => c.matches.test(factor.caveat!));
      const value = recogniser ? fact.attrs?.[recogniser.attr] : undefined;
      if (!recogniser || value === undefined) {
        row.caveatResolution = 'unresolved';
      } else if (value === true) {
        row.state = 'does_not_count';
        row.caveatResolution = 'applies';
        return row;
      } else {
        row.caveatResolution = 'does_not_apply';
      }
    }

    row.state = 'satisfied';
    row.counts = true;
    return row;
  });

  const qualifying = rows.filter((r) => r.counts);
  const auxiliaryQualifying = qualifying.filter((r) => r.auxiliary);

  return {
    rows,
    qualifying,
    auxiliaryQualifying,
    auxiliaryOnly: qualifying.length > 0 && auxiliaryQualifying.length === qualifying.length,
    inapplicable: rows.filter((r) => r.state === 'inapplicable'),
    disqualified: rows.filter((r) => r.state === 'does_not_count'),
    notOnRecord: rows.filter((r) => r.state === 'not_on_record'),
    warning: { cite: R.auxiliaryCite, note: R.auxiliaryNote, acts: R.auxiliaryActs },
    cite: R.intentFactorsAuthority,
    unresolvedMilestones: [...unresolvedMilestones],
  };
}

// ---- rules of construction ----------------------------------------------------------------------

export interface ConstructionRuleApplied {
  id: string;
  label: string;
  /** The pack's words, verbatim. */
  note: string;
  cite?: string;
  relevant: boolean;
  /** What in THIS record engages the rule — or why it is not in play. */
  relevance: string;
}

function applyConstructionRules(
  input: DomicileRun,
  dependency: DependencyDetermination,
  intent: IntentAnalysis,
  openQuestions: number,
): ConstructionRuleApplied[] {
  const R = domicileRules(input.packs.domicile);
  // What makes this record a "complex case" — stated as the things an officer actually has to
  // weigh, so the rule is never invoked as decoration.
  const complications: string[] = [];
  if (intent.disqualified.length > 0)
    complications.push(
      `${count(intent.disqualified.length, 'satisfied factor')} that a pack caveat takes back out`,
    );
  if (intent.inapplicable.length > 0)
    complications.push(`${count(intent.inapplicable.length, 'factor')} that cannot apply to this status`);
  if (intent.auxiliaryOnly)
    complications.push('every qualifying factor being an act the guidelines warn carries little weight');
  if (intent.unresolvedMilestones.length > 0)
    complications.push(`a milestone the timeline cannot date (${list(intent.unresolvedMilestones)})`);
  if (dependency.status === 'presumed_dependent')
    complications.push('an unrebutted dependency presumption');
  if (input.student.immigration.prior_statuses.length > 0)
    complications.push(`${count(input.student.immigration.prior_statuses.length, 'earlier immigration status')} on the record`);
  if (openQuestions > 0) complications.push(count(openQuestions, 'open question'));

  const institutionCount = input.student.institutions.length;
  const transferred =
    institutionCount > 1 || input.events.some((e) => e.type === 'transfer');

  return R.constructionRules.map((rule) => {
    // Dispatch on the pack's declared `kind`, never on its `id`.
    //
    // This switched on the id, which is the pack's own name for its own rule — so any jurisdiction
    // that happened to name a rule `favor_student_in_complex_cases` would have silently inherited
    // the reasoning written against SCHEV's wording of it, and any jurisdiction that named the same
    // rule differently would have lost that reasoning without either side saying so. `kind` is an
    // explicit opt-in: a pack asks for a reasoner by name, and a rule that asks for none is
    // surfaced verbatim rather than being fitted to the nearest one.
    switch (rule.kind) {
      case 'favor_student_in_complex_cases':
        return {
          ...rule,
          label: humanizeId(rule.id, R.jurisdictionCode),
          relevant: complications.length > 0,
          relevance: complications.length
            ? `This record is not a simple one: ${list(complications)}. Every reading above that could go either way has gone the student's way, and the officer is directed to do the same.`
            : 'Nothing in this record is ambiguous, so there is no reading to construe either way.',
        };
      case 'determinations_not_transferable':
        return {
          ...rule,
          label: humanizeId(rule.id, R.jurisdictionCode),
          relevant: transferred,
          relevance: transferred
            ? `The record spans ${count(institutionCount, 'institution')}. A domicile determination made by one of them — favourable or not — does not bind the next, so this analysis has to be made again wherever the student is claiming in-state status.`
            : 'Only one institution is on the record, so there is no earlier determination to carry over.',
        };
      case 'parental_status_alone_insufficient':
        return {
          ...rule,
          label: humanizeId(rule.id, R.jurisdictionCode),
          relevant: dependency.presumptionApplies,
          relevance: dependency.presumptionApplies
            ? dependency.exception
              ? `The age presumption applied and was rebutted by the ${lowerLabel(dependency.exception.label)} exception — so the student's own acts are what is weighed, and their parents' domicile is not by itself a reason to deny in-state status.`
              : "The student is presumed dependent, so the parents' domicile is the presumptive route — but it cannot be the sole ground for a denial."
            : 'The age presumption does not apply, so parental domicile is not the route being examined.',
        };
      default:
        // A rule with no reasoner — either it declares no `kind`, or a `kind` this engine has not
        // been taught. Either way it is still a rule the pack states, so it is surfaced in the
        // pack's own words with no relevance invented for it. Honest degradation: the rule is
        // visible, and PathWise does not pretend to have applied it to this record.
        return {
          ...rule,
          label: humanizeId(rule.id, R.jurisdictionCode),
          relevant: true,
          relevance: 'A rule of construction this jurisdiction applies to every determination.',
        };
    }
  });
}

// ---- the analysis -------------------------------------------------------------------------------

export interface DomicileAnalysis {
  /** The Finding every other screen and engine consumes. */
  finding: Finding;
  /** True when the eligible-alien gate fired and stopped the analysis. */
  gated: boolean;
  dependency?: DependencyDetermination;
  intent?: IntentAnalysis;
  clock?: DomicileClock;
  construction: ConstructionRuleApplied[];
  /** How the durational rule and its anchor are worded in the pack. */
  clockRule?: { startRuleNote: string; anchorDefinition: string; cite: string };
}

/**
 * Engine B, end to end.
 *
 * The gate runs first and, per the pack's own `stops_analysis`, ends the enquiry when it fires —
 * exactly as SCHEV Part II §03(A) prescribes. Everything after it is the analysis a student who
 * CAN establish domicile is owed.
 */
export function runDomicileAnalysis(input: DomicileRun): DomicileAnalysis {
  const v = domicileView(input.packs.domicile);
  const R = domicileRules(input.packs.domicile);

  // ---- §03(A) the gate. First, and final if it fires. ----
  const gated = checkEligibleAlienGate(input.student, v);
  if (gated) {
    return { finding: gated, gated: true, construction: [] };
  }

  const { student, allegedEntitlementDate } = input;
  const statusText = formatImmigrationStatus(student.immigration.status);
  const gatedList = list([...v.gateStatuses].map(formatImmigrationStatus));

  // ---- §09(C)(1) dependency, then §06(B) the factors, then §05(C)(1) the clock ----
  const dependency = determineDependency(input);
  const intent = analyseIntentFactors(input);
  // The clock is the pack's: how long, where it starts, and what it is measured to are all read
  // from the pack and dispatched, never assumed. A jurisdiction with no durational requirement has
  // no clock, and the analysis below reports that rather than inventing one of zero days.
  const clock = v.clock
    ? computeDomicileClock(v.clock, {
        qualifying: intent.qualifying.map((r) => ({ id: r.id, date: r.date! })),
        events: input.events,
        allegedEntitlementDate,
      })
    : undefined;

  // Seeded, not started empty. This is the same gap `runDomicileGate` declares, and the two entry
  // points have to agree: a pack with no status gate reaches HERE past a check that never ran, so
  // the full analysis would otherwise be the one reading that stays silent about it. Empty for every
  // gated pack, so Virginia's unknowns are untouched.
  const unknowns: Finding['unknowns'] = [...unmodelledStatusGateUnknowns(v)];

  if (dependency.status === 'presumed_dependent') {
    unknowns.push({
      what: `Does any of the ${R.dependencyExceptions.length} exceptions to the dependency presumption apply — ${list(
        R.dependencyExceptions.map((id) => lowerLabel(humanizeId(id, R.jurisdictionCode))),
      )}?`,
      why_it_matters: `Under ${R.dependencyAgeThreshold} the student is rebuttably presumed dependent, which means the domicile examined is the parents', not the student's own. One established exception moves the whole analysis onto the student's own acts.`,
      how_to_resolve:
        'Confirm which of the exceptions the record can evidence, and give the domicile officer the document for it.',
    });
  }

  if (intent.notOnRecord.length > 0) {
    const names = list(intent.notOnRecord.map((r) => `${lowerLabel(r.label)} (${r.weight})`));
    unknowns.push({
      what: `${count(intent.notOnRecord.length, 'intent factor')} the guidelines weigh ${isAre(
        intent.notOnRecord.length,
      )} not on the record: ${names}.`,
      why_it_matters: clock?.clockStart
        ? `A factor the officer cannot see is a factor that does not help — and because the clock starts at the LAST qualifying factor, one of these dated after ${formatDomicileDate(
            clock.clockStart,
          )} would move the earliest date of entitlement later, not earlier.`
        : 'Until at least one qualifying factor is established the clock has no start date at all.',
      how_to_resolve:
        'Collect the date and the document for each one, including any that are deliberately absent — an act that never happened is an answer too.',
    });
  }

  for (const row of intent.rows.filter((r) => r.caveatResolution === 'unresolved')) {
    unknowns.push({
      what: `Does the pack's caveat on ${lowerLabel(row.label)} apply — "${row.caveat}"?`,
      why_it_matters: `If it does, this factor stops counting${
        clock?.startFactor?.id === row.id ? ' and the clock start moves with it' : ''
      }. PathWise will not decide it either way on a record that does not say.`,
      how_to_resolve: 'Confirm the nature of the arrangement with the employer or the DSO and record it.',
    });
  }

  for (const milestone of intent.unresolvedMilestones) {
    const name = lowerLabel(humanizeId(milestone, R.jurisdictionCode));
    unknowns.push({
      what: `When did ${name} happen?`,
      why_it_matters: `The auxiliary-acts warning qualifies one of its acts against ${name}, so without that date PathWise cannot say whether the act carries little weight or full weight.`,
      how_to_resolve: `Add the ${name} date to the timeline.`,
    });
  }

  const construction = applyConstructionRules(input, dependency, intent, unknowns.length);
  const relevantRules = construction.filter((r) => r.relevant);

  // ---- the reasoning, in the guidelines' own order ----
  const steps: Finding['reasoning_steps'] = [];

  steps.push({
    claim: `The student holds ${statusText} status, which is not one of the statuses that close domicile in ${v.jurisdictionName} (${gatedList}). The gate does not fire, so the analysis continues — ${v.gateCite}.`,
    from_events: [],
    from_evidence: [],
  });

  steps.push({
    claim: dependency.presumptionApplies
      ? dependency.exception
        ? `At the date of alleged entitlement the student is ${dependency.ageAtEntitlement}, under the pack's threshold of ${dependency.thresholdAge}, so dependency is rebuttably presumed. It is rebutted: the "${lowerLabel(dependency.exception.label)}" exception is ${
            dependency.exception.derived ? 'established by the record itself' : 'asserted on the record'
          }. ${dependency.exception.basis} The student's own acts are therefore what the intent analysis reads — ${dependency.cite}.`
        : `At the date of alleged entitlement the student is ${dependency.ageAtEntitlement}, under the pack's threshold of ${dependency.thresholdAge}, so dependency is rebuttably presumed and none of the ${R.dependencyExceptions.length} exceptions is established on this record. Until one is, the domicile examined is the parents' — ${dependency.cite}.`
      : `At the date of alleged entitlement the student is ${dependency.ageAtEntitlement}, at or over the pack's threshold of ${dependency.thresholdAge}, so no dependency presumption applies and the student's own acts are what the intent analysis reads — ${dependency.cite}.`,
    from_events: dependency.exception?.eventIds ?? [],
    from_evidence: [],
  });

  const factorPhrase = (rows: IntentFactorRow[]): string =>
    list(rows.map((r) => `${lowerLabel(r.label)} (${r.weight})`));

  const factorParts: string[] = [];
  if (intent.qualifying.length)
    factorParts.push(
      `${intent.qualifying.length} ${isAre(intent.qualifying.length)} satisfied and count: ${factorPhrase(
        intent.qualifying,
      )}`,
    );
  if (intent.disqualified.length)
    factorParts.push(
      `${intent.disqualified.length} ${isAre(intent.disqualified.length)} satisfied but ${
        intent.disqualified.length === 1 ? 'does' : 'do'
      } not count: ${intent.disqualified.map((r) => `${lowerLabel(r.label)} — "${r.caveat}"`).join('; ')}`,
    );
  if (intent.inapplicable.length)
    factorParts.push(
      `${intent.inapplicable.length} cannot apply to this student: ${intent.inapplicable
        .map((r) => `${lowerLabel(r.label)} (${r.inapplicableWhen})`)
        .join('; ')}`,
    );
  if (intent.notOnRecord.length)
    factorParts.push(
      `${intent.notOnRecord.length} ${isAre(intent.notOnRecord.length)} not on the record: ${factorPhrase(
        intent.notOnRecord,
      )}`,
    );

  steps.push({
    // Semicolons, not the usual comma-and: each part carries its own comma-separated list of
    // factors inside it, and two levels of comma is unreadable.
    claim: `Of the ${R.intentFactors.length} intent factors the guidelines weigh, ${factorParts.join(
      '; ',
    )} — ${intent.cite}.`,
    from_events: intent.qualifying.flatMap((r) => r.eventIds),
    from_evidence: [],
  });

  if (intent.auxiliaryQualifying.length > 0) {
    steps.push({
      claim: `${intent.auxiliaryQualifying.length} of the qualifying factors ${isAre(
        intent.auxiliaryQualifying.length,
      )} named in the pack's auxiliary-acts warning — ${factorPhrase(
        intent.auxiliaryQualifying,
      )}. "${intent.warning.note}" ${
        intent.auxiliaryOnly
          ? 'Every factor now counting is one of them, which is the weakest form this case can take.'
          : 'They support the case; they do not carry it.'
      } — ${intent.warning.cite}.`,
      from_events: [],
      from_evidence: [],
    });
  }

  if (clock && clock.startFactor && clock.clockStart) {
    const earliest = intent.qualifying
      .slice()
      .sort((a, b) => toOrdinal(a.date!) - toOrdinal(b.date!))[0];
    const startRow = intent.rows.find((r) => r.id === clock.startFactor!.id)!;
    steps.push({
      claim: `The last qualifying factor is ${lowerLabel(startRow.label)} on ${formatDomicileDate(
        clock.clockStart,
      )}, and the clock starts there. ${v.clockStartRuleNote}${
        earliest && earliest.id !== startRow.id
          ? ` Counting from the earliest factor instead (${lowerLabel(earliest.label)}, ${formatDomicileDate(
              earliest.date!,
            )}) is the mistake this rule exists to prevent.`
          : ''
      }${
        startRow.auxiliary
          ? ` Note what starts it: an act the warning names as carrying little weight, so the date the whole clock turns on is the weakest kind of act on this record.`
          : ''
      } — ${v.clockCite}.`,
      from_events: startRow.eventIds,
      from_evidence: [],
    });

    steps.push({
      claim: `${clock.durationDays} days from ${formatDomicileDate(clock.clockStart)} is ${formatDomicileDate(
        clock.earliestEntitlement!,
      )} — the earliest date of alleged entitlement that satisfies the duration requirement. The date claimed here is ${formatDomicileDate(
        clock.allegedEntitlementDate,
      )} (${v.clockAnchorDefinition.toLowerCase().replace(/\.$/, '')}), which ${
        clock.meetsDuration
          ? 'is on or after it, so the duration requirement is met on the record as it stands.'
          : `falls ${count(clock.daysShort, 'day')} short.`
      }`,
      from_events: [],
      from_evidence: [],
    });
  } else if (clock) {
    steps.push({
      claim: `No factor on this record both applies and counts, so the ${clock.durationDays}-day clock has no start date yet. ${v.clockStartRuleNote} — ${v.clockCite}.`,
      from_events: [],
      from_evidence: [],
    });
  } else {
    // No clock at all — a different statement from a clock that has not started, and one that must
    // not be told with a duration in it.
    steps.push({
      claim: `${v.jurisdictionName} states no durational period in the rules PathWise has modelled, so there is no waiting clock to run against this record.`,
      from_events: [],
      from_evidence: [],
    });
  }

  for (const rule of relevantRules) {
    steps.push({
      claim: `${rule.note} ${rule.relevance}${rule.cite ? ` — ${rule.cite}` : ''}`,
      from_events: [],
      from_evidence: [],
    });
  }

  // A jurisdiction with no durational rule cannot be "short of" one, so its verdict rests on the
  // factors and the officer rather than on a countdown — `review_recommended`, never `potential_risk`
  // for a duration it does not impose.
  const result: Finding['result'] = !clock
    ? 'review_recommended'
    : !clock.clockStart
      ? 'unable_to_verify'
      : clock.meetsDuration
        ? 'review_recommended'
        : 'potential_risk';

  const headline = !clock
    ? `No durational requirement to satisfy in ${v.jurisdictionName} — the officer decides on the record`
    : !clock.clockStart
      ? 'No qualifying intent factors on record'
      : clock.meetsDuration
        ? `${clock.durationDays} days of domicile appear satisfied for ${formatDomicileDate(clock.allegedEntitlementDate)}`
        : `Domicile clock started ${formatDomicileDate(clock.clockStart)} — the earliest in-state term begins ${formatDomicileDate(
            clock.earliestEntitlement!,
          )}`;

  const finding: Finding = {
    rule_id: `${v.packId}:analysis`,
    domain: 'residency',
    result,
    headline,
    reasoning_steps: steps,
    rule_citation: {
      text: clock ? v.clockStartRuleNote : v.gateExplain,
      authority: v.authority(v.gateCite, dependency.cite, intent.cite, v.clockCite),
      source_url: v.sourceUrl,
      verified_on: v.verifiedOn,
    },
    unknowns,
    deciding_office: v.office,
    volatility: v.volatility,
  };

  return {
    finding,
    gated: false,
    dependency,
    intent,
    clock,
    construction,
    clockRule: {
      startRuleNote: v.clockStartRuleNote,
      anchorDefinition: v.clockAnchorDefinition,
      cite: v.clockCite,
    },
  };
}

export const _internals = { ageOn, stem, stems, evaluateStatusClause, matchAuxiliaryAct, milestoneDate };
