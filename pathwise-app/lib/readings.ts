// readings.ts — the two readings of one CPT record, derived once.
//
// This is NOT an engine and it states no rule. It runs `computeCptLedger` twice over the same
// authorizations, changing only which education level School X's CPT is attributed to, and reports
// what comes back. Every number below is the ledger's; the only thing this file contributes is
// asking the question twice.
//
// It exists because two screens now need the same answer. /student/changed is built around the
// disagreement, and the landing hero shows it as the one finding PathWise will not make. Computed
// separately in two places, those could drift — and the specific way they would drift is the worst
// available: a landing page claiming a refusal the app no longer makes, or making one it does not.
// One derivation, two readers.
//
// The scenario is a real ambiguity in Priya's own record, not an invented one: her 210 full-time
// CPT days at School X only stay OUT of her master's count if the level change between the two
// schools is established. The document that records it is missing.

import { computeCptLedger, CLIFF_DAYS, type LevelLedger } from "./engines/cpt-ledger";
import { priyaEvents } from "./fixtures/priya";
import type { Event } from "./types";

export interface CptReadings {
  /** The record as written: School X's days sit at the bachelor's level and stay out of the count. */
  settled: LevelLedger;
  /** The level change unproven: those days cannot be partitioned out of the level under review. */
  pooled: LevelLedger;
  /** The bachelor's-level days the partition is keeping out, when the level change holds. */
  bachelors: LevelLedger;
  /**
   * Whether the two readings disagree about the outcome that actually matters.
   *
   * This is what makes the finding honestly indeterminate, and it is DERIVED — if a future record
   * put both readings on the same side of the cliff there would be nothing to refuse, and the UI
   * would say so without anyone editing it.
   */
  disagree: boolean;
  /** The federal cliff, from the pack. Re-exported so a caller needs one import, not two. */
  cliff: number;
}

/** Reading B's inputs: same events, same periods, only the level attribution pooled. */
const pooledEvents: Event[] = priyaEvents.map((e) =>
  e.type === "cpt_auth" ? { ...e, program_level: "masters" as const } : e,
);

export function cptLevelChangeReadings(): CptReadings {
  const settledLedger = computeCptLedger(priyaEvents);
  const settled = settledLedger.forLevel("masters")!;
  const bachelors = settledLedger.forLevel("bachelors")!;
  const pooled = computeCptLedger(pooledEvents).forLevel("masters")!;

  return {
    settled,
    pooled,
    bachelors,
    disagree: settled.optEligible !== pooled.optEligible || settled.band !== pooled.band,
    cliff: CLIFF_DAYS,
  };
}
