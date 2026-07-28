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

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  describeUnmodelled,
  isModelled,
  resolveJurisdiction,
} from '../rulepacks';
import {
  unmodelledAidFinding,
  unmodelledResidencyFinding,
} from '../engines/unmodelled-jurisdiction';
import {
  aidFindingFor,
  aidFormFor,
  jurisdictionFor,
  jurisdictionForCode,
  residencyFindingFor,
} from '../engines/jurisdiction';
import { applyLifeEvent } from '../engines/consequence-engine';
import { humanizeId } from '../engines/domicile-gate';
import { UNLISTED_REGISTRATIONS } from '../jurisdiction-coverage';
import { JURISDICTIONS } from '../coverage';
import { priyaJobOffer } from '../fixtures/priya';
import type { Student } from '../types';

// Virginia's abbreviated gate cite, read from the resolver rather than imported from the engine —
// the engine no longer has one to import, which is the point of the whole change.
const GATE_DISPLAY_CITE = jurisdictionForCode('VA').display!.residencyCite;

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

// The registry and the index are no longer two claims about the same thing — the coverage map is
// DERIVED from what the packs declare (lib/jurisdiction-coverage.ts). The one disagreement still
// possible is a pack registered for a code the index does not list, which would be a jurisdiction
// the engines answer for and the map cannot show.
assert(
  'no pack is registered for a jurisdiction the index does not list',
  UNLISTED_REGISTRATIONS.length === 0,
  UNLISTED_REGISTRATIONS,
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

const vaStudent = f1Student('VA');
const vaFinding = residencyFindingFor(jurisdictionFor(vaStudent), {
  student: vaStudent,
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
console.log('No engine binds a jurisdiction pack at module scope');

// The structural assertion, and the reason ARCHITECTURE_NOTE could be deleted.
//
// Every other test here checks an OUTPUT. This one checks the SOURCE, because the bug it guards
// against is not a wrong answer — it is an import that makes a wrong answer possible again. An
// engine that imports va-domicile.json is an engine that answers for Virginia no matter which
// student it is handed, and no output assertion catches that until someone ships a second pack.
const enginesDir = join(process.cwd(), 'lib', 'engines');
const engineFiles = readdirSync(enginesDir).filter((f) => f.endsWith('.ts'));
const packImporters: string[] = [];
for (const file of engineFiles) {
  const src = readFileSync(join(enginesDir, file), 'utf8');
  // Any import of a jurisdiction-specific rulepack: a two-letter prefix and a domain.
  const hits = src.match(/^\s*import\s+.*['"][^'"]*\/[a-z]{2}-[a-z-]+\.json['"]/gm);
  if (hits) packImporters.push(`${file}: ${hits.map((h) => h.trim()).join(' | ')}`);
}
assert(
  `none of the ${engineFiles.length} engine modules imports a jurisdiction rulepack`,
  packImporters.length === 0,
  packImporters,
);

// The federal packs are a deliberate exception and must stay importable: 8 CFR does not vary by
// state, so cpt-ledger, opt-budget, unemployment-clock and next-steps are right to bind theirs.
const federalImporters = engineFiles.filter((f) =>
  /import\s+.*f1-practical-training\.json/.test(readFileSync(join(enginesDir, f), 'utf8')),
);
assert(
  'federal packs are still bound directly — 8 CFR does not vary by jurisdiction',
  federalImporters.length > 0,
  federalImporters,
);

console.log('');
console.log('A shared rulepack carries no state’s authority');

// The leak the structural scan above could not see. consequence-map.json is imported at module
// scope by consequence-engine.ts and applies to EVERY jurisdiction — and it used to carry SCHEV
// section references on its residency entries. Nothing caught it, because the regex above matches
// `xx-domain.json` and this file is not named that, and because only Virginia ever reached those
// cites while Virginia was the only pack. A second pack would have worn them on day one.
const packsDir = join(process.cwd(), 'lib', 'rulepacks');
const sharedPacks = readdirSync(packsDir).filter(
  (f) => f.endsWith('.json') && !/^[a-z]{2}-/.test(f) && f !== 'coverage.json',
);
const contaminated: string[] = [];
for (const file of sharedPacks) {
  const src = readFileSync(join(packsDir, file), 'utf8');
  // The `authority_rule` field exists to state this invariant, so it is allowed to describe it.
  const body = src.replace(/"authority_rule":\s*"[^"]*"/g, '');
  if (body.includes('SCHEV')) contaminated.push(`${file}: SCHEV`);
  for (const j of JURISDICTIONS) {
    if (isModelled(j.code) && body.includes(j.name)) contaminated.push(`${file}: ${j.name}`);
  }
}
assert(
  `the ${sharedPacks.length} cross-jurisdiction packs name no state's authority`,
  contaminated.length === 0,
  contaminated,
);

// And the resolution actually happens: a student the gate does NOT fire on still gets residency
// consequences, and their authority must be one the deciding pack owns rather than the map's.
const vaLpr: Student = {
  ...f1Student('VA'),
  immigration: { status: 'LPR', prior_statuses: [] },
};
const vaLprJx = jurisdictionFor(vaLpr);
const lprConsequences = applyLifeEvent(vaLpr, priyaJobOffer, vaLprJx);
const lprResidency = lprConsequences.filter((c) => c.domain === 'residency');
const packAuthority = resolveJurisdiction('VA')!.domicile.authority;
assert(
  'a student past the gate still gets residency consequences',
  lprResidency.length > 0,
  lprConsequences.map((c) => c.domain),
);
assert(
  'every residency consequence cites an authority the deciding pack owns',
  lprResidency.every((c) => c.cite.authority.includes(packAuthority)),
  lprResidency.map((c) => c.cite.authority),
);
assert(
  'and carries that pack’s verified source link',
  lprResidency.every((c) => c.cite.source_url === resolveJurisdiction('VA')!.domicile.source_url),
  lprResidency.map((c) => c.cite.source_url),
);

console.log('');
console.log('A pack’s schema is not one jurisdiction’s vocabulary');

// `AidPack` is `typeof vaAid`, so Virginia's KEY NAMES are the shape every later pack must match.
// `va_student_provisions` and `vasa_priority_date` would have forced a Texas pack to file its
// provisions under a Virginia name. Values may say Virginia; keys are schema and may not.
function keyPathsIn(value: unknown, trail: string[] = []): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => keyPathsIn(v, trail));
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => [
    [...trail, k].join('.'),
    ...keyPathsIn(v, [...trail, k]),
  ]);
}
const jurisdictionalPacks = readdirSync(packsDir).filter((f) => /^[a-z]{2}-.*\.json$/.test(f));
const parochialKeys: string[] = [];
for (const file of jurisdictionalPacks) {
  const pack = JSON.parse(readFileSync(join(packsDir, file), 'utf8'));
  // The pack's OWN code, not any code. A bare `id` key is Idaho's code and nobody's abbreviation,
  // and `state_provisions.id` must stay legal — the test has to tell "named after itself" from
  // "happens to collide with some state", which is the same distinction humanizeId draws.
  const own = String(pack.jurisdiction).toLowerCase();
  const parochial = new RegExp(`^${own}([a-z]{2})?_`);
  for (const path of keyPathsIn(pack)) {
    const key = path.split('.').at(-1)!;
    if (parochial.test(key)) parochialKeys.push(`${file}: ${path}`);
  }
}
assert(
  `no key in the ${jurisdictionalPacks.length} jurisdiction packs is named after a jurisdiction`,
  parochialKeys.length === 0,
  parochialKeys,
);

