// coverage.ts — the reader for rulepacks/coverage.json.
//
// /coverage exists to say one thing: a jurisdiction is data, not code. A screen that hand-counted the
// states it covers would be the single place that claim was untrue — so every count the UI quotes is
// derived here, from the file itself. Add a state to coverage.json, or move one from "not yet" to
// "implemented", and the landing page, the dashboard strip and the map headline all follow on their
// own.

import pack from './rulepacks/coverage.json';

export type CoverageStatus = 'implemented' | 'schema_ready' | 'not_yet';

export interface Jurisdiction {
  code: string;
  name: string;
  status: CoverageStatus;
  note?: string;
  /**
   * The body or statute that actually decides residency in this jurisdiction, and a link to it.
   *
   * Both are optional and deliberately so: they are present only where the source was opened and
   * read on `verified_on`. An absent source_url means PathWise has not verified one — the UI says
   * that in words rather than linking a plausible guess, which is the same discipline the engines
   * apply to a rule they cannot read. See the pack's own `source_url_policy`.
   */
  authority?: string;
  source_url?: string;
}

export const JURISDICTIONS = pack.jurisdictions as Jurisdiction[];

/** Look one up by its two-letter code. Undefined for a code the coverage file does not list. */
export function jurisdictionByCode(code: string): Jurisdiction | undefined {
  return JURISDICTIONS.find((j) => j.code === code);
}
export const COVERAGE_LEGEND = pack.legend as Record<CoverageStatus, string>;
export const COVERAGE_VERIFIED_ON = pack.verified_on;

/** How many jurisdictions sit in each state of coverage. */
export const COVERAGE_COUNTS = JURISDICTIONS.reduce(
  (acc, j) => ({ ...acc, [j.status]: (acc[j.status] ?? 0) + 1 }),
  {} as Record<CoverageStatus, number>,
);

/** The jurisdictions in the file that are not states, so "N states + DC" counts states as states. */
const NON_STATE_CODES = new Set(['DC']);

export const JURISDICTION_COUNT = JURISDICTIONS.length;
export const STATE_COUNT = JURISDICTIONS.filter((j) => !NON_STATE_CODES.has(j.code)).length;

/** Fully modelled and verified against the primary source. */
export const IMPLEMENTED_COUNT = COVERAGE_COUNTS.implemented ?? 0;
/** Everything that is not yet fully modelled — the honest remainder. */
export const UNMODELLED_COUNT = JURISDICTION_COUNT - IMPLEMENTED_COUNT;
/** Not modelled at all: no rule pack, and the UI links to the official source instead. */
export const NOT_YET_COUNT = COVERAGE_COUNTS.not_yet ?? 0;
