// domicile-clock.ts — the durational clock, dispatched on the rules the PACK names.
//
// Two fields in every domicile pack described this and neither one did anything:
// `clock.anchor` and `clock.start_rule` were written down, rendered nowhere, read by nothing, while
// the behaviour they describe sat hardcoded in the engine as Virginia's. `coverage.json` already
// recorded that Texas and Maryland anchor to a census date, California to a residency determination
// date, and Tennessee has no durational component at all — so a pack for any of them would have
// been given VIRGINIA'S ARITHMETIC under its own heading. That is the same failure the jurisdiction
// seam was built to prevent, one layer deeper and harder to see, because the citation would have
// been right and only the number wrong.
//
// So the two fields select a strategy here, and an unrecognised value has no strategy to select.
// It does NOT fall back:
//
//   "an unknown clock strategy must fail validation rather than silently use Virginia logic"
//
// The pack parser rejects a value outside the closed set before this file is ever reached, and the
// lookups below throw if one gets through anyway. Two locks on the same door, because the failure
// they prevent is a wrong number presented with a correct citation, which a reader cannot catch.

import type { Event, ISODate } from '../types';
import type { Clock, ClockAnchor, ClockStartRule } from '../rulepacks/schema';

// ---------------------------------------------------------------------------------------------
// Shared domicile vocabulary. It lives here rather than in domicile-gate.ts because this module is
// the one the gate depends on; the other direction would be an import cycle.
// ---------------------------------------------------------------------------------------------

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

/** Days since the epoch. Every domicile screen does date maths through these two. */
export function toOrdinal(iso: string): number {
  return Math.floor(Date.parse(iso + 'T00:00:00Z') / 86_400_000);
}

