// unemployment-clock.ts — Engine A part 4: the F-1 post-completion OPT unemployment clock.
//
// SEVIS auto-terminates an F-1 record once cumulative unemployment during OPT exceeds the cap.
// There is no grace period and no reinstatement — crossing the cap ends lawful status. A student
// cannot see this number anywhere; this engine computes it live.
//
// Rules encoded (see rulepacks/f1-practical-training.json -> unemployment_clock):
//   - 90 days of unemployment allowed on initial post-completion OPT.
//   - STEM extension adds 60 -> 150 total, BUT only once qualifying employment is reported;
//     with no employment reported the cap is 90 (auto_terminate_no_report_days).
//   - Days are CUMULATIVE, not consecutive — every gap counts, not just the longest.
//   - A future-dated job does NOT stop the clock (it hasn't started yet).
//   - A job under 20 hours/week does NOT stop the clock.
//   - Time abroad still counts as unemployment.
//   - Every regulatory number below is read from the rulepack; none are literal-coded here.

import type { ISODate } from '../types';
import pack from '../rulepacks/f1-practical-training.json';

const uc = pack.unemployment_clock;

// Display-only band margins (not regulatory). Same convention as AMBER_MARGIN_DAYS in cpt-ledger.
const RED_MARGIN_DAYS = 15;   // 15 or fewer days remaining => red
const AMBER_MARGIN_DAYS = 30; // 30 or fewer days remaining => amber

export type ClockBand = 'green' | 'amber' | 'red';

export interface EmploymentPeriod {
  start: ISODate;
  end?: ISODate;          // open (ongoing) when omitted
  hoursPerWeek: number;
}

export interface UnemploymentClockInput {
  optStartDate: ISODate;
  stem?: boolean;
  employment: EmploymentPeriod[];
  asOf: ISODate;
}

export interface UnemploymentClockResult {
  daysUsed: number;                         // cumulative unemployment days, optStart..asOf
  cap: number;                              // 90 or 150
  daysRemaining: number;                    // cap - daysUsed (may be negative once over)
  band: ClockBand;
  isPaused: boolean;                        // a qualifying job is active as of asOf
  stemApplies: boolean;                     // stem flag AND qualifying employment on record
  projectedTerminationDate: ISODate | null; // day the record falls out of status if gap continues
}

function toOrdinal(iso: ISODate): number {
  // days since epoch; robust for date-only ISO strings
  return Math.floor(Date.parse(iso + 'T00:00:00Z') / 86_400_000);
}

function fromOrdinal(ord: number): ISODate {
  return new Date(ord * 86_400_000).toISOString().slice(0, 10);
}

function bandFor(daysRemaining: number, overCap: boolean): ClockBand {
  if (overCap || daysRemaining <= RED_MARGIN_DAYS) return 'red';
  if (daysRemaining <= AMBER_MARGIN_DAYS) return 'amber';
  return 'green';
}

/**
 * Compute the live OPT unemployment clock.
 *
 * A period only PAUSES the clock when it qualifies: hours/week >= the rulepack threshold AND it
 * has actually started by asOf. A future-dated job does not pause it; a sub-threshold job never
 * pauses it. Days are counted cumulatively across the whole window, so every uncovered day counts.
 */
export function computeUnemploymentClock(input: UnemploymentClockInput): UnemploymentClockResult {
  const startOrd = toOrdinal(input.optStartDate);
  const asOfOrd = toOrdinal(input.asOf);

  // A qualifying period: full-enough hours AND already started by asOf (future starts don't count).
  const qualifying = input.employment.filter(
    (p) => p.hoursPerWeek >= uc.qualifying_min_hours_per_week && toOrdinal(p.start) <= asOfOrd
  );

  // Mark every day in [optStart .. asOf] covered by a qualifying period; the rest are unemployment.
  const totalDays = Math.max(0, asOfOrd - startOrd + 1);
  const covered = new Set<number>();
  for (const p of qualifying) {
    const s = Math.max(startOrd, toOrdinal(p.start));
    const e = Math.min(asOfOrd, p.end ? toOrdinal(p.end) : asOfOrd); // open period runs to asOf
    for (let d = s; d <= e; d++) covered.add(d);
  }
  const daysUsed = totalDays - covered.size;

  const hasQualifying = qualifying.length > 0;
  const stemApplies = !!input.stem && hasQualifying;
  const cap = stemApplies ? uc.stem_total_days : uc.opt_days_allowed;

  const daysRemaining = cap - daysUsed;
  const overCap = daysUsed > cap;

  // Paused when a qualifying period is active on asOf itself (covers today's date).
  const isPaused = covered.has(asOfOrd);

  // If the gap continues from asOf, day `cap` is the last legal day and `cap+1` is termination.
  const projectedTerminationDate = isPaused ? null : fromOrdinal(asOfOrd + daysRemaining + 1);

  return {
    daysUsed,
    cap,
    daysRemaining,
    band: bandFor(daysRemaining, overCap),
    isPaused,
    stemApplies,
    projectedTerminationDate,
  };
}

export const _internals = { RED_MARGIN_DAYS, AMBER_MARGIN_DAYS, toOrdinal, fromOrdinal, bandFor };
