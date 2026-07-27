// jurisdiction-routing.test.ts — locks the fix for the wrong-citation bug, and locks Virginia's
// output while doing it.
//
// Run: npm run test:jurisdiction
//
// The bug this guards against was not a crash. /check offered a list of states, ran Virginia's
// rule pack whichever one was picked, and printed "SCHEV Pt II §03(A)" under a heading that said
// Texas. A confident answer sourced to the wrong statute is the worst failure this product can
// have, because the citation is the whole basis for trusting the answer.
//
// So the assertions come in two halves that matter equally:
//   1. An unmodelled jurisdiction yields `unable_to_verify`, names no other state's authority, and
//      carries a source link wherever coverage.json has a verified one.
//   2. Virginia's findings are byte-for-byte what they were before the resolver existed. A fix that
//      quietly moved the demo's numbers or citations would be a worse bug than the one it fixed.

import {
  COVERAGE_DISAGREEMENTS,
  describeUnmodelled,
  isModelled,
  resolveJurisdiction,
} from '../rulepacks';
import {
  unmodelledAidFinding,
  unmodelledResidencyFinding,
} from '../engines/unmodelled-jurisdiction';
import {
  GATE_DISPLAY_CITE,
  runDomicileGate,
} from '../engines/domicile-gate';
import { JURISDICTIONS } from '../coverage';
import type { Student } from '../types';