export function addDays(iso: string, n: number): ISODate {
  const d = new Date(Date.parse(iso + 'T00:00:00Z') + n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export class ClockStrategyError extends Error {
  constructor(kind: string, value: string, known: readonly string[]) {
    super(
      `Unknown ${kind} "${value}". Known: [${known.join(', ')}]. A jurisdiction whose clock ` +
        `PathWise cannot compute must be declared at a capability level below "modelled" — never ` +
        `run under another jurisdiction's arithmetic.`,
    );
    this.name = 'ClockStrategyError';
  }
}

/** What a start-rule strategy is given to work from. */
export interface ClockContext {
  /** The intent factors this record establishes, with their dates. */
  qualifying: IntentFactorFact[];
  /** The student's timeline, for rules that count from an event rather than a factor. */
  events: Event[];
  /** The date the caller is claiming residency for, before the anchor has had its say. */
  allegedEntitlementDate: ISODate;
}

/** The earliest date of the events whose type names the given milestone. */
function firstEventDate(events: Event[], types: readonly string[]): ISODate | undefined {
  return events
    .filter((e) => types.includes(e.type))
    .map((e) => e.date)
    .sort((a, b) => toOrdinal(a) - toOrdinal(b))[0];
}

// ---------------------------------------------------------------------------------------------
// Start rules — WHERE the clock begins counting.
// ---------------------------------------------------------------------------------------------

const CLOCK_START: Record<ClockStartRule, (ctx: ClockContext) => IntentFactorFact | undefined> = {
  /**
   * Virginia. The clock starts at the LAST qualifying factor, not the first — the rule exists
   * precisely because counting from arrival is the mistake every student makes. Behaviour is
   * byte-identical to what `computeDomicileClock` did before this file existed.
   */
  date_of_last_qualifying_intent_factor: ({ qualifying }) =>
    qualifying.length === 0
      ? undefined
      : qualifying.slice().sort((a, b) => toOrdinal(a.date) - toOrdinal(b.date)).at(-1),

  /**
   * States that count continuous physical presence rather than weighing intent acts: the clock
   * starts at the EARLIEST qualifying factor and runs from there, so the ordering is the opposite
   * of Virginia's and cannot be expressed by reusing it.
   */
  start_of_continuous_presence: ({ qualifying }) =>
    qualifying.length === 0
      ? undefined
      : qualifying.slice().sort((a, b) => toOrdinal(a.date) - toOrdinal(b.date))[0],

  /**
   * States that count from admission. The date comes off the timeline rather than the factor list,
   * so it is returned as a synthetic factor naming the event it was read from — a screen showing
   * "the clock started here" must be able to show WHY.
   */
  date_of_admission: ({ events }) => {
    const date = firstEventDate(events, ['admission_accepted', 'enrollment', 'program_start']);
    return date
      ? { id: 'date_of_admission', date, event_ids: events.filter((e) => e.date === date).map((e) => e.id) }
      : undefined;
  },
};

export function clockStartFor(rule: ClockStartRule): (ctx: ClockContext) => IntentFactorFact | undefined {
  const fn = CLOCK_START[rule];
  if (!fn) throw new ClockStrategyError('clock start_rule', rule, Object.keys(CLOCK_START));
  return fn;
}

// ---------------------------------------------------------------------------------------------
// Anchors — the date the clock is measured UP TO.
// ---------------------------------------------------------------------------------------------

const CLOCK_ANCHOR: Record<ClockAnchor, (ctx: ClockContext) => ISODate | undefined> = {
  /**
   * Virginia. The date of alleged entitlement is a property of the CLAIM, not of the timeline —
   * which term is being claimed for — so it arrives with the caller and is used as given.
   */
  date_of_alleged_entitlement: ({ allegedEntitlementDate }) => allegedEntitlementDate,

  /**
   * The term's census / add-drop date. PathWise does not hold an academic calendar, so this is only
   * resolvable when the record carries the event. Returning undefined is the honest answer and the
   * caller reports it as an open question — it must not silently become the alleged date, because
   * the two can be weeks apart and the difference is the whole point of the rule.
   */
  census_date: ({ events }) => firstEventDate(events, ['census_date', 'add_drop_deadline']),

  /** States that measure to admission rather than to the start of the term. */
  admission_date: ({ events }) => firstEventDate(events, ['admission_accepted', 'enrollment']),
};

export function clockAnchorFor(anchor: ClockAnchor): (ctx: ClockContext) => ISODate | undefined {
  const fn = CLOCK_ANCHOR[anchor];
  if (!fn) throw new ClockStrategyError('clock anchor', anchor, Object.keys(CLOCK_ANCHOR));
  return fn;
}

// ---------------------------------------------------------------------------------------------
// The clock itself
// ---------------------------------------------------------------------------------------------

export interface DomicileClock {
  /** The factor whose date starts the clock, per this pack's own start rule. */
  startFactor?: IntentFactorFact;
  clockStart?: ISODate;
  durationDays: number;
  /** The earliest anchor date that satisfies the duration requirement. */
  earliestEntitlement?: ISODate;
  /** The anchor date actually used, after the pack's anchor rule resolved it. */
  allegedEntitlementDate: ISODate;
  meetsDuration: boolean;
  /** How many days short the anchor date falls. 0 once the requirement is met. */
  daysShort: number;
  /**
   * Set when the pack's anchor could not be resolved from this record. The duration answer is then
   * reported against the date the caller supplied and this says so, rather than the screen implying
   * the jurisdiction's own anchor was used.
   */
  unresolvedAnchor?: ClockAnchor;
}

/**
 * Run one pack's durational clock over one record.
 *
 * Every rule applied here is the pack's: how long, where the count starts, and what it is measured
 * to. Nothing about Virginia survives in this function — it is reached through the same two lookups
 * for every jurisdiction, and a jurisdiction whose rules are not in those tables cannot reach it.
 */
export function computeDomicileClock(clock: Clock, ctx: ClockContext): DomicileClock {
  const startFactor = clockStartFor(clock.start_rule)(ctx);
  const resolvedAnchor = clockAnchorFor(clock.anchor)(ctx);

  // The anchor is the pack's rule; the caller's date is the fallback when the record cannot supply
  // it. Which one was used is reported either way.
  const anchorDate = resolvedAnchor ?? ctx.allegedEntitlementDate;
  const unresolvedAnchor = resolvedAnchor === undefined ? clock.anchor : undefined;

  const base = {
    durationDays: clock.duration_days,
    allegedEntitlementDate: anchorDate,
    unresolvedAnchor,
  };

  if (!startFactor) {
    return { ...base, meetsDuration: false, daysShort: clock.duration_days };
  }

  const clockStart = startFactor.date;
  const daysHeld = toOrdinal(anchorDate) - toOrdinal(clockStart);

  return {
    ...base,
    startFactor,
    clockStart,
    earliestEntitlement: addDays(clockStart, clock.duration_days),
    meetsDuration: daysHeld >= clock.duration_days,
    daysShort: Math.max(0, clock.duration_days - daysHeld),
  };
}