console.log('');
console.log('Prose is read from the pack, not typed beside it');

// humanizeId used to hardcode 'va' -> 'VA'. The fix is not "uppercase any two-letter token" —
// "id", "in", "or" and "me" are all state codes and all plausible id fragments — it is "uppercase
// the token this PACK abbreviates itself with", which is a fact the pack states.
assert(
  'a pack’s own code is read as an initialism',
  humanizeId('va_income_tax_filed', 'VA') === 'VA income tax filed',
  humanizeId('va_income_tax_filed', 'VA'),
);
assert(
  'another jurisdiction’s code is not',
  humanizeId('va_income_tax_filed', 'TX') === 'Va income tax filed',
  humanizeId('va_income_tax_filed', 'TX'),
);
assert(
  'an id that merely looks like a code is left alone',
  humanizeId('id_document_on_file', 'VA') === 'Id document on file',
  humanizeId('id_document_on_file', 'VA'),
);

// The gate's "no intent factors" unknown used to name Virginia's factors from inside the engine,
// so it would have asked a Texas student about VA tax filing.
const vaCitizen: Student = {
  ...f1Student('VA'),
  immigration: { status: 'citizen', prior_statuses: [] },
};
const noFactors = residencyFindingFor(jurisdictionFor(vaCitizen), {
  student: vaCitizen,
  events: [],
  intentFactors: [],
  allegedEntitlementDate: '2024-08-26',
});
const factorQuestion = noFactors.unknowns.map((u) => u.what).join(' ');
// intent_factors is optional on the schema now — not every jurisdiction enumerates them. Virginia
// does, and a Virginia pack that stopped would be a regression this assertion should catch.
const vaIntentFactors = resolveJurisdiction('VA')!.domicile.intent_factors ?? [];
assert('Virginia still enumerates intent factors', vaIntentFactors.length > 0);
const vaFactorIds = vaIntentFactors.map((f) => f.id);
assert(
  'the gate asks about the pack’s own intent factors',
  vaFactorIds.some((id) => factorQuestion.includes(humanizeId(id, 'VA'))),
  factorQuestion,
);
assert(
  'and names no factor the pack does not list',
  !factorQuestion.includes('tax filing'),
  factorQuestion,
);

