// opt-budget.ts — Engine A part 3: the 12-months-per-level OPT budget.
//
// Every F-1 student gets 12 months of practical training per education level. The trap is that
// pre-completion OPT spends out of that same 12 — so a student who worked part-time during the
// degree arrives at graduation with less than 12 months of post-completion OPT left, and nobody
// tells them until the DSO shortens the recommendation on the I-20.
//
// Rules encoded (see rulepacks/f1-practical-training.json -> opt):
//   - budget_months_per_level: 12 months, PER EDUCATION LEVEL. A master's starts a fresh budget;
//     bachelor's-level OPT never spends master's-level months.
//   - pre_completion_counts_against_budget: pre-completion OPT is drawn from the same 12 months.
//   - part_time_pre_completion_half_rate: part-time (<= 20 hrs/week) pre-completion OPT is deducted
//     at HALF rate — two authorized months spend one month of budget.
//   - counting_basis = authorized_periods: usage is computed on the AUTHORIZED date range, never on
//     hours actually worked. Overtime spends no extra budget; an unemployed week refunds nothing.
//   - Every regulatory number below is read from the rulepack; none are literal-coded here.

import type { ISODate, ProgramLevel } from '../types';
import pack from '../rulepacks/f1-practical-training.json';

const opt = pack.opt;

// Display-only band margin (not regulatory). Same convention as the CPT ledger and the clock.
// Exported because the budget bar draws the amber ZONE from it: a zone drawn from its own number
// would sooner or later start at a different month than the band it is meant to explain.
export const AMBER_MARGIN_MONTHS = 2; // 2 or fewer months left => amber

// What "half rate" means as a multiplier. The pack states THAT part-time pre-completion OPT is
// deducted at half rate (part_time_pre_completion_half_rate); this is the one place that becomes a
// number, and the UI reads it from here to decide which lines to explain as half-rate.
export const PART_TIME_HALF_RATE = 0.5;

export type OptBudgetBand = 'green' | 'amber' | 'red';

export type OptIntensity = 'full_time' | 'part_time';
export type OptPhase = 'pre_completion' | 'post_completion';

export interface OptAuthorization {
  id?: string;
  start: ISODate;
  end: ISODate;               // inclusive last authorized day
  intensity: OptIntensity;
  // Optional. Post-completion OPT cannot be part-time (it requires 20+ hrs/week), so a part-time
  // authorization is treated as pre-completion unless stated otherwise.
  phase?: OptPhase;
  // Optional. Defaults to the level being asked about, so a single-level caller can omit it.
  level?: ProgramLevel;
  employer?: string;
}

export interface OptBudgetInput {
  level: ProgramLevel;                  // the education level being asked about
  authorizations: OptAuthorization[];
}

// One authorized period, and what it cost the budget.
export interface OptUsageLine {
  id?: string;
  start: ISODate;
  end: ISODate;
  intensity: OptIntensity;
  phase: OptPhase;
  employer?: string;
  authorizedMonths: number;   // length of the authorized period itself
  rate: number;               // 1 = full rate, 0.5 = part-time pre-completion half rate
  chargedMonths: number;      // authorizedMonths * rate — what actually left the budget
}

export interface LevelOptBudget {
  level: ProgramLevel;
  budgetMonths: number;       // 12, from the rulepack
  monthsUsed: number;         // sum of chargedMonths at this level
  monthsRemaining: number;    // budgetMonths - monthsUsed (never below 0 for display; see overBy)
  overByMonths: number;       // months spent beyond the cap, 0 when inside it
  band: OptBudgetBand;
  lines: OptUsageLine[];
}

export interface OptBudgetResult {
  byLevel: LevelOptBudget[];
  forLevel(level: ProgramLevel): LevelOptBudget | undefined;
}

// ---- date arithmetic on whole calendar months -------------------------------------------------

