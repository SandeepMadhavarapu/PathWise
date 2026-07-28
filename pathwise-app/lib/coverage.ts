// coverage.ts — the jurisdiction INDEX.
//
// Every state and DC, with the body that decides residency there and the source PathWise actually
// opened. It records what is KNOWN about a jurisdiction and deliberately says nothing about how far
// PathWise has modelled one: that is a fact about the rule packs, and it is derived from them in
// ./jurisdiction-coverage.ts.
//
// The separation is the point. This file used to carry a hand-written `status` per jurisdiction —
// "implemented", "schema_ready", "not_yet" — maintained beside the packs that were the actual
// truth. Two sources for one fact, and the one on screen was the one nobody's tests were reading.
// There was a check that they agreed; it is better for them not to be two things.
//
// This module knows nothing about rule packs, and must not: lib/rulepacks/index.ts imports it, so
// the arrow only ever points this way.

import pack from './rulepacks/coverage.json';

export interface Jurisdiction {
  code: string;
  name: string;
  /**
   * What PathWise has noted about how this jurisdiction's rules are shaped — the durational period,
   * what its clock anchors to, whether lawful presence is required. Research, not a finding: it is
   * why a state was picked as a stress test, and it is never cited.
   */
  note?: string;
  /**
   * The body or statute that decides RESIDENCY here, and a link to it.
   *
   * Both are optional and deliberately so: they are present only where the source was opened and
   * read. An absent source_url means PathWise has not verified one — the UI says that in words
   * rather than linking a plausible guess, which is the same discipline the engines apply to a rule
   * they cannot read. See the pack's own `source_url_policy`.
   */
  authority?: string;
  source_url?: string;
  /**
   * HOW that source was confirmed, on `sources_checked_on`. Recorded because "we checked" is a
   * claim like any other, and this product's whole posture is that a claim states its basis.
   *
   *   fetched          the page was retrieved and its content read.
   *   serving_blocked  the host answered but refuses automated reads (403/405/406). The address is
   *                    live and is the agency's own; PathWise did not read what is on it.
   *
   * A host that answered neither probe gets no source at all — see `unverifiable`.
   */
  source_check?: 'fetched' | 'serving_blocked';
  /**
   * The same, for STATE AID — which is very often a different body: a residency determination is
   * made by a coordinating board or the institution, and grants by a separate commission.
   *
   * Separate fields rather than one pair reused for both, because reusing them would let a verified
   * residency source silently vouch for an aid claim nobody has checked. That is the precise shape
   * of overclaim this product exists not to make, and it is invisible unless the fields are split.
   */
  aid_authority?: string;
  aid_source_url?: string;
  aid_source_check?: 'fetched' | 'serving_blocked';
  /**
   * Present only where a source was actually sought and could not be confirmed, with the reason.
   * This is what separates "unable to verify" from "not modelled": one is work done that failed,
   * the other is work not yet done, and collapsing them would let an empty row look like an effort.
   */
  unverifiable?: string;
}

export const JURISDICTIONS = pack.jurisdictions as Jurisdiction[];

/** Look one up by its two-letter code. Undefined for a code the coverage file does not list. */
export function jurisdictionByCode(code: string): Jurisdiction | undefined {
  return JURISDICTIONS.find((j) => j.code === code);
}

/** The legend, keyed by capability level — the same vocabulary the packs declare. */
export const COVERAGE_LEGEND = pack.legend as Record<string, string>;
export const COVERAGE_VERIFIED_ON = pack.verified_on;
/** The day every source link in the index was last checked, and the day the checks are dated to. */
export const SOURCES_CHECKED_ON = (pack as { sources_checked_on?: string }).sources_checked_on ?? pack.verified_on;

/** The jurisdictions in the file that are not states, so "N states + DC" counts states as states. */
const NON_STATE_CODES = new Set(['DC']);

export const JURISDICTION_COUNT = JURISDICTIONS.length;
export const STATE_COUNT = JURISDICTIONS.filter((j) => !NON_STATE_CODES.has(j.code)).length;

/** How many jurisdictions have a verified official RESIDENCY source on record, modelled or not. */
export const RESIDENCY_SOURCED_COUNT = JURISDICTIONS.filter((j) => j.source_url).length;
/** The same, for state aid — a separate body in most states, so a separate count. */
export const AID_SOURCED_COUNT = JURISDICTIONS.filter((j) => j.aid_source_url).length;