console.log('');
console.log('No screen names a jurisdiction PathWise has modelled');

// The engines were parameterised before the screens were, so "Virginia" survived in prose that the
// router had already made wrong: a `DOMAIN_LABEL` reading "Residency (Virginia)", a hero with four
// hardcoded Virginia strings, a timeline row asserting a domicile rule for any state. Every one of
// those renders under whatever name the resolver produced, so the falsehood is invisible until a
// second pack exists. /coverage is exempt: it is the rulepack viewer, and naming the pack it is
// displaying is its entire job.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}
function tsxFilesIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return e.name === 'coverage' ? [] : tsxFilesIn(full);
    return e.name.endsWith('.tsx') ? [full] : [];
  });
}
const screenFiles = [
  ...tsxFilesIn(join(process.cwd(), 'app')),
  ...tsxFilesIn(join(process.cwd(), 'components')),
];
const modelledNames = JURISDICTIONS.filter((j) => isModelled(j.code)).map((j) => j.name);
const namingScreens: string[] = [];
for (const file of screenFiles) {
  const src = stripComments(readFileSync(file, 'utf8'));
  for (const name of modelledNames) {
    if (src.includes(name)) namingScreens.push(`${file.split(/[\\/]/).slice(-2).join('/')}: ${name}`);
  }
}
assert(
  `none of the ${screenFiles.length} screens hardcodes a modelled jurisdiction's name`,
  namingScreens.length === 0,
  namingScreens,
);

console.log('');
console.log('Routing is a property of the engines, not of any screen');

const txStudent = f1Student('TX');
const txJx = jurisdictionFor(txStudent);
const vaJx = jurisdictionFor(vaStudent);

assert('a Texas student resolves to no packs', txJx.packs === undefined);
assert('a Virginia student resolves to packs', vaJx.packs !== undefined);
// The type-level guarantee: with no pack there is no cite to render, so a screen has nothing to
// leak rather than merely being trusted not to leak it.
assert('a Texas student carries no display citations at all', txJx.display === undefined, txJx.display);
assert('a Virginia student does carry them', vaJx.display?.residencyCite === GATE_DISPLAY_CITE);
assert('the resolved duration is the pack’s, not a constant', vaJx.display?.durationDays === 365);

// The findings a screen would actually render, through the real entry point rather than by calling
// the unmodelled builders directly. This is what /check used to decide for itself.
const routedTxResidency = residencyFindingFor(txJx, {
  student: txStudent,
  events: [],
  intentFactors: [],
  allegedEntitlementDate: '2024-08-26',
});
const routedTxAid = aidFindingFor(txJx, {
  student: txStudent,
  deadlines: { asOf: '2024-08-26' },
});

assert('routed Texas residency is unable_to_verify', routedTxResidency.result === 'unable_to_verify');
assert('routed Texas aid is unable_to_verify', routedTxAid.result === 'unable_to_verify');
assert(
  'no Virginia authority survives the routed Texas path',
  borrowedAuthorityIn(JSON.stringify([routedTxResidency, routedTxAid]), 'Texas') === undefined,
);
assert(
  'the routed Texas finding still links the official THECB source',
  routedTxResidency.rule_citation.source_url === 'https://www.highered.texas.gov/texas-residency/',
  routedTxResidency.rule_citation.source_url,
);

// A student with no jurisdiction on record is not silently treated as being in the modelled one.
const noState: Student = { ...f1Student('VA'), jurisdiction_history: [] };
const noStateJx = jurisdictionFor(noState);
assert('a student with no jurisdiction on record gets no packs', noStateJx.packs === undefined);
assert('and no citations', noStateJx.display === undefined);