function parse(iso: ISODate): Date {
  return new Date(iso + 'T00:00:00Z');
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

// Add n calendar months, clamping the day (Jan 31 + 1 month = Feb 28/29).
function addMonths(d: Date, n: number): Date {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const clamped = Math.min(d.getUTCDate(), daysInMonth(target.getUTCFullYear(), target.getUTCMonth()));
  target.setUTCDate(clamped);
  return target;
}

/**
 * Length of an inclusive authorized period, in calendar months.
 *
 * Whole months are counted by calendar (Jun 1 – Aug 31 is exactly 3 months, not 92/30.4), and any
 * remainder is a fraction of the month it falls in. This is how a DSO reads an EAD: a period is
 * "six months" because the dates say six months, not because of a day count.
 */
export function monthsInPeriod(start: ISODate, endInclusive: ISODate): number {
  const s = parse(start);
  const e = new Date(parse(endInclusive).getTime() + 86_400_000); // exclusive end = last day + 1

  if (e.getTime() <= s.getTime()) return 0;

  let whole = 0;
  while (addMonths(s, whole + 1).getTime() <= e.getTime()) whole++;

  const anchor = addMonths(s, whole);
  if (anchor.getTime() >= e.getTime()) return whole;

  const next = addMonths(s, whole + 1);
  return whole + (e.getTime() - anchor.getTime()) / (next.getTime() - anchor.getTime());
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function bandFor(monthsRemaining: number): OptBudgetBand {
  if (monthsRemaining <= 0) return 'red';                    // at or over the cap
  if (monthsRemaining <= AMBER_MARGIN_MONTHS) return 'amber';
  return 'green';
}

// Post-completion OPT requires 20+ hrs/week, so part-time can only be pre-completion.
function phaseOf(a: OptAuthorization): OptPhase {
  return a.phase ?? (a.intensity === 'part_time' ? 'pre_completion' : 'post_completion');
}

/**
 * What one authorized period costs the budget.
 *   - full rate for everything, EXCEPT
 *   - part-time pre-completion, which the rulepack deducts at half rate, AND
 *   - pre-completion entirely, if a rulepack ever stops charging it to the budget.
 */
function rateFor(phase: OptPhase, intensity: OptIntensity): number {
  if (phase === 'pre_completion') {
    if (!opt.pre_completion_counts_against_budget) return 0;
    if (intensity === 'part_time' && opt.part_time_pre_completion_half_rate) return PART_TIME_HALF_RATE;
  }
  return 1;
}

/**
 * Compute the OPT budget, partitioned by education level.
 *
 * The level named in the input is always present in the result — a student with no OPT on record
 * still has a budget, and seeing "12 of 12 remaining" is the point.
 */
export function computeOptBudget(input: OptBudgetInput): OptBudgetResult {
  const budgetMonths = opt.budget_months_per_level;

  const levels = new Set<ProgramLevel>([input.level]);
  for (const a of input.authorizations) levels.add(a.level ?? input.level);

  const byLevel: LevelOptBudget[] = [];

  for (const level of levels) {
    const auths = input.authorizations.filter((a) => (a.level ?? input.level) === level);

    const lines: OptUsageLine[] = auths.map((a) => {
      const phase = phaseOf(a);
      const rate = rateFor(phase, a.intensity);
      // Counting basis is the authorized range — hours actually worked never enter this number.
      const authorizedMonths = monthsInPeriod(a.start, a.end);
      return {
        id: a.id,
        start: a.start,
        end: a.end,
        intensity: a.intensity,
        phase,
        employer: a.employer,
        authorizedMonths: round2(authorizedMonths),
        rate,
        chargedMonths: round2(authorizedMonths * rate),
      };
    });

    const monthsUsed = round2(lines.reduce((sum, l) => sum + l.chargedMonths, 0));
    const remaining = round2(budgetMonths - monthsUsed);

    byLevel.push({
      level,
      budgetMonths,
      monthsUsed,
      monthsRemaining: Math.max(0, remaining),
      overByMonths: remaining < 0 ? round2(-remaining) : 0,
      band: bandFor(remaining),
      lines,
    });
  }

  return {
    byLevel,
    forLevel(level: ProgramLevel) {
      return byLevel.find((l) => l.level === level);
    },
  };
}

// Rulepack-derived facts the UI needs to explain itself, so no component reads the JSON directly.
export const OPT_BUDGET_RULES = {
  budgetMonths: opt.budget_months_per_level,
  partTimeThresholdHours: opt.part_time_threshold_hours_per_week,
  halfRate: opt.part_time_pre_completion_half_rate,
  preCompletionCounts: opt.pre_completion_counts_against_budget,
  countingBasis: opt.counting_basis,
  countingNote: opt.counting_note,
  levelPartition: opt.level_partition.rule,
  cite: opt.budget_cite,
  authority: opt.budget_authority,
} as const;

export const _internals = { AMBER_MARGIN_MONTHS, PART_TIME_HALF_RATE, addMonths, daysInMonth, monthsInPeriod, rateFor, bandFor };
