// golden-virginia.test.ts — Virginia's output, byte for byte, before and after.
//
// Run: npm run test:golden
//
// The jurisdiction refactor moved every regulatory value out of module-scope imports and into packs
// injected by the router. That is a large mechanical change across three engines, and the one thing
// it was NOT allowed to do is alter a single character of what Virginia says — the demo's numbers,
// citations and prose are the product.
//
// golden/virginia.json was recorded from the engines as they stood BEFORE the refactor. This test
// recomputes the same six subjects through the router as it stands now and demands they be
// identical. It is the only assertion in the suite that can prove "Virginia is unchanged" rather
// than merely assert it, because the baseline was written by code that no longer exists.
//
// Deliberate changes since are permitted only by being LISTED, with their before and their after,
// in INTENDED_CHANGES below. The baseline itself is never re-recorded to make this test green:
// doing that would silently license every other diff in the same run. What the file guards has
// therefore widened slightly — from "nothing moved" to "nothing moved that nobody justified" —
// and it still holds the line that matters, which is that not one NUMBER has ever moved.

import { readFileSync } from 'fs';
import { join } from 'path';
import { buildGolden } from './golden-subjects';

let failures = 0;
function assert(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}`, extra ?? '');
  }
}

const goldenPath = join(process.cwd(), 'lib', 'test', 'golden', 'virginia.json');
const expected = JSON.parse(readFileSync(goldenPath, 'utf8')) as Record<string, unknown>;

// Both sides are compared in their SERIALIZED form, which is the form the golden records and the
// form a Finding travels in. Without the round-trip the live objects carry optional keys explicitly
// set to `undefined` — `auxiliaryAct`, `newDeadline`, `howToResolve` — that JSON.stringify drops on
// the way to disk. Comparing a live object against a parsed one reports those as "key added" on
// every run, which is a fact about JSON and not about Virginia.
const actual = JSON.parse(JSON.stringify(buildGolden())) as Record<string, unknown>;

interface Difference {
  path: string;
  before: unknown;
  after: unknown;
}

/** Every place two JSON trees differ, as paths a human can act on. */
function differences(a: unknown, b: unknown, path: string, out: Difference[]): void {
  if (a === b) return;

  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    out.push({ path, before: a, after: b });
    return;
  }

  if (Array.isArray(a) !== Array.isArray(b) || (Array.isArray(a) && a.length !== (b as unknown[]).length)) {
    out.push({ path, before: a, after: b });
    return;
  }

  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  for (const k of [...new Set([...Object.keys(ao), ...Object.keys(bo)])]) {
    const child = Array.isArray(a) ? `${path}[${k}]` : `${path}.${k}`;
    if (!(k in ao) || !(k in bo)) {
      out.push({ path: child, before: ao[k], after: bo[k] });
      continue;
    }
    differences(ao[k], bo[k], child, out);
  }
}

/**
 * Every intended change to Virginia's output since the baseline was recorded, pinned on both sides.
 *
 * These are recorded as exceptions rather than absorbed by re-running the capture, because
 * regenerating the baseline would discard the evidence that NOTHING ELSE moved — and that evidence
 * is the entire value of this file. Both the old and the new value are pinned for each one: a THIRD
 * state for any of these strings fails just as loudly as an unlisted change anywhere else, and a
 * pinned change that stops happening fails too (see the staleness assertion below).
 *
 * The list is grouped by the reason each change was made, and the groups are the review unit. If
 * you are adding to it, say what moved and why in the group comment — a bare entry here is a change
 * nobody has justified, which is exactly what this mechanism exists to prevent.
 *
 * Note what is NOT in here: not one number. The demo's arithmetic — 342, 552, 210, 288, 54, 23, the
 * 365-day cliff, the 12-month budget, the 90/150 unemployment caps, the aid deadline set, the step
 * ORDER and the step COUNT — is untouched by every change below. All forty are prose, citation
 * scoping, two added fields, the two SCHEV source URLs that went dead, or the removal of one
 * construction rule that no official source supports.
 */
const INTENDED_CHANGES: Difference[] = [
  // ---- 0. Two Virginia aid claims that no located authority supports. -----------------------
  //
  // The aid pack asserted, in a reasoning step a student reads: "Campuses are legally prohibited
  // from sharing VASA application information for immigration enforcement." Searched 2026-08-18
  // across SCHEV, Code of Virginia Title 23.1 and the Virginia Administrative Code for a provision
  // establishing that prohibition; none was located. The search instead surfaced Code of Virginia
  // provisions running the other way — institutions must notify the Attorney General when a
  // student admitted on a visa fails to enroll or withdraws, who notifies USCIS. Those concern
  // enrollment reporting, not aid-application data, so they do not necessarily contradict the
  // sentence. But this is the one claim in the product a student might act on to their cost: a
  // promise of legal confidentiality could decide whether someone files at all. PathWise must not
  // make a promise it cannot locate.
  //
  // What replaced it is narrower and independently checkable — PathWise transmits and stores
  // nothing, which is a property of the running application, not of Virginia law. The privacy
  // posture never needed the legal claim to stand up.
  //
  // The deadline cite changes for the same reason. SCHEV's VASA guidance directs students to their
  // own institution's published deadline and says deadlines vary by institution; no statewide VASA
  // date was located. 03-01 remains in the pack as the fallback the engine uses when an institution
  // supplies nothing, and the rule that matters — surface the EARLIEST of college, state and
  // federal — is untouched. Only the claim about what authority stands behind the date has changed.
  {
    path: "priya:aid-eligibility.reasoning_steps[6].claim",
    before:
      "Campuses are legally prohibited from sharing VASA application information for immigration enforcement. Underpins the no-account / no-store privacy posture.",
    after:
      "PathWise never transmits or stores anything entered here, so nothing a student types on this page can be shared by PathWise with anyone. That is a property of this application and is checkable: no network request is made after the page loads and no value is written to storage. Underpins the no-account / no-store privacy posture.",
  },
  {
    path: "priya:aid-deadline.cite",
    before: "SCHEV VASA guidance; institutional priority dates",
    after: "Institutional priority dates; no single statewide VASA date located",
  },
  {
    path: "priya:next-steps[3].cite",
    before: "SCHEV VASA guidance; institutional priority dates",
    after: "Institutional priority dates; no single statewide VASA date located",
  },
  // ---- 1. Volatility now describes the rule it is attached to. -------------------------------
  //
  // va-domicile.json carried a pack-level volatility note about the TUITION-EQUITY provision — a
  // provision that pack does not model; it lives in va-aid.json. domicile-gate.ts attaches the
  // pack note to every finding it produces, so the visa-capacity gate rendered "This rule is
  // under litigation: Tuition equity provision subject to DOJ challenge" beneath a refusal that
  // has nothing to do with tuition equity. The litigation information is not lost: va-aid.json
  // already scopes it per provision, and computeAidEligibility already prefers that.
  //
  // Both notes also ended with "re-verify before submission" — an instruction to us, printed to
  // the reader.
  {
    path: "priya:domicile-gate.volatility.status",
    before: "under_litigation",
    after: "stable",
  },
  {
    path: "priya:domicile-gate.volatility.note",
    before: "Tuition equity provision subject to DOJ challenge; re-verify before submission.",
    after: "SCHEV's statewide uniform criteria under Code of Virginia 23.1-510(D). The domicile provisions modelled in this pack were re-verified against the primary source on 2026-07-24.",
  },
  {
    path: "marcus:domicile-analysis.finding.volatility.status",
    before: "under_litigation",
    after: "stable",
  },
  {
    path: "marcus:domicile-analysis.finding.volatility.note",
    before: "Tuition equity provision subject to DOJ challenge; re-verify before submission.",
    after: "SCHEV's statewide uniform criteria under Code of Virginia 23.1-510(D). The domicile provisions modelled in this pack were re-verified against the primary source on 2026-07-24.",
  },
  {
    path: "priya:aid-eligibility.volatility.note",
    before: "The tuition equity provision is under litigation. State aid application landscape changing; re-verify VASA rules and dates before submission.",
    after: "The tuition equity provision is under litigation. Virginia's state aid application landscape is changing; the forms and deadlines modelled here were verified on 2026-07-24 and should be confirmed with the financial aid office for the award year being applied for.",
  },

  // ---- 2. The consequence engine stopped choosing a voice for the screen. --------------------
  //
  // The residency-suppression effect was written in the second person, on the one screen that
  // renders it, which is about an example student in the third. An engine has no business picking
  // the pronoun; the sentence is voice-neutral now and reads correctly either way.
  {
    path: "priya:job-offer-consequences[2].effect",
    before: "You might expect a job to help your residency case — but F-1 status blocks Virginia domicile entirely, so this changes nothing for residency.",
    after: "A job offer looks like a residency intent factor — but F-1 status blocks Virginia domicile entirely, so this changes nothing for residency.",
  },

  // ---- 3. The pre-existing pair, from the jurisdiction refactor. -----------------------------
  //
  // consequence-engine.ts used to hand-type the residency-suppression citation as two string
  // literals sitting a few lines from the pack that states the same rule — a paraphrase of
  // va-domicile.json's gate, kept in sync by nothing. It now reads the gate's own `explain` and
  // its own section reference, which is why these two strings moved.
  {
    path: "priya:job-offer-consequences[2].cite.text",
    before: "Holders of a student visa cannot establish domicile in Virginia.",
    after: "Holders of student or temporary visas do not have the capacity to establish domicile in Virginia.",
  },
  {
    path: "priya:job-offer-consequences[2].cite.authority",
    before: "SCHEV Domicile Guidelines Pt II §03(A)",
    after: "Part II, Section 03(A) & Section 02(4); SCHEV Domicile Guidelines, Code of Virginia 23.1-510(D)",
  },

  // ---- 4. The plan stopped telling a student to chase a door status has closed. --------------
  //
  // computeAidEligibility reports its provision gaps whether or not a status block has already
  // closed state aid, which is right — the gaps are real. fromUnknowns read every gap as an
  // instruction, so a student whose F-1 status closes Virginia state aid outright was handed
  // three steps to go and obtain domicile proof and high-school records AS ROUTES TO THAT AID,
  // while the aid finding one screen away said "Neither form opens Virginia state aid".
  //
  // The steps are still here and still in the same positions: the questions are genuinely open,
  // and hiding them would trade one dishonesty for another. What changed is that they are marked
  // informational and say what obtaining the document can and cannot achieve.
  {
    path: "priya:next-steps[4].title",
    before: "Get domicile established on record",
    after: "Keep domicile established — it will not reopen state financial aid",
  },
  {
    path: "priya:next-steps[4].why",
    before: "That provision rests on this one item. Without it, PathWise cannot establish it as a route to Virginia state aid.",
    after: "F-1 status blocks Virginia state financial aid — and that is a status fact, not a missing document, so producing this one does not change it. PathWise lists it because it is genuinely still open on the record, and because the same evidence can matter to a decision this finding does not govern.",
  },
  {
    path: "priya:next-steps[4].leadTimeReason",
    before: "The document usually has to come from someone else — a school, a county, a former employer — and their timeline is not yours.",
    after: "Nothing here is on a clock, because nothing here is holding the decision up.",
  },
  {
    path: "priya:next-steps[4].consequenceOfMissing",
    before: "While this is missing it stays an open question in the state financial aid finding, and the financial aid office decides on the record as it stands — not on what is true but undocumented.",
    after: "Nothing, for state financial aid — it is already closed on status. The cost of treating this as the blocker is the application cycle spent on a door that does not open.",
  },
  {
    path: "priya:next-steps[4].howToResolve",
    before: "Upload the document that establishes it, or ask the financial aid office which proof they accept.",
    after: "Hold on to it. If the status this rests on ever changes, the financial aid office reads the record as it stands then — and this is one of the items it would need.",
  },
  {
    path: "priya:next-steps[4].informational",
    before: undefined,
    after: true,
  },
  {
    path: "priya:next-steps[5].title",
    before: "Get VA high school attendance on record",
    after: "Keep VA high school attendance — it will not reopen state financial aid",
  },
  {
    path: "priya:next-steps[5].why",
    before: "That provision needs all 3 of its required items. Without it, PathWise cannot establish it as a route to Virginia state aid, and the provision itself is under litigation.",
    after: "F-1 status blocks Virginia state financial aid — and that is a status fact, not a missing document, so producing this one does not change it. PathWise lists it because it is genuinely still open on the record, and because the same evidence can matter to a decision this finding does not govern.",
  },
  {
    path: "priya:next-steps[5].leadTimeReason",
    before: "The document usually has to come from someone else — a school, a county, a former employer — and their timeline is not yours.",
    after: "Nothing here is on a clock, because nothing here is holding the decision up.",
  },
  {
    path: "priya:next-steps[5].consequenceOfMissing",
    before: "While this is missing it stays an open question in the state financial aid finding, and the financial aid office decides on the record as it stands — not on what is true but undocumented.",
    after: "Nothing, for state financial aid — it is already closed on status. The cost of treating this as the blocker is the application cycle spent on a door that does not open.",
  },
  {
    path: "priya:next-steps[5].howToResolve",
    before: "Upload the document that establishes it, or ask the financial aid office which proof they accept.",
    after: "Hold on to it. If the status this rests on ever changes, the financial aid office reads the record as it stands then — and this is one of the items it would need.",
  },
  {
    path: "priya:next-steps[5].informational",
    before: undefined,
    after: true,
  },
  {
    path: "priya:next-steps[6].title",
    before: "Get VA high school graduation on record",
    after: "Keep VA high school graduation — it will not reopen state financial aid",
  },
  {
    path: "priya:next-steps[6].why",
    before: "That provision needs all 3 of its required items. Without it, PathWise cannot establish it as a route to Virginia state aid, and the provision itself is under litigation.",
    after: "F-1 status blocks Virginia state financial aid — and that is a status fact, not a missing document, so producing this one does not change it. PathWise lists it because it is genuinely still open on the record, and because the same evidence can matter to a decision this finding does not govern.",
  },
  {
    path: "priya:next-steps[6].leadTimeReason",
    before: "The document usually has to come from someone else — a school, a county, a former employer — and their timeline is not yours.",
    after: "Nothing here is on a clock, because nothing here is holding the decision up.",
  },
  {
    path: "priya:next-steps[6].consequenceOfMissing",
    before: "While this is missing it stays an open question in the state financial aid finding, and the financial aid office decides on the record as it stands — not on what is true but undocumented.",
    after: "Nothing, for state financial aid — it is already closed on status. The cost of treating this as the blocker is the application cycle spent on a door that does not open.",
  },
  {
    path: "priya:next-steps[6].howToResolve",
    before: "Upload the document that establishes it, or ask the financial aid office which proof they accept.",
    after: "Hold on to it. If the status this rests on ever changes, the financial aid office reads the record as it stands then — and this is one of the items it would need.",
  },
  {
    path: "priya:next-steps[6].informational",
    before: undefined,
    after: true,
  },

  // ---- 5. ...and the two standing steps stopped quoting our own to-do list at the reader. ----
  //
  // fromFinding embeds the finding's volatility note in `consequenceOfMissing`. Fixing the notes
  // in (1) therefore moves these two strings as well. The domicile one now falls back to the
  // stock line, because a stable rule has no volatility note to carry.
  {
    path: "priya:next-steps[7].consequenceOfMissing",
    before: "Applying on the assumption it is open spends an application cycle and changes nothing. Tuition equity provision subject to DOJ challenge; re-verify before submission.",
    after: "Applying on the assumption it is open spends an application cycle and changes nothing. PathWise advises; the office decides.",
  },
  {
    path: "priya:next-steps[8].consequenceOfMissing",
    before: "Applying on the assumption it is open spends an application cycle and changes nothing. The tuition equity provision is under litigation. State aid application landscape changing; re-verify VASA rules and dates before submission.",
    after: "Applying on the assumption it is open spends an application cycle and changes nothing. The tuition equity provision is under litigation. Virginia's state aid application landscape is changing; the forms and deadlines modelled here were verified on 2026-07-24 and should be confirmed with the financial aid office for the award year being applied for.",
  },

  // ---- 6. ...and so did the aid finding's own open questions. -------------------------------
  //
  // Same defect as (4), one layer down and visible on /student/finding/aid: an `unknowns` entry
  // read "Without it, PathWise cannot establish it as a route to Virginia state aid" directly
  // beneath a finding headed "F-1 status blocks Virginia state financial aid". Both cannot be
  // true. `computeAidEligibility` now words the gap according to whether a status block has
  // already closed the door, so the finding and its own open questions agree — and (4) sits on
  // top of this rather than papering over it in the plan alone.
  {
    path: "priya:aid-eligibility.unknowns[0].why_it_matters",
    before: "That provision rests on this one item. Without it, PathWise cannot establish it as a route to Virginia state aid.",
    after: "That provision rests on this one item. It is moot for this student either way: F-1 status blocks Virginia state financial aid, so no provision below is an available route to Virginia state aid and no document reopens one. PathWise reports it because it is genuinely absent from the record, not because producing it would change this finding.",
  },
  {
    path: "priya:aid-eligibility.unknowns[0].how_to_resolve",
    before: "Upload the document that establishes it, or ask the financial aid office which proof they accept.",
    after: "Nothing needs to be produced for this finding. Keep the document if you have it — it becomes relevant again only if the status this rests on changes.",
  },
  {
    path: "priya:aid-eligibility.unknowns[1].why_it_matters",
    before: "That provision needs all 3 of its required items. Without it, PathWise cannot establish it as a route to Virginia state aid, and the provision itself is under litigation.",
    after: "That provision needs all 3 of its required items. It is moot for this student either way: F-1 status blocks Virginia state financial aid, so no provision below is an available route to Virginia state aid and no document reopens one. PathWise reports it because it is genuinely absent from the record, not because producing it would change this finding. The provision itself is under litigation.",
  },
  {
    path: "priya:aid-eligibility.unknowns[1].how_to_resolve",
    before: "Upload the document that establishes it, or ask the financial aid office which proof they accept.",
    after: "Nothing needs to be produced for this finding. Keep the document if you have it — it becomes relevant again only if the status this rests on changes.",
  },
  {
    path: "priya:aid-eligibility.unknowns[2].why_it_matters",
    before: "That provision needs all 3 of its required items. Without it, PathWise cannot establish it as a route to Virginia state aid, and the provision itself is under litigation.",
    after: "That provision needs all 3 of its required items. It is moot for this student either way: F-1 status blocks Virginia state financial aid, so no provision below is an available route to Virginia state aid and no document reopens one. PathWise reports it because it is genuinely absent from the record, not because producing it would change this finding. The provision itself is under litigation.",
  },
  {
    path: "priya:aid-eligibility.unknowns[2].how_to_resolve",
    before: "Upload the document that establishes it, or ask the financial aid office which proof they accept.",
    after: "Nothing needs to be produced for this finding. Keep the document if you have it — it becomes relevant again only if the status this rests on changes.",
  },

  // ---- 7. Construction rules dispatch on a declared `kind`, not on Virginia's rule ids. -------
  //
  // applyConstructionRules switched on `rule.id` — the pack's own name for its own rule. That meant
  // any jurisdiction naming a rule `favor_student_in_complex_cases` would silently inherit the
  // reasoning written against SCHEV's wording of it, and any jurisdiction naming the same rule
  // differently would lose that reasoning without either side saying so. Packs now ask for a
  // reasoner by `kind`; a rule that asks for none is surfaced in the pack's own words with no
  // relevance invented for it.
  //
  // Virginia declares the three kinds it was already getting, so every sentence it produces is
  // unchanged. What appears below is the new field arriving on the analysis object — and it is the
  // ONLY thing the whole Phase 1 architecture change moved in Virginia's output. Not one reasoning
  // string, number, citation, headline or deciding office differs.
  // Superseded by group 10 below. These three pinned the `kind` field arriving on each
  // construction rule. Removing the Virginia rule at index 0 changes the ARRAY LENGTH, and
  // `differences()` reports a length change as one whole-array difference rather than
  // per-element ones — so these paths can no longer occur and the staleness assertion below
  // would fail on them. The `kind` fields are still pinned, inside the arrays in group 10.

  // ---- 8. One provision sentence stops printing an internal file id, and reads as English. ------
  //
  // The domicile provision's note in va-aid.json ended "(see va-domicile pack)" — a pointer to
  // another rule pack BY ITS FILENAME, printed inside a legal finding a student reads. The
  // cross-reference is worth keeping; naming a file in the repository to make it is not. It now
  // says the same thing about the same rules: the Virginia domicile determination, made under
  // Virginia's residency rules.
  //
  // The second half of the same sentence was ungrammatical and lower-cased mid-paragraph. The
  // tally opens a sentence — the note before it ends with a full stop — and read "…pack). none of
  // its one required item on record yet". aid-eligibility.ts now renders the 0-of-1 case as a
  // sentence.
  //
  // Presentation only, and provably so: `note` is carried to the claim and rendered (nothing in
  // lib/ branches on its contents), and the tally is a display string composed from counts that did
  // not move. Everything the finding turns on is identical either side of this change — result
  // `ineligible`, the SCHEV VASA citation and authority, deciding office `financial_aid`, 3
  // unknowns, 7 reasoning steps, and the untouched "; still missing: Domicile established." clause
  // carried through verbatim. This is the only entry in this file that touches an aid claim, and it
  // is the only difference the diff reports for `priya:aid-eligibility`.
  {
    path: "priya:aid-eligibility.reasoning_steps[3].claim",
    before:
      "Domicile provision — Qualifies via VA domicile (see va-domicile pack). none of its one required item on record yet; still missing: Domicile established.",
    after:
      "Domicile provision — Qualifies through Virginia domicile, as determined under Virginia's residency rules. Its one required item is not yet on record; still missing: Domicile established.",
  },
  // ---- 9. The two SCHEV source URLs, because the old ones 404. --------------------------------
  //
  // Both Virginia source_urls pointed into schev.edu/students/resources-for-students/…, a path
  // family SCHEV has since retired. Production served "Read the source →" on four routes and
  // "Official Virginia source →" on /check, and every one of them landed on a real SCHEV
  // "Page Not Found". The packs said "Verified on 24 Jul 2026" directly above the dead link.
  //
  // The replacements were opened and read before being written here, not merely pinged for a 200:
  //
  //   · va-domicile -> .../in-state-residency/guidelines-for-in-state-residency-tuition, the page
  //     titled "Guidelines for In-State Residency & Tuition". It states "These Domicile Guidelines
  //     are updated effective January 11, 2021", which is the pack's own `guidelines_effective`
  //     value to the day, and "established under the authority of the Code of Virginia,
  //     § 23.1-510(D)", which is the pack's own `authority` string. It also carries the
  //     parental-status rule this pack encodes as a construction rule, verbatim.
  //   · va-aid -> .../financial-aid/federal-state-financial-aid, which names both FAFSA and VASA
  //     and states the form-selection rule the pack models ("students submit a FAFSA or VASA
  //     application to their preferred institution").
  //
  // `verified_on` is deliberately NOT bumped. What was re-verified on 2026-08-09 is where the
  // source lives, not every section the pack cites; moving the date would claim a re-reading of
  // Part II §03(A), §05(C)(1) and §09(C)(1) that nobody performed. lib/test/source-urls.test.ts
  // now fails the build if either URL goes dead again.
  //
  // Location only. No rule, threshold, citation string, authority, office or verdict moves.
  {
    path: "priya:domicile-gate.rule_citation.source_url",
    before: "https://www.schev.edu/students/resources-for-students/paying-for-college/determining-domicile",
    after: "https://www.schev.edu/financial-aid/in-state-residency/guidelines-for-in-state-residency-tuition",
  },
  {
    path: "marcus:domicile-analysis.finding.rule_citation.source_url",
    before: "https://www.schev.edu/students/resources-for-students/paying-for-college/determining-domicile",
    after: "https://www.schev.edu/financial-aid/in-state-residency/guidelines-for-in-state-residency-tuition",
  },
  {
    path: "priya:aid-eligibility.rule_citation.source_url",
    before: "https://www.schev.edu/students/resources-for-students/paying-for-college",
    after: "https://www.schev.edu/financial-aid/financial-aid/federal-state-financial-aid",
  },
  // ---- 10. The unsupported SCHEV construction rule was removed. ------------------------------
  //
  // va-domicile.json carried `favor_student_in_complex_cases`: "In complex cases, construe the
  // facts in the light most favorable to the student", attributed to "SCHEV guidance". It was
  // searched for and NOT FOUND in any official source:
  //
  //   · SCHEV Domicile Guidelines, 32pp, effective 11 Jan 2021 (the document the pack cites)
  //   · Addendum A (alien categories), Addendum B (forms and definitions), Addendum C
  //   · Code of Virginia Title 23.1 Chapter 5, and § 23.1-502 / § 23.1-503 in full
  //
  // Across all of them "favorab", "in favor", "most favorable" and "light most" return zero
  // matches. The single "construe" hit is a savings clause pointing the other way: "nothing
  // herein is intended, nor shall be construed, to repeal or modify any provision of federal or
  // state law". § 23.1-503 runs the other way too, putting the burden on the student to rebut by
  // clear and convincing evidence.
  //
  // The engine also amplified it, adding "and the officer is directed to do the same" — a
  // direction to an official that no source contains. Rule and reasoner both removed; a
  // student-favourable invention is still an invention.
  //
  // WHAT DID NOT MOVE: the verdict (potential_risk), the deciding office, the authority string,
  // the headline, the 365-day clock, the earliest entitlement date (2027-06-08) and the open
  // question count (1) are all identical. Only the removed claim's own step and rule are gone.
  //
  // The two `after` arrays below also carry two later wording corrections to the rule that REMAINS,
  // `parental_status_alone_insufficient`. Its subject is the parent's LEGAL STATUS — SCHEV's
  // assurance that "no student shall be denied in-state tuition ... due solely to the legal status
  // of the individual's parent(s)" — and both the pack's quoted note and the engine's three
  // relevance sentences had said "domicile" instead:
  //
  //   · the note read "...solely because of parental status", which names a different (broader)
  //     subject than the source, and DomicileAnalysis.tsx renders it inside quote marks — so a
  //     paraphrase was being shown to a reader as a quotation of SCHEV;
  //   · one relevance branch said the parents' domicile "cannot be the sole ground for a denial",
  //     which the Guidelines contradict: a dependent student "is rebuttably presumed to have the
  //     domicile of the parent providing substantial financial support", and the review "always
  //     begins with the parent's domicile". Parental domicile IS the presumptive route.
  //
  // Both now say legal status, and the branch that affirms the domicile presumption still affirms
  // it. Nothing else moved: same rule id, same `kind`, same trigger, same verdict, same counts.
  {
    path: "marcus:domicile-analysis.finding.reasoning_steps",
    before: [
        {
          "claim": "The student holds LPR status, which is not one of the statuses that close domicile in Virginia (F-1, J-1 and M-1). The gate does not fire, so the analysis continues — Part II, Section 03(A) & Section 02(4).",
          "from_events": [],
          "from_evidence": []
        },
        {
          "claim": "At the date of alleged entitlement the student is 22, under the pack's threshold of 24, so dependency is rebuttably presumed. It is rebutted: the \"graduate or professional student\" exception is established by the record itself. The timeline carries a masters-level program starting 24 Aug 2026 at School Z, on or before the date of alleged entitlement. The student's own acts are therefore what the intent analysis reads — Section 09(C)(1).",
          "from_events": [
            "prog-start-z"
          ],
          "from_evidence": []
        },
        {
          "claim": "Of the 6 intent factors the guidelines weigh, 3 are satisfied and count: continuous residence (primary), drivers license (secondary) and VA job offer accepted (primary); 1 is satisfied but does not count: employment — \"Co-op employment confers no domicile.\"; 1 cannot apply to this student: voter registration (immigration.status != 'citizen'); 1 is not on the record: VA income tax filed (primary) — SCHEV Domicile Guidelines, Code of Virginia 23.1-510(D).",
          "from_events": [
            "mv-va",
            "lease-va-signed",
            "lic-va",
            "offer-va"
          ],
          "from_evidence": []
        },
        {
          "claim": "1 of the qualifying factors is named in the pack's auxiliary-acts warning — drivers license (secondary). \"Acts auxiliary to educational objectives, or routinely performed by temporary residents, carry little weight.\" They support the case; they do not carry it. — Section 06(B).",
          "from_events": [],
          "from_evidence": []
        },
        {
          "claim": "The last qualifying factor is VA job offer accepted on 8 Jun 2026, and the clock starts there. The clock does NOT start on arrival; look at the date on which the LAST of the qualifying factors occurred. Counting from the earliest factor instead (continuous residence, 1 Aug 2024) is the mistake this rule exists to prevent. — Section 05(C)(1).",
          "from_events": [
            "offer-va"
          ],
          "from_evidence": []
        },
        {
          "claim": "365 days from 8 Jun 2026 is 8 Jun 2027 — the earliest date of alleged entitlement that satisfies the duration requirement. The date claimed here is 24 Aug 2026 (first official day of class of the term), which falls 288 days short.",
          "from_events": [],
          "from_evidence": []
        },
        {
          "claim": "In complex cases, construe the facts in the light most favorable to the student. This record is not a simple one: 1 satisfied factor that a pack caveat takes back out, 1 factor that cannot apply to this status, 1 earlier immigration status on the record and 1 open question. Every reading above that could go either way has gone the student's way, and the officer is directed to do the same. — SCHEV guidance",
          "from_events": [],
          "from_evidence": []
        },
        {
          "claim": "A prior determination by one institution is not binding on another. The record spans 2 institutions. A domicile determination made by one of them — favourable or not — does not bind the next, so this analysis has to be made again wherever the student is claiming in-state status.",
          "from_events": [],
          "from_evidence": []
        },
        {
          "claim": "No student shall be denied in-state tuition solely because of parental status. The age presumption applied and was rebutted by the graduate or professional student exception — so the student's own acts are what is weighed, and their parents' domicile is not by itself a reason to deny in-state status.",
          "from_events": [],
          "from_evidence": []
        }
      ],
    after: [
        {
          "claim": "The student holds LPR status, which is not one of the statuses that close domicile in Virginia (F-1, J-1 and M-1). The gate does not fire, so the analysis continues — Part II, Section 03(A) & Section 02(4).",
          "from_events": [],
          "from_evidence": []
        },
        {
          "claim": "At the date of alleged entitlement the student is 22, under the pack's threshold of 24, so dependency is rebuttably presumed. It is rebutted: the \"graduate or professional student\" exception is established by the record itself. The timeline carries a masters-level program starting 24 Aug 2026 at School Z, on or before the date of alleged entitlement. The student's own acts are therefore what the intent analysis reads — Section 09(C)(1).",
          "from_events": [
            "prog-start-z"
          ],
          "from_evidence": []
        },
        {
          "claim": "Of the 6 intent factors the guidelines weigh, 3 are satisfied and count: continuous residence (primary), drivers license (secondary) and VA job offer accepted (primary); 1 is satisfied but does not count: employment — \"Co-op employment confers no domicile.\"; 1 cannot apply to this student: voter registration (immigration.status != 'citizen'); 1 is not on the record: VA income tax filed (primary) — SCHEV Domicile Guidelines, Code of Virginia 23.1-510(D).",
          "from_events": [
            "mv-va",
            "lease-va-signed",
            "lic-va",
            "offer-va"
          ],
          "from_evidence": []
        },
        {
          "claim": "1 of the qualifying factors is named in the pack's auxiliary-acts warning — drivers license (secondary). \"Acts auxiliary to educational objectives, or routinely performed by temporary residents, carry little weight.\" They support the case; they do not carry it. — Section 06(B).",
          "from_events": [],
          "from_evidence": []
        },
        {
          "claim": "The last qualifying factor is VA job offer accepted on 8 Jun 2026, and the clock starts there. The clock does NOT start on arrival; look at the date on which the LAST of the qualifying factors occurred. Counting from the earliest factor instead (continuous residence, 1 Aug 2024) is the mistake this rule exists to prevent. — Section 05(C)(1).",
          "from_events": [
            "offer-va"
          ],
          "from_evidence": []
        },
        {
          "claim": "365 days from 8 Jun 2026 is 8 Jun 2027 — the earliest date of alleged entitlement that satisfies the duration requirement. The date claimed here is 24 Aug 2026 (first official day of class of the term), which falls 288 days short.",
          "from_events": [],
          "from_evidence": []
        },
        {
          "claim": "A prior determination by one institution is not binding on another. The record spans 2 institutions. A domicile determination made by one of them — favourable or not — does not bind the next, so this analysis has to be made again wherever the student is claiming in-state status.",
          "from_events": [],
          "from_evidence": []
        },
        {
          "claim": "No student shall be denied in-state tuition solely because of a parent's legal status. The age presumption applied and was rebutted by the graduate or professional student exception — so the student's own acts are what is weighed, and the parents' own legal status is not by itself a reason to deny in-state tuition.",
          "from_events": [],
          "from_evidence": []
        }
      ]
  },
  {
    path: "marcus:domicile-analysis.construction",
    before: [
        {
          "id": "favor_student_in_complex_cases",
          "cite": "SCHEV guidance",
          "note": "In complex cases, construe the facts in the light most favorable to the student.",
          "label": "Favor student in complex cases",
          "relevant": true,
          "relevance": "This record is not a simple one: 1 satisfied factor that a pack caveat takes back out, 1 factor that cannot apply to this status, 1 earlier immigration status on the record and 1 open question. Every reading above that could go either way has gone the student's way, and the officer is directed to do the same."
        },
        {
          "id": "determinations_not_transferable",
          "note": "A prior determination by one institution is not binding on another.",
          "label": "Determinations not transferable",
          "relevant": true,
          "relevance": "The record spans 2 institutions. A domicile determination made by one of them — favourable or not — does not bind the next, so this analysis has to be made again wherever the student is claiming in-state status."
        },
        {
          "id": "parental_status_alone_insufficient",
          "note": "No student shall be denied in-state tuition solely because of parental status.",
          "label": "Parental status alone insufficient",
          "relevant": true,
          "relevance": "The age presumption applied and was rebutted by the graduate or professional student exception — so the student's own acts are what is weighed, and their parents' domicile is not by itself a reason to deny in-state status."
        }
      ],
    after: [
        {
          "id": "determinations_not_transferable",
          "note": "A prior determination by one institution is not binding on another.",
          "kind": "determinations_not_transferable",
          "label": "Determinations not transferable",
          "relevant": true,
          "relevance": "The record spans 2 institutions. A domicile determination made by one of them — favourable or not — does not bind the next, so this analysis has to be made again wherever the student is claiming in-state status."
        },
        {
          "id": "parental_status_alone_insufficient",
          "note": "No student shall be denied in-state tuition solely because of a parent's legal status.",
          "kind": "parental_status_alone_insufficient",
          "label": "Parental status alone insufficient",
          "relevant": true,
          "relevance": "The age presumption applied and was rebutted by the graduate or professional student exception — so the student's own acts are what is weighed, and the parents' own legal status is not by itself a reason to deny in-state tuition."
        }
      ]
  },
];

console.log('Virginia is byte-for-byte what it was before the engines were parameterised');

assert(
  'the golden covers every subject the refactor touched',
  Object.keys(expected).length === 6,
  Object.keys(expected),
);
assert(
  'no subject was added or dropped',
  JSON.stringify(Object.keys(expected)) === JSON.stringify(Object.keys(actual)),
  { expected: Object.keys(expected), actual: Object.keys(actual) },
);

const found: Difference[] = [];
for (const key of Object.keys(expected)) {
  differences(expected[key], actual[key], key, found);
}

const matches = (d: Difference, e: Difference) =>
  d.path === e.path &&
  JSON.stringify(d.before) === JSON.stringify(e.before) &&
  JSON.stringify(d.after) === JSON.stringify(e.after);

const unexpected = found.filter((d) => !INTENDED_CHANGES.some((e) => matches(d, e)));
assert(
  `nothing changed except the ${INTENDED_CHANGES.length} listed and justified changes`,
  unexpected.length === 0,
  unexpected.length
    ? unexpected.map((d) => `\n    ${d.path}\n      before: ${JSON.stringify(d.before)}\n      after:  ${JSON.stringify(d.after)}`).join('')
    : '',
);

// A stale exception is its own bug: it would silently license a change that is no longer happening.
const stale = INTENDED_CHANGES.filter((e) => !found.some((d) => matches(d, e)));
assert(
  'every listed intended change is still exactly the change being made',
  stale.length === 0,
  stale.map((e) => e.path),
);

// Per-subject, so a regression names the finding it broke rather than just "something moved".
for (const key of Object.keys(expected)) {
  const mine = found.filter((d) => d.path.startsWith(key) && !INTENDED_CHANGES.some((e) => matches(d, e)));
  assert(`${key} is unchanged`, mine.length === 0, mine.map((d) => d.path));
}

// A golden that matched an empty computation would pass while proving nothing. These three anchors
// are the demo's load-bearing claims, asserted literally so an accidentally-empty capture cannot
// masquerade as a pass.
console.log('');
console.log('The golden is actually carrying the demo, not an empty shell');

const gate = expected['priya:domicile-gate'] as any;
assert(
  'the gate finding still reads "F-1 status blocks domicile in Virginia"',
  gate?.headline === 'F-1 status blocks domicile in Virginia',
  gate?.headline,
);
assert(
  'the gate still cites SCHEV Part II, Section 03(A)',
  typeof gate?.rule_citation?.authority === 'string' &&
    gate.rule_citation.authority.includes('Part II, Section 03(A)'),
  gate?.rule_citation?.authority,
);
assert(
  'the aid finding still names the Virginia state-aid block',
  (expected['priya:aid-eligibility'] as any)?.headline ===
    'F-1 status blocks Virginia state financial aid',
  (expected['priya:aid-eligibility'] as any)?.headline,
);
assert(
  'the plan still has steps in it',
  Array.isArray(expected['priya:next-steps']) && (expected['priya:next-steps'] as unknown[]).length > 0,
);

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASSED — the refactor moved the plumbing and not one word of Virginia.');
  process.exit(0);
} else {
  console.error(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
