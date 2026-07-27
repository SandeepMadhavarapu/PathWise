// unmodelled-jurisdiction.ts — what PathWise says about a state it has not modelled.
//
// This is not an error path and it is not a placeholder. `unable_to_verify` is a first-class
// Finding result (see types.ts), and it is the correct answer here in the same way "342 days, amber"
// is the correct answer for Priya's ledger: PathWise knows a residency rule decides this, knows
// which office applies it, and does not know what the rule says. Saying exactly that is a finding.
//
// The alternative — running Virginia's pack and relabelling the heading — is the one thing this
// file exists to prevent. Every value below therefore comes from the jurisdiction's own coverage
// entry, and where the entry has no verified source the finding says so in words instead of
// linking a guess.
//
// Federal facts are untouched by any of this. The CPT ledger, OPT budget and unemployment clock are
// 8 CFR rules that do not care which state the student sits in, so they keep answering in full.

import type { Finding, FindingResult } from '../types';
import type { UnmodelledJurisdiction } from '../rulepacks';
import { COVERAGE_VERIFIED_ON } from '../coverage';

/** The result an unmodelled jurisdiction always yields. Named so the screens can match on it. */
export const UNMODELLED_RESULT: FindingResult = 'unable_to_verify';

/**
 * How the deciding authority is named when the coverage entry has one, and what is said when it
 * does not. The absent case is deliberately a sentence rather than a blank: a student reading it
 * should learn that PathWise has not verified the source, not wonder whether the screen is broken.
 */
function authorityLine(j: UnmodelledJurisdiction): string {
  return j.authority
    ? `${j.authority} — not yet modelled by PathWise`
    : `${j.name} residency rules — no source verified by PathWise yet`;
}

/** The shared explanation of why there is no answer, in the jurisdiction's own terms. */
function whyNoAnswer(j: UnmodelledJurisdiction): string {
  const known = j.note ? ` What PathWise does record about ${j.name}: ${j.note}` : '';
  return (
    `PathWise has not authored and verified a rule pack for ${j.name}, so it will not compute a ` +
    `residency answer here. Running another state's rules under a ${j.name} heading would produce ` +
    `a confident answer sourced to the wrong statute, which is worse than no answer.${known}`
  );
}

/** Where to go instead — a real link when one was verified, an honest admission when not. */
function howToResolve(j: UnmodelledJurisdiction): string {
  return j.source_url
    ? `Check the official source for ${j.name}: ${j.source_url}`
    : `Ask the residency or domicile officer at your institution which ${j.name} rule applies. PathWise has not yet verified an official source to link.`;
}

function citation(j: UnmodelledJurisdiction): Finding['rule_citation'] {
  return {
    text: whyNoAnswer(j),
    authority: authorityLine(j),
    // Present only where verified. An absent source_url stays absent — the UI renders that as
    // "no verified source" rather than as a broken link.
    source_url: j.source_url,
    // The date PathWise last verified its own coverage claim, which is the claim being made here.
    verified_on: COVERAGE_VERIFIED_ON,
  };
}

/**
 * The residency finding for a jurisdiction with no pack.
 *
 * `deciding_office` is still `domicile_officer`, and that is not a guess: every state decides
 * in-state classification through some residency or domicile officer at the institution. Which
 * office decides is knowable without knowing the rule they apply, so PathWise says the part it
 * knows.
 */
export function unmodelledResidencyFinding(j: UnmodelledJurisdiction): Finding {
  return {
    rule_id: `coverage:${j.code}:residency-unmodelled`,
    domain: 'residency',
    result: UNMODELLED_RESULT,
    headline: `PathWise has not modelled ${j.name} residency rules`,
    reasoning_steps: [
      {
        claim: `Residency for tuition is decided per state, and ${j.name} is not one of the jurisdictions PathWise has authored a verified rule pack for.`,
        from_events: [],
        from_evidence: [],
      },
      {
        claim: whyNoAnswer(j),
        from_events: [],
        from_evidence: [],
      },
    ],
    rule_citation: citation(j),
    unknowns: [
      {
        what: `${j.name}'s residency statute: its durational requirement, what starts the clock, and whether a student visa holder can establish domicile there at all.`,
        why_it_matters: `These decide in-state tuition and, in most states, eligibility for state financial aid — often through the same single fact about immigration status.`,
        how_to_resolve: howToResolve(j),
      },
    ],
    deciding_office: 'domicile_officer',
  };
}

/**
 * The aid finding for a jurisdiction with no pack.
 *
 * State aid eligibility usually rides on the state's own residency determination, so an unmodelled
 * residency rule leaves the aid question open too. Federal aid is a separate question this finding
 * does not touch and does not claim to.
 */
export function unmodelledAidFinding(j: UnmodelledJurisdiction): Finding {
  return {
    rule_id: `coverage:${j.code}:aid-unmodelled`,
    domain: 'aid',
    result: UNMODELLED_RESULT,
    headline: `PathWise has not modelled ${j.name} state aid rules`,
    reasoning_steps: [
      {
        claim: `State financial aid eligibility in most states turns on that state's own residency determination, which PathWise has not modelled for ${j.name}.`,
        from_events: [],
        from_evidence: [],
      },
      {
        claim: `This says nothing either way about federal aid, which is decided under federal rules and is unaffected by which state you are in.`,
        from_events: [],
        from_evidence: [],
      },
    ],
    rule_citation: citation(j),
    unknowns: [
      {
        what: `Which ${j.name} state aid programs exist, and what they require of a non-resident or a student-visa holder.`,
        why_it_matters: `State aid is frequently closed by the same status fact that closes residency — one fact, two doors — so it cannot be assumed open.`,
        how_to_resolve: howToResolve(j),
      },
    ],
    deciding_office: 'financial_aid',
  };
}