let failures = 0;
function assert(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}`, extra ?? '');
  }
}

// An F-1 student. The status that fires Virginia's gate — and that must NOT produce a gate finding
// anywhere else.
function f1Student(state: string): Student {
  return {
    id: 'test',
    immigration: { status: 'F1', prior_statuses: [] },
    dob: '2000-01-01',
    institutions: [],
    jurisdiction_history: [{ state, from: '2024-01-01' }],
  };
}

console.log('The registry and the coverage file agree');

assert(
  'no jurisdiction is claimed in coverage.json without a pack behind it',
  COVERAGE_DISAGREEMENTS.length === 0,
  COVERAGE_DISAGREEMENTS,
);
assert('Virginia resolves to a pack', resolveJurisdiction('VA') !== undefined);
assert('Virginia is modelled', isModelled('VA'));
assert('Texas is not modelled', !isModelled('TX'));
assert('an unknown code is not modelled', !isModelled('ZZ'));

console.log('');
console.log('An unmodelled jurisdiction gets an honest finding, not a borrowed one');

const tx = describeUnmodelled('TX');
assert('Texas is describable as unmodelled', tx !== undefined, tx);
assert('a modelled jurisdiction is not describable as unmodelled', describeUnmodelled('VA') === undefined);
assert('a code absent from coverage.json is distinguishable from a gap', describeUnmodelled('ZZ') === undefined);

const txResidency = unmodelledResidencyFinding(tx!);
const txAid = unmodelledAidFinding(tx!);

assert('Texas residency is unable_to_verify', txResidency.result === 'unable_to_verify', txResidency.result);
assert('Texas aid is unable_to_verify', txAid.result === 'unable_to_verify', txAid.result);
assert(
  'Texas residency is never "ineligible" — only a real pack can reach a determinate answer',
  txResidency.result !== 'ineligible',
);
assert('Texas headline names Texas', txResidency.headline.includes('Texas'), txResidency.headline);
assert(
  'Texas carries the verified official source link',
  txResidency.rule_citation.source_url === 'https://www.highered.texas.gov/texas-residency/',
  txResidency.rule_citation.source_url,
);
assert(
  'Texas still names the office that decides',
  txResidency.deciding_office === 'domicile_officer',
  txResidency.deciding_office,
);
assert('Texas states what it does not know', txResidency.unknowns.length > 0);

// The heart of it: no Virginia authority may appear anywhere in a Texas finding.
const txText = JSON.stringify([txResidency, txAid]);
assert('no SCHEV citation leaks into a Texas finding', !txText.includes('SCHEV'), txText.slice(0, 200));
assert('no Virginia reference leaks into a Texas finding', !/Virginia/.test(txText));
assert('the Virginia gate cite does not appear', !txText.includes(GATE_DISPLAY_CITE));

console.log('');
console.log('Every jurisdiction in the coverage file behaves');

// "West Virginia" contains "Virginia", so a naive substring search reports a leak that is really
// just the state's own name. Remove the jurisdiction's own name before looking for a borrowed one.
function borrowedAuthorityIn(text: string, ownName: string): string | undefined {
  const scrubbed = text.split(ownName).join('«own»');
  if (scrubbed.includes('SCHEV')) return 'SCHEV';
  if (scrubbed.includes('Virginia')) return 'Virginia';
  if (scrubbed.includes(GATE_DISPLAY_CITE)) return GATE_DISPLAY_CITE;
  return undefined;
}

const unmodelledJurisdictions = JURISDICTIONS.filter((j) => !isModelled(j.code));
const badFindings: string[] = [];
for (const j of unmodelledJurisdictions) {
  const d = describeUnmodelled(j.code);
  if (!d) {
    badFindings.push(`${j.code}: not describable`);
    continue;
  }
  const f = unmodelledResidencyFinding(d);
  if (f.result !== 'unable_to_verify') badFindings.push(`${j.code}: result ${f.result}`);
  const borrowed = borrowedAuthorityIn(JSON.stringify(f), j.name);
  if (borrowed) badFindings.push(`${j.code}: borrowed "${borrowed}"`);
}
assert(
  `all ${unmodelledJurisdictions.length} unmodelled jurisdictions yield unable_to_verify with no borrowed authority`,
  badFindings.length === 0,
  badFindings,
);

// West Virginia specifically, since it is the case that makes a naive check lie.
const wv = describeUnmodelled('WV');
const wvFinding = unmodelledResidencyFinding(wv!);
assert(
  'West Virginia names itself and borrows nothing',
  wvFinding.headline.includes('West Virginia') &&
    borrowedAuthorityIn(JSON.stringify(wvFinding), 'West Virginia') === undefined,
  wvFinding.headline,
);

// A link is only ever present when coverage.json verified one — never invented to fill the gap.
const withLink = unmodelledJurisdictions.filter((j) => j.source_url);
const withoutLink = unmodelledJurisdictions.filter((j) => !j.source_url);
const linkProblems: string[] = [];
for (const j of withLink) {
  const f = unmodelledResidencyFinding(describeUnmodelled(j.code)!);
  if (f.rule_citation.source_url !== j.source_url) linkProblems.push(`${j.code}: dropped its link`);
}
for (const j of withoutLink) {
  const f = unmodelledResidencyFinding(describeUnmodelled(j.code)!);
  if (f.rule_citation.source_url !== undefined) linkProblems.push(`${j.code}: invented ${f.rule_citation.source_url}`);
}
assert(
  `every verified link is carried through (${withLink.length}) and none is invented (${withoutLink.length})`,
  linkProblems.length === 0,
  linkProblems,
);

console.log('');
console.log('Virginia is untouched — the resolver changed routing, not rules');

const vaFinding = runDomicileGate({
  student: f1Student('VA'),
  events: [],
  intentFactors: [],
  allegedEntitlementDate: '2024-08-26',
});

assert('Virginia still gates F-1 as ineligible', vaFinding.result === 'ineligible', vaFinding.result);
assert(
  'Virginia headline is unchanged',
  vaFinding.headline === 'F-1 status blocks domicile in Virginia',
  vaFinding.headline,
);
assert(
  'Virginia still cites SCHEV Part II §03(A)',
  vaFinding.rule_citation.authority.includes('Part II, Section 03(A)'),
  vaFinding.rule_citation.authority,
);
assert('Virginia display cite is unchanged', GATE_DISPLAY_CITE === 'SCHEV Pt II §03(A)', GATE_DISPLAY_CITE);
assert(
  'Virginia still names the domicile officer',
  vaFinding.deciding_office === 'domicile_officer',
  vaFinding.deciding_office,
);
assert('Virginia still stops the analysis at the gate', vaFinding.reasoning_steps.length === 2);

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASSED — no state wears another state’s citation, and Virginia is unchanged.');
  process.exit(0);
} else {
  console.error(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
