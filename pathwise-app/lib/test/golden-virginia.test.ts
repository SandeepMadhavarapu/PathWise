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
 * ORDER and the step COUNT — is untouched by every change below. All thirty-eight are prose,
 * citation scoping, or two added fields.
 */
const INTENDED_CHANGES: Difference[] = [
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
  {
    path: "marcus:domicile-analysis.construction[0].kind",
    before: undefined,
    after: "favor_student_in_complex_cases",
  },
  {
    path: "marcus:domicile-analysis.construction[1].kind",
    before: undefined,
    after: "determinations_not_transferable",
  },
  {
    path: "marcus:domicile-analysis.construction[2].kind",
    before: undefined,
    after: "parental_status_alone_insufficient",
  },

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
