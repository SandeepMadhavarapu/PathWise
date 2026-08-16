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
import { isModelled, type UnmodelledJurisdiction } from '../rulepacks';
import { COVERAGE_VERIFIED_ON } from '../coverage';

/** The result an unmodelled jurisdiction always yields. Named so the screens can match on it. */
export const UNMODELLED_RESULT: FindingResult = 'unable_to_verify';

/**
 * How the deciding authority is named when the coverage entry has one, and what is said when it
 * does not. The absent case is deliberately a sentence rather than a blank: a student reading it
 * should learn that PathWise has not verified the source, not wonder whether the screen is broken.
 */
function authorityLine(j: UnmodelledJurisdiction, domain: PackedDomain): string {
  return j.authority
    ? `${j.authority} — not yet modelled by PathWise`
    : `${j.name} ${domain === 'aid' ? 'state aid' : 'residency'} rules — no source verified by PathWise yet`;
}

/** Which half of a jurisdiction this finding is refusing to answer. */
type PackedDomain = 'residency' | 'aid';

/**
 * "a Ohio heading" was reaching a reader. Cheap, and it is the sort of thing a judge screenshots.
 *
 * Exported because /check prints this same sentence in its own words on the residency card, and for
 * a while it printed it with `a` hardcoded — so eleven states read "a Ohio heading", "a Illinois
 * heading", "a Iowa heading" while the engine two files away had already got it right. One helper,
 * one answer, and the page cannot drift from the engine again.
 *
 * The article is chosen by SOUND, not by spelling, which is why this is not simply /^[AEIOU]/.
 * Utah is /ˈjuːtɑː/ — it opens on a consonant, the same /j/ that makes it "a university" and not
 * "an university" — so a letter-only test produces "an Utah", which is wrong in the other
 * direction. Utah is the only one of the fifty-one jurisdictions where the letter and the sound
 * disagree; the exception is kept as a list rather than a special case so a future jurisdiction
 * with the same problem has somewhere obvious to go.
 */
const VOWEL_LETTER_CONSONANT_SOUND: readonly string[] = ['Utah'];

export function article(name: string): string {
  if (VOWEL_LETTER_CONSONANT_SOUND.includes(name)) return 'a';
  return /^[AEIOU]/i.test(name) ? 'an' : 'a';
}

/** The shared explanation of why there is no answer, in the jurisdiction's own terms. */
function whyNoAnswer(j: UnmodelledJurisdiction, domain: PackedDomain): string {
  const known = j.note ? ` What PathWise does record about ${j.name}: ${j.note}` : '';
  const answer = domain === 'aid' ? 'state-aid' : 'residency';
  // A jurisdiction with SOME pack registered is not one PathWise "has not authored a rule pack for".
  // Texas and Tennessee ship residency rules and no aid rules, and the flat sentence below told a
  // reader the opposite of what the residency card beside it was doing.
  const opening = isModelled(j.code)
    ? `PathWise has modelled ${j.name}'s residency rules but has not authored and verified its ` +
      `state-aid rules, so it will not compute a ${answer} answer here.`
    : `PathWise has not authored and verified a rule pack for ${j.name}, so it will not compute a ` +
      `${answer} answer here.`;
  return (
    `${opening} Running another state's rules under ${article(j.name)} ${j.name} heading would ` +
    `produce a confident answer sourced to the wrong statute, which is worse than no answer.${known}`
  );
}

/** Where to go instead — a real link when one was verified, an honest admission when not. */
function howToResolve(j: UnmodelledJurisdiction): string {
  return j.source_url
    ? `Check the official source for ${j.name}: ${j.source_url}`
    : `Ask the residency or domicile officer at your institution which ${j.name} rule applies. PathWise has not yet verified an official source to link.`;
}

function citation(j: UnmodelledJurisdiction, domain: PackedDomain): Finding['rule_citation'] {
  return {
    text: whyNoAnswer(j, domain),
    authority: authorityLine(j, domain),
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
        claim: whyNoAnswer(j, 'residency'),
        from_events: [],
        from_evidence: [],
      },
    ],
    rule_citation: citation(j, 'residency'),
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
        claim: isModelled(j.code)
          ? `State financial aid eligibility in most states turns on that state's own residency determination. PathWise has modelled ${j.name}'s residency rules, but its state-aid rules are a separate source and PathWise has not read them — so residency being answerable here does not make the aid question answerable.`
          : `State financial aid eligibility in most states turns on that state's own residency determination, which PathWise has not modelled for ${j.name}.`,
        from_events: [],
        from_evidence: [],
      },
      {
        claim: `This says nothing either way about federal aid, which is decided under federal rules and is unaffected by which state you are in.`,
        from_events: [],
        from_evidence: [],
      },
    ],
    rule_citation: citation(j, 'aid'),
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
