// cpt-ledger.ts — Engine A core: CPT ledger with overlap aggregation.
// Highest technical difficulty in the product; this is our build-quality proof.
//
// Rules encoded (see rulepacks/f1-practical-training.json and docs/02-research-citations.md):
//   - Full-time CPT = more than 20 authorized hours/week on a given day.
//   - Overlap aggregation: concurrent part-time authorizations sum; a day whose summed
//     authorized hours exceed 20 counts as a FULL-TIME CPT day.
//   - 365-day cliff: 365+ full-time CPT days at a level removes OPT eligibility at that level.
//   - Level partition: the cap is per education level; days are counted per level, never summed
//     across levels.
//   - Counting basis is AUTHORIZED periods, not hours actually worked.
//   - Every number below is read from the rulepack; none are literal-coded here.

import type { Event, ProgramLevel } from '../types';
import pack from '../rulepacks/f1-practical-training.json';

const cpt = pack.cpt;

// Both exported so the UI reads the same pack values the ledger is computed from — LedgerBar's
// cliff marker off CLIFF_DAYS, JourneyTimeline's full-time/part-time call off the threshold.
// A marker or a label that can drift from the rule is one that will.
export const FULL_TIME_HOURS_THRESHOLD = cpt.full_time_threshold_hours_per_week; // strictly greater => full-time
export const CLIFF_DAYS = cpt.cliff_days;
const AMBER_MARGIN_DAYS = cpt.amber_margin_days; // display band, not regulatory

// The pack's own citation strings, so a screen that prints the authority prints the pack's text
// rather than a retyped copy of it. CLIFF_CITE is the cliff subsection itself; SECTION_CITE is the
// practical-training paragraph that the cap and its per-level partition both sit in.
export const CLIFF_CITE = cpt.cliff_cite;
export const SECTION_CITE = cpt.level_partition.cite;

export type LedgerBand = 'green' | 'amber' | 'red';

// How PathWise's own education levels are written for a reader. Display only — no rule turns on it,
// which is why it lives with the type it describes rather than in a rulepack.
const LEVEL_LABEL: Record<ProgramLevel, string> = {
  bachelors: "bachelor's",
  masters: "master's",
  doctoral: 'doctoral',
  other: 'other-level',
};

export function levelLabel(level: ProgramLevel): string {
  return LEVEL_LABEL[level];
}

export interface LevelLedger {
  level: ProgramLevel;
  fullTimeDays: number;      // distinct days that count as full-time CPT at this level
  overlapDays: number;       // subset of fullTimeDays created purely by part-time aggregation
  // How many part-time authorizations actually combined to produce those overlap days — the most
  // that were concurrently active on any single overlap day. 0 when there are no overlap days, and
  // never 1: a day needs two active authorizations before aggregation can create it. The screens
  // print this rather than the demo student's own number, which is only ever right for her.
  overlapConcurrentAuths: number;
  // Other education levels in the SAME record that carry full-time days of their own — the days the
  // per-level partition keeps out of this count. Empty when there are none, so a screen can only
  // claim a partition that actually happened.
  otherLevelsWithDays: ProgramLevel[];
  daysToCliff: number;       // CLIFF_DAYS - fullTimeDays (may be negative once crossed)
  band: LedgerBand;
  optEligible: boolean;      // false once the cliff is reached
}

export interface LedgerResult {
  byLevel: LevelLedger[];
  // Convenience accessor for the level currently being pursued.
  forLevel(level: ProgramLevel): LevelLedger | undefined;
}

interface DayHours {
  total: number;   // summed authorized hours across all active auths that day
  distinctAuths: number;
}

function toOrdinal(iso: string): number {
  // days since epoch; robust for date-only ISO strings
  return Math.floor(Date.parse(iso + 'T00:00:00Z') / 86_400_000);
}

function bandFor(daysToCliff: number): LedgerBand {
  if (daysToCliff <= 0) return 'red';
  if (daysToCliff <= AMBER_MARGIN_DAYS) return 'amber';
  return 'green';
}

/**
 * Compute the CPT ledger from a student's events, partitioned by education level.
 * Only `cpt_auth` events are considered. Each must carry:
 *   attrs.hours_per_week: number
 *   program_level: ProgramLevel
 *   date + end_date (the authorized period, inclusive)
 */
export function computeCptLedger(events: Event[]): LedgerResult {
  const cptAuths = events.filter(
    (e) => e.type === 'cpt_auth' && e.end_date && typeof e.attrs?.hours_per_week === 'number'
  );

  const levels = new Set<ProgramLevel>();
  for (const e of cptAuths) if (e.program_level) levels.add(e.program_level);

  const byLevel: LevelLedger[] = [];

  for (const level of levels) {
    const auths = cptAuths.filter((e) => e.program_level === level);

    // Build a per-day map of summed authorized hours for this level only.
    const dayMap = new Map<number, DayHours>();
    for (const a of auths) {
      const hpw = a.attrs.hours_per_week as number;
      const start = toOrdinal(a.date);
      const end = toOrdinal(a.end_date as string);
      for (let d = start; d <= end; d++) {
        const cur = dayMap.get(d) ?? { total: 0, distinctAuths: 0 };
        cur.total += hpw;
        cur.distinctAuths += 1;
        dayMap.set(d, cur);
      }
    }

    // Pass 1: count full-time days (a day whose summed authorized hours exceed the threshold).
    let fullTimeDays = 0;
    for (const { total } of dayMap.values()) {
      if (total > FULL_TIME_HOURS_THRESHOLD) fullTimeDays++;
    }

    // Pass 2: an "overlap day" is a full-time day created PURELY by aggregation — summed hours
    // exceed the threshold but no single active authorization was itself full-time.
    let overlapDays = 0;
    let overlapConcurrentAuths = 0;
    for (const [d, { total }] of dayMap.entries()) {
      if (total <= FULL_TIME_HOURS_THRESHOLD) continue;
      const activeHere = auths.filter((a) => {
        const s = toOrdinal(a.date);
        const e = toOrdinal(a.end_date as string);
        return d >= s && d <= e;
      });
      const anySingleFullTime = activeHere.some((a) => (a.attrs.hours_per_week as number) > FULL_TIME_HOURS_THRESHOLD);
      if (!anySingleFullTime) {
        overlapDays++;
        overlapConcurrentAuths = Math.max(overlapConcurrentAuths, activeHere.length);
      }
    }

    const daysToCliff = CLIFF_DAYS - fullTimeDays;
    byLevel.push({
      level,
      fullTimeDays,
      overlapDays,
      overlapConcurrentAuths,
      otherLevelsWithDays: [], // filled once every level is counted, below
      daysToCliff,
      band: bandFor(daysToCliff),
      optEligible: fullTimeDays < CLIFF_DAYS,
    });
  }

  // The partition is only visible from outside a single level: each line records which OTHER levels
  // in this record have full-time days the cap is keeping separate from its own.
  for (const line of byLevel) {
    line.otherLevelsWithDays = byLevel
      .filter((other) => other.level !== line.level && other.fullTimeDays > 0)
      .map((other) => other.level);
  }

  return {
    byLevel,
    forLevel(level: ProgramLevel) {
      return byLevel.find((l) => l.level === level);
    },
  };
}

export const _internals = { FULL_TIME_HOURS_THRESHOLD, CLIFF_DAYS, AMBER_MARGIN_DAYS, toOrdinal };