// Every routed jurisdiction, not just the two named above.
const routingProblems: string[] = [];
for (const j of JURISDICTIONS) {
  const jx = jurisdictionForCode(j.code);
  const modelled = isModelled(j.code);
  if (Boolean(jx.packs) !== modelled) routingProblems.push(`${j.code}: packs/modelled disagree`);
  if (Boolean(jx.display) !== modelled) routingProblems.push(`${j.code}: display/modelled disagree`);
  if (modelled) continue;
  const f = residencyFindingFor(jx, {
    student: f1Student(j.code),
    events: [],
    intentFactors: [],
    allegedEntitlementDate: '2024-08-26',
  });
  if (f.result !== 'unable_to_verify') routingProblems.push(`${j.code}: routed result ${f.result}`);
  const borrowed = borrowedAuthorityIn(JSON.stringify(f), j.name);
  if (borrowed) routingProblems.push(`${j.code}: routed finding borrowed "${borrowed}"`);
}
assert(
  `all ${JURISDICTIONS.length} jurisdictions route consistently with the registry`,
  routingProblems.length === 0,
  routingProblems,
);

console.log('');
console.log('No screen gives aid advice its own engine contradicts');

// The bug: the dashboard's aid card and /check's both ended "File the FAFSA path instead", typed
// into the screen. The aid engine says the opposite — the status block sits INSIDE the
// form-selection rule, so it closes the FAFSA route along with the state one — and it says so on
// the finding-detail page one click away. So the card recommended a form, the "See full reasoning"
// link under it refused the same form, and the wrong one of the two was the one on the demo path.
//
// The rule this locks is not "don't say FAFSA". It is that no screen may name a form at all: which
// forms exist and whether a status closes them is the aid pack's answer, and a screen that names
// one has re-derived it. Both cards now render selectAidForm's own strings, routed through
// aidFormFor so they cannot be reached without the pack that decided them.

const vaAidForm = aidFormFor(vaJx, vaStudent);
assert('an F-1 student in a modelled state gets a form selection', vaAidForm !== undefined);
assert(
  'and it is that NEITHER form opens state aid — not "file the FAFSA"',
  vaAidForm?.form === 'none',
  vaAidForm?.form,
);
assert(
  'the selection carries the route that IS still open, for a card to render',
  !!vaAidForm?.remains && vaAidForm.remains.length > 0,
  vaAidForm?.remains,
);
assert(
  'and the long reason ends with that same string, so the two cannot drift',
  !!vaAidForm?.remains && vaAidForm.reason.endsWith(vaAidForm.remains),
  vaAidForm?.reason,
);
assert(
  'an unmodelled state gets no form selection at all — there is none to recommend',
  aidFormFor(txJx, txStudent) === undefined,
);

// A student the block does not reach still gets an answer, and it is the affirmative one.
const vaCitizenForm = aidFormFor(jurisdictionFor(vaCitizen), vaCitizen);
assert('a citizen in the same state is told to file', vaCitizenForm?.form === 'FAFSA', vaCitizenForm?.form);
assert('and carries no "what remains" — nothing has been closed', vaCitizenForm?.remains === undefined);

// The source-level half. `screenFiles` and `stripComments` are the same scan the jurisdiction-name
// check above uses; comments are stripped first so the ones explaining this fix don't trip it.
const formWords = ['FAFSA', 'VASA'];
const namingForms: string[] = [];
for (const file of screenFiles) {
  const src = stripComments(readFileSync(file, 'utf8'));
  for (const word of formWords) {
    if (src.includes(word)) namingForms.push(`${file.split(/[\\/]/).slice(-2).join('/')}: ${word}`);
  }
}
assert(
  `none of the ${screenFiles.length} screens names an aid form in its own prose`,
  namingForms.length === 0,
  namingForms,
);

console.log('');
console.log('A misregistered pack is loud, not silently authoritative');

// resolveJurisdiction is the seam REGISTRY is edited through, and a pack filed under the wrong code
// would make every engine below it confidently wrong about a state. The router refuses to build a
// context for one rather than letting it reach a finding.
const vaPacks = resolveJurisdiction('VA')!;
assert('the Virginia packs declare Virginia', vaPacks.domicile.jurisdiction === 'VA' && vaPacks.aid.jurisdiction === 'VA');

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASSED — no state wears another state’s citation, and Virginia is unchanged.');
  process.exit(0);
} else {
  console.error(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
