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
// The unmodelled exemplar below is Ohio rather than Texas, because Texas is now one of the states
// that IS modelled — which is itself the proof that the seam holds under more than one pack.
//
// So the assertions come in two halves that matter equally:
//   1. An unmodelled jurisdiction yields `unable_to_verify`, names no other state's authority, and
//      carries a source link wherever coverage.json has a verified one.
//   2. Virginia's findings are byte-for-byte what they were before the resolver existed. A fix that
//      quietly moved the demo's numbers or citations would be a worse bug than the one it fixed.

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  assertDefaultIsRegistered,
  DEFAULT_CHECK_JURISDICTION,
  describeUnmodelled,
  isModelled,
  MODELLED_CODES,
  REGISTERED_PACKS,
  resolveJurisdiction,
} from '../rulepacks';
import { formatDecidingBody, formatDecidingOffice } from '../format';
import {
  unmodelledAidFinding,
  unmodelledResidencyFinding,
} from '../engines/unmodelled-jurisdiction';
import {
  aidDeadlineFor,
  aidFindingFor,
  aidFormFor,
  currentJurisdictionCode,
  domicileAnalysisFor,
  jurisdictionFor,
  jurisdictionForCode,
  residencyFindingFor,
} from '../engines/jurisdiction';
import { computeCptLedger } from '../engines/cpt-ledger';
import { applyLifeEvent } from '../engines/consequence-engine';
import { humanizeId, isUsableDate } from '../engines/domicile-gate';
import { UNLISTED_REGISTRATIONS } from '../jurisdiction-coverage';
import { JURISDICTIONS, jurisdictionByCode } from '../coverage';
import { priyaJobOffer } from '../fixtures/priya';
import type { Finding, Student } from '../types';
import type { IntentFactorFact } from '../engines/domicile-gate';

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
assert('Ohio is not modelled', !isModelled('OH'));
assert('an unknown code is not modelled', !isModelled('ZZ'));

console.log('');
console.log('An unmodelled jurisdiction gets an honest finding, not a borrowed one');

const oh = describeUnmodelled('OH');
assert('Ohio is describable as unmodelled', oh !== undefined, oh);
assert('a modelled jurisdiction is not describable as unmodelled', describeUnmodelled('VA') === undefined);
assert('a code absent from coverage.json is distinguishable from a gap', describeUnmodelled('ZZ') === undefined);

const ohResidency = unmodelledResidencyFinding(oh!);
const ohAid = unmodelledAidFinding(oh!);

assert('Ohio residency is unable_to_verify', ohResidency.result === 'unable_to_verify', ohResidency.result);
assert('Ohio aid is unable_to_verify', ohAid.result === 'unable_to_verify', ohAid.result);
assert(
  'Ohio residency is never "ineligible" — only a real pack can reach a determinate answer',
  ohResidency.result !== 'ineligible',
);
assert('Ohio headline names Ohio', ohResidency.headline.includes('Ohio'), ohResidency.headline);
assert(
  'Ohio carries the verified official source link',
  ohResidency.rule_citation.source_url === 'https://highered.ohio.gov/',
  ohResidency.rule_citation.source_url,
);
assert(
  'Ohio still names the office that decides',
  ohResidency.deciding_office === 'domicile_officer',
  ohResidency.deciding_office,
);
assert('Ohio states what it does not know', ohResidency.unknowns.length > 0);

// The heart of it: no Virginia authority may appear anywhere in a Ohio finding.
const ohText = JSON.stringify([ohResidency, ohAid]);
assert('no SCHEV citation leaks into a Ohio finding', !ohText.includes('SCHEV'), ohText.slice(0, 200));
assert('no Virginia reference leaks into a Ohio finding', !/Virginia/.test(ohText));
assert('the Virginia gate cite does not appear', !ohText.includes(GATE_DISPLAY_CITE));

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

// Claim #2c — the consequence engine obeys the same classification boundary as the two engines
// that read the same record. `gateStatuses` is a blacklist, so "not gated" was being read here as
// "the residency door is open", and this engine asserted that the one-year clock would start today
// for a status domicile and aid both answer `unable_to_verify` for.
//
// The direction is the whole point: unclassified is NOT barred. It must not borrow the gate's
// "blocks domicile entirely" sentence, and it must not assert the positive consequence either.
{
  const vaUnclassified: Student = {
    ...f1Student('VA'),
    immigration: { status: 'other', prior_statuses: [] },
  };
  const unclassified = applyLifeEvent(vaUnclassified, priyaJobOffer, jurisdictionFor(vaUnclassified))
    .filter((c) => c.domain === 'residency');

  assert(
    'an unclassified status still gets a residency consequence — silence would be its own bug',
    unclassified.length > 0,
  );
  assert(
    'but it never asserts one: applies is false for every residency consequence',
    unclassified.every((c) => !c.applies),
    unclassified.map((c) => c.applies),
  );
  assert(
    'and the determinate clock sentence is gone',
    !/clock would start|clock_started/.test(JSON.stringify(unclassified)),
    unclassified.map((c) => c.effect),
  );
  assert(
    'and it does NOT borrow the gate’s bar — unclassified is unread, not barred',
    // Says what it HAS not done, and says outright that this is not a bar. The gate's own
    // "blocks … domicile entirely" sentence must not appear on a status nobody ruled on.
    !/blocks .* domicile entirely/.test(unclassified.map((c) => c.effect).join(' ')) &&
      unclassified.every(
        (c) => /has not read/.test(c.effect) && /not a finding that the status is barred/.test(c.effect),
      ),
    unclassified.map((c) => c.effect),
  );
  assert(
    'and it cites the pack’s own classification section, not a sentence composed here',
    unclassified.every((c) => c.cite.authority.includes(resolveJurisdiction('VA')!.domicile.authority)),
    unclassified.map((c) => c.cite.authority),
  );

  // The two halves that must NOT move.
  const f1Res = applyLifeEvent(f1Student('VA'), priyaJobOffer, jurisdictionFor(f1Student('VA')))
    .filter((c) => c.domain === 'residency');
  assert(
    'F-1 keeps the gate’s own reasoned negative, unchanged',
    f1Res.length > 0 && f1Res.every((c) => !c.applies) &&
      f1Res.some((c) => /blocks .* domicile entirely/.test(c.effect)),
    f1Res.map((c) => c.effect),
  );
  assert(
    'a positively classified status (LPR) keeps its affirmative consequence',
    lprResidency.length > 0 && lprResidency.every((c) => c.applies),
    lprResidency.map((c) => c.applies),
  );

  // A pack that states no classification claims nothing about its reach, so it must be untouched.
  if (isModelled('TX')) {
    const txUnclassified: Student = {
      ...f1Student('TX'),
      immigration: { status: 'other', prior_statuses: [] },
    };
    const tx = applyLifeEvent(txUnclassified, priyaJobOffer, jurisdictionForCode('TX'))
      .filter((c) => c.domain === 'residency');
    assert(
      'Texas states no classification, so its consequences are unchanged',
      tx.length > 0 && tx.every((c) => c.applies),
      tx.map((c) => c.applies),
    );
  }
}

console.log('');
console.log('A pack’s schema is not one jurisdiction’s vocabulary');

// `AidPack` is `typeof vaAid`, so Virginia's KEY NAMES are the shape every later pack must match.
// `va_student_provisions` and `vasa_priority_date` would have forced a Ohio pack to file its
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
  humanizeId('va_income_tax_filed', 'OH') === 'Va income tax filed',
  humanizeId('va_income_tax_filed', 'OH'),
);
assert(
  'an id that merely looks like a code is left alone',
  humanizeId('id_document_on_file', 'VA') === 'Id document on file',
  humanizeId('id_document_on_file', 'VA'),
);

// The gate's "no intent factors" unknown used to name Virginia's factors from inside the engine,
// so it would have asked a Ohio student about VA tax filing.
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

const txStudent = f1Student('OH');
const txJx = jurisdictionFor(txStudent);
const vaJx = jurisdictionFor(vaStudent);

assert('a Ohio student resolves to no packs', txJx.packs === undefined);
assert('a Virginia student resolves to packs', vaJx.packs !== undefined);
// The type-level guarantee: with no pack there is no cite to render, so a screen has nothing to
// leak rather than merely being trusted not to leak it.
assert('a Ohio student carries no display citations at all', txJx.display === undefined, txJx.display);
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

assert('routed Ohio residency is unable_to_verify', routedTxResidency.result === 'unable_to_verify');
assert('routed Ohio aid is unable_to_verify', routedTxAid.result === 'unable_to_verify');
assert(
  'no Virginia authority survives the routed Ohio path',
  borrowedAuthorityIn(JSON.stringify([routedTxResidency, routedTxAid]), 'Ohio') === undefined,
);
assert(
  'the routed Ohio finding still links the official the Ohio Department of Higher Education source',
  routedTxResidency.rule_citation.source_url === 'https://highered.ohio.gov/',
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


// ---------------------------------------------------------------------------------------------
console.log('');
console.log("N x N: no jurisdiction wears any other jurisdiction's name, authority or citation");
// ---------------------------------------------------------------------------------------------
//
// The original single check compared one modelled state against one unmodelled one. With more than
// one pack registered that is no longer enough: every pack has to be checked against every OTHER
// pack, because the failure this guards against is symmetric and does not care which state was
// added last.
//
// It caught a real one the first time it ran, and not in the engines: the Texas pack's
// `start_rule_note` explained its clock BY CONTRASTING IT WITH VIRGINIA'S. That note is rendered as
// `rule_citation.text`, so a Texas student would have read the word "Virginia" on their own
// finding. The engines were routing perfectly; the leak was in the prose, which is exactly the
// place a routing test would not normally look.

const REGISTERED = REGISTERED_PACKS.map(({ code, packs }) => ({
  code,
  name: jurisdictionByCode(code)?.name ?? code,
  packs,
  // What this jurisdiction's own findings are ALLOWED to say — its name, its agencies, and the
  // abbreviations its packs use. Anything from another jurisdiction's list is a leak.
  marks: [
    jurisdictionByCode(code)?.name ?? code,
    ...packs.domicile.agencies.flatMap((a) => [a.name, a.short_name]),
    ...(packs.aid?.agencies.flatMap((a) => [a.name, a.short_name]) ?? []),
  ].filter((m) => m.length > 3),
}));

const nxnProblems: string[] = [];
for (const subject of REGISTERED) {
  const student: Student = {
    id: subject.code,
    immigration: { status: 'LPR', prior_statuses: [] },
    dob: '2000-01-01',
    institutions: [],
    jurisdiction_history: [{ state: subject.code, from: '2023-01-01' }],
  };
  const jx = jurisdictionFor(student);
  const findings = JSON.stringify([
    residencyFindingFor(jx, {
      student,
      events: [],
      intentFactors: [{ id: 'continuous_residence', date: '2024-01-01' }],
      allegedEntitlementDate: '2026-08-24',
    }),
    aidFindingFor(jx, { student, deadlines: { asOf: '2026-07-28' } }),
  ]);

  // Remove this jurisdiction's OWN marks before looking, so "West Virginia" containing "Virginia"
  // and "THECB" containing "THEC" cannot be reported as leaks.
  let scrubbed = findings;
  for (const own of subject.marks) scrubbed = scrubbed.split(own).join('«own»');

  for (const other of REGISTERED) {
    if (other.code === subject.code) continue;
    for (const mark of other.marks) {
      if (scrubbed.includes(mark)) {
        nxnProblems.push(`${subject.code} finding contains ${other.code}'s "${mark}"`);
      }
    }
  }
}
assert(
  `all ${REGISTERED.length} registered jurisdictions x ${REGISTERED.length - 1} others: nothing borrowed`,
  nxnProblems.length === 0,
  nxnProblems,
);

// And the arithmetic is the pack's, not a shared constant. Virginia counts from the LAST qualifying
// intent factor; Texas from the START of continuous presence. Same 365 days, different answer over
// an identical record — which is the whole point of dispatching on the pack's own start rule.
{
  const factors = [
    { id: 'continuous_residence', date: '2024-01-01' },
    { id: 'drivers_license', date: '2025-06-01' },
  ];
  const starts: Record<string, string | undefined> = {};
  for (const code of ['VA', 'TX']) {
    if (!isModelled(code)) continue;
    const student: Student = {
      id: code,
      immigration: { status: 'LPR', prior_statuses: [] },
      dob: '2000-01-01',
      institutions: [],
      jurisdiction_history: [{ state: code, from: '2023-01-01' }],
    };
    const jx = jurisdictionFor(student);
    starts[code] = domicileAnalysisFor(jx, {
      student,
      events: [],
      intentFactors: factors,
      allegedEntitlementDate: '2026-08-24',
    }).clock?.clockStart;
  }
  assert(
    'Virginia counts from the LAST qualifying factor',
    starts.VA === '2025-06-01',
    starts.VA,
  );
  assert(
    'Texas counts from the START of continuous presence — a different answer on the same record',
    starts.TX === '2024-01-01',
    starts.TX,
  );
  assert('and the two genuinely differ', starts.VA !== starts.TX, starts);
}

// A jurisdiction with no durational rule gets no clock, and is never told it is short of a period
// its own law does not impose.
if (isModelled('TN')) {
  const student: Student = {
    id: 'TN',
    immigration: { status: 'LPR', prior_statuses: [] },
    dob: '2000-01-01',
    institutions: [],
    jurisdiction_history: [{ state: 'TN', from: '2023-01-01' }],
  };
  const jx = jurisdictionFor(student);
  assert('Tennessee resolves to no durational requirement', jx.display?.durationDays === undefined);
  const f = residencyFindingFor(jx, {
    student,
    events: [],
    intentFactors: [],
    allegedEntitlementDate: '2026-08-24',
  });
  assert(
    'and its finding never quotes a day count',
    !/\d{2,4}[- ]day/.test(JSON.stringify(f)),
    f.headline,
  );
}


// ---------------------------------------------------------------------------------------------
console.log('');
console.log('The five verification findings, each pinned so it cannot come back');
// ---------------------------------------------------------------------------------------------

// ---- 1. /check opens on Virginia, whatever else is registered ----
//
// The default was `MODELLED_CODES[0]`, which is coverage-file order — alphabetical — so registering
// Tennessee and Texas moved it from Virginia to Tennessee without anyone touching /check, and a
// visitor's first check went from the full cross-domain finding to "PathWise has not modelled
// Tennessee state aid rules". These assertions exist so a fiftieth pack cannot do that again.
assertDefaultIsRegistered();
assert('the /check default is Virginia', DEFAULT_CHECK_JURISDICTION === 'VA', DEFAULT_CHECK_JURISDICTION);
assert(
  'the default is a jurisdiction the engines can actually answer for',
  isModelled(DEFAULT_CHECK_JURISDICTION),
);
assert(
  'and it does not track whatever sorts first among the modelled codes',
  MODELLED_CODES.length === 1 || MODELLED_CODES[0] !== DEFAULT_CHECK_JURISDICTION,
  { modelledOrder: [...MODELLED_CODES], default: DEFAULT_CHECK_JURISDICTION },
);
{
  // Why Virginia: it is the only jurisdiction modelled in BOTH domains, which is what makes the
  // cross-domain demonstration possible at all.
  const s: Student = {
    id: 'd',
    immigration: { status: 'F1', prior_statuses: [] },
    dob: '2000-01-01',
    institutions: [],
    jurisdiction_history: [{ state: DEFAULT_CHECK_JURISDICTION, from: '2026-07-28' }],
  };
  const jx = jurisdictionFor(s);
  const res = residencyFindingFor(jx, {
    student: s, events: [], intentFactors: [], allegedEntitlementDate: '2026-07-28',
  });
  const aid = aidFindingFor(jx, { student: s, deadlines: { asOf: '2026-07-28' } });
  assert(
    'the default jurisdiction still produces the cross-domain finding (both doors closed)',
    res.result === 'ineligible' && aid.result === 'ineligible',
    { residency: res.result, aid: aid.result },
  );
}

// ---- 2. Every residency finding can show a citation, gated or not ----
//
// `display.residencyCite` came from `gates[0].display_cite`, so a gateless pack resolved to '' and
// the residency card rendered NO citation chip — on a product whose promise is that every finding
// shows its regulation.
for (const { code, packs } of REGISTERED_PACKS) {
  const jx = jurisdictionForCode(code);
  assert(
    `${code}: has an abbreviated residency citation to display (${packs.domicile.gates.length} gate(s))`,
    (jx.display?.residencyCite ?? '').length > 0,
    jx.display?.residencyCite,
  );
  const s: Student = {
    id: code,
    immigration: { status: 'LPR', prior_statuses: [] },
    dob: '2000-01-01',
    institutions: [],
    jurisdiction_history: [{ state: code, from: '2023-01-01' }],
  };
  const f = residencyFindingFor(jx, {
    student: s, events: [], intentFactors: [], allegedEntitlementDate: '2026-08-24',
  });
  assert(
    `${code}: and its residency finding carries a full authority line`,
    f.rule_citation.authority.length > 0,
    f.rule_citation.authority,
  );
}
assert(
  'Virginia still shows its GATE abbreviation, not a pack-level fallback',
  jurisdictionForCode('VA').display?.residencyCite === 'SCHEV Pt II §03(A)',
  jurisdictionForCode('VA').display?.residencyCite,
);

// ---- 3 and 4. The deciding body is named as specifically as the pack allows ----
{
  // A named ROLE is never substituted, however specific the pack's agencies are. Virginia's pack
  // names SCHEV, and SCHEV really does set Virginia's criteria — but the domicile officer is who
  // rules on the student's case, and they are not the same body.
  const vaPacks = resolveJurisdiction('VA')!;
  assert(
    'Virginia still reads "Domicile Officer" even though its pack names SCHEV',
    formatDecidingBody('domicile_officer', vaPacks.domicile.agencies, 'residency') === 'Domicile Officer',
    formatDecidingBody('domicile_officer', vaPacks.domicile.agencies, 'residency'),
  );

  const tnPacks = resolveJurisdiction('TN');
  if (tnPacks) {
    const tnFinding = residencyFindingFor(jurisdictionForCode('TN'), {
      student: {
        id: 'tn',
        immigration: { status: 'LPR', prior_statuses: [] },
        dob: '2000-01-01',
        institutions: [],
        jurisdiction_history: [{ state: 'TN', from: '2023-01-01' }],
      },
      events: [],
      intentFactors: [],
      allegedEntitlementDate: '2026-08-24',
    });
    assert(
      'Tennessee carries the generic office in its DATA',
      tnFinding.deciding_office === 'state_higher_ed_agency',
      tnFinding.deciding_office,
    );
    const rendered = formatDecidingBody(tnFinding.deciding_office, tnPacks.domicile.agencies, 'residency');
    assert(
      'but RENDERS the body its own pack names',
      rendered.includes('Tennessee Higher Education Commission') && rendered.includes('THEC'),
      rendered,
    );
    assert(
      'and no jurisdiction name is hardcoded in the label map',
      formatDecidingOffice('state_higher_ed_agency') === 'State Higher-Education Agency',
      formatDecidingOffice('state_higher_ed_agency'),
    );
  }

  assert(
    'with no agencies at all it falls back to the generic label',
    formatDecidingBody('state_higher_ed_agency', undefined, 'residency') === 'State Higher-Education Agency',
  );
  assert(
    'and when no agency decides this domain',
    formatDecidingBody(
      'state_higher_ed_agency',
      [{ id: 'x', name: 'X Board', short_name: 'XB', decides: ['aid'] }],
      'residency',
    ) === 'State Higher-Education Agency',
  );

  // Label register: standalone labels are Title Case with no article. The SENTENCE register lives
  // in OFFICE_PROSE (engines/next-steps.ts) and is deliberately different, because "decided by your
  // DSO" needs the article that "Decided by: Domicile Officer" must not have.
  const labels = (
    ['DSO', 'registrar', 'domicile_officer', 'financial_aid', 'USCIS', 'SEVP', 'state_higher_ed_agency'] as const
  ).map((o) => formatDecidingOffice(o));
  assert(
    'every standalone office label is Title Case with no leading article',
    labels.every((l) => !/^(the|a|an) /.test(l) && /^[A-Z]/.test(l)),
    labels,
  );
}

// ---- 5. A jurisdiction that counts continuous presence can actually run its clock ----
//
// /check hardcoded `intentFactors: []`, so no durational clock could ever start there and Texas's
// rule was unreachable through the UI. The fix adds ONE optional date, and it must stay fail-closed.
{
  const mk = (code: string): Student => ({
    id: code,
    immigration: { status: 'LPR', prior_statuses: [] },
    dob: '2000-01-01',
    institutions: [],
    jurisdiction_history: [{ state: code, from: '2023-01-01' }],
  });
  const ENTITLEMENT = '2026-08-24';

  if (isModelled('TX')) {
    const none = residencyFindingFor(jurisdictionForCode('TX'), {
      student: mk('TX'), events: [], intentFactors: [], allegedEntitlementDate: ENTITLEMENT,
    });
    assert(
      'Texas with NO continuous-presence fact is unable_to_verify',
      none.result === 'unable_to_verify',
      none.result,
    );

    const withFact = domicileAnalysisFor(jurisdictionForCode('TX'), {
      student: mk('TX'),
      events: [],
      intentFactors: [{ id: 'continuous_residence', date: '2024-01-01' }],
      allegedEntitlementDate: ENTITLEMENT,
    });
    assert(
      'Texas with the fact starts its clock at that date',
      withFact.clock?.clockStart === '2024-01-01',
      withFact.clock?.clockStart,
    );
    assert(
      'and the duration is satisfied for a 2026 term',
      withFact.clock?.meetsDuration === true,
      withFact.clock,
    );
  }

  if (isModelled('VA') && isModelled('TX')) {
    const two = [
      { id: 'continuous_residence', date: '2024-01-01' },
      { id: 'drivers_license', date: '2025-06-01' },
    ];
    const va = domicileAnalysisFor(jurisdictionForCode('VA'), {
      student: mk('VA'), events: [], intentFactors: two, allegedEntitlementDate: ENTITLEMENT,
    });
    const tx = domicileAnalysisFor(jurisdictionForCode('TX'), {
      student: mk('TX'), events: [], intentFactors: two, allegedEntitlementDate: ENTITLEMENT,
    });
    assert('Virginia counts from the LAST qualifying factor', va.clock?.clockStart === '2025-06-01', va.clock?.clockStart);
    assert('Texas counts from the START of continuous presence', tx.clock?.clockStart === '2024-01-01', tx.clock?.clockStart);
    assert('the same record therefore gives two different answers', va.clock?.clockStart !== tx.clock?.clockStart);
  }

  if (isModelled('TN')) {
    const tn = domicileAnalysisFor(jurisdictionForCode('TN'), {
      student: mk('TN'),
      events: [],
      intentFactors: [{ id: 'continuous_residence', date: '2024-01-01' }],
      allegedEntitlementDate: ENTITLEMENT,
    });
    assert('Tennessee still has no clock even when given the fact', tn.clock === undefined, tn.clock);
  }
}


// ---------------------------------------------------------------------------------------------
console.log('');
console.log('Phase 7 — the presentation layer cannot claim more than the engines established');
// ---------------------------------------------------------------------------------------------

// ---- A. No negative aid claim without an aid pack behind it ----
//
// /check guarded its aid card on `jx.unmodelled`, which is set only when a jurisdiction has NO
// packs. Phase 6 made `aid` optional per jurisdiction, so Tennessee and Texas — residency modelled,
// aid not — fell through the gap and the card printed "PathWise has not modelled Tennessee state
// aid rules" as its status and "Your status does not block state aid" as its detail, together. A
// negative regulatory claim about a rule PathWise has never read, with no citation attached.
{
  const FORBIDDEN = [
    'does not block state aid',
    'status does not block',
    'not blocked by status',
  ];
  const problems: string[] = [];

  for (const { code, packs } of REGISTERED_PACKS) {
    if (packs.aid) continue; // has aid rules — a claim about them is earned
    const s: Student = {
      id: code,
      immigration: { status: 'F1', prior_statuses: [] },
      dob: '2000-01-01',
      institutions: [],
      jurisdiction_history: [{ state: code, from: '2026-07-28' }],
    };
    const jx = jurisdictionFor(s);
    const aid = aidFindingFor(jx, { student: s, deadlines: { asOf: '2026-07-28' } });

    // The card's own inputs: with no aid pack there is no form selection to recommend, and the
    // headline must say the rules are not modelled rather than describing them.
    if (aidFormFor(jx, s) !== undefined) problems.push(`${code}: aidFormFor returned a form with no aid pack`);
    if (aid.result !== 'unable_to_verify') problems.push(`${code}: aid result is ${aid.result}, expected unable_to_verify`);
    for (const phrase of FORBIDDEN) {
      if (aid.headline.toLowerCase().includes(phrase)) problems.push(`${code}: headline claims "${phrase}"`);
    }
    if (!aid.headline.includes(jx.name)) problems.push(`${code}: headline does not name the jurisdiction`);
  }
  assert(
    'a jurisdiction with no aid pack makes no claim about whether status blocks aid',
    problems.length === 0,
    problems,
  );

  // The status line and the detail branch are driven by the same condition, so they cannot
  // contradict. This asserts the condition itself is per-DOMAIN, not per-jurisdiction.
  const tn = jurisdictionForCode('TN');
  if (tn.packs) {
    assert(
      'Tennessee has residency rules but no aid rules — the case the guard must distinguish',
      tn.packs.domicile !== undefined && tn.packs.aid === undefined,
    );
    assert(
      'and jx.unmodelled is NOT set for it, which is why a per-jurisdiction guard missed it',
      tn.unmodelled === undefined,
    );
  }
}

// ---- E. Every registered jurisdiction can link the source it was authored against ----
for (const { code, packs } of REGISTERED_PACKS) {
  assert(
    `${code}: its domicile pack carries the source it was authored against`,
    packs.domicile.source_url.startsWith('https://'),
    packs.domicile.source_url,
  );
}

// ---- B. Factor validation, and gate/analysis parity ----
//
// runDomicileGate handed `intentFactors` straight to the clock with no check, so any id started it:
// `{ id: 'i_simply_declare_myself_a_resident' }` returned "Domicile duration of 365 days appears
// satisfied". The full analysis had always refused the same input. One pack and one record produced
// two contradictory answers depending only on which entry point was used.
{
  const mk = (code: string, status: 'LPR' | 'citizen' = 'LPR'): Student => ({
    id: code,
    immigration: { status, prior_statuses: [] },
    dob: '2000-01-01',
    institutions: [],
    jurisdiction_history: [{ state: code, from: '2023-01-01' }],
  });
  const E = '2026-08-24';
  const started = (f: Finding) => /duration|clock started|earliest/.test(f.headline);

  // An invented id counts for nothing, on every registered pack.
  for (const { code, packs } of REGISTERED_PACKS) {
    if (!packs.domicile.clock) continue; // no clock to start
    const f = residencyFindingFor(jurisdictionForCode(code), {
      student: mk(code),
      events: [],
      intentFactors: [{ id: 'i_simply_declare_myself_a_resident', date: '2024-01-01' }],
      allegedEntitlementDate: E,
    });
    assert(`${code}: an invented factor id does not start the clock`, !started(f), f.headline);
    assert(
      `${code}: and the ignored factor is surfaced rather than dropped in silence`,
      JSON.stringify(f).includes('i_simply_declare_myself_a_resident'),
    );
  }

  // Parity across every class of factor a pack can define.
  const CASES: { label: string; code: string; status: 'LPR' | 'citizen'; factors: IntentFactorFact[] }[] = [
    { label: 'invented id', code: 'VA', status: 'LPR', factors: [{ id: 'nope', date: '2024-01-01' }] },
    { label: 'genuine factor', code: 'VA', status: 'LPR', factors: [{ id: 'continuous_residence', date: '2024-01-01' }] },
    { label: 'inapplicable factor (non-citizen)', code: 'VA', status: 'LPR', factors: [{ id: 'voter_registration', date: '2024-01-01' }] },
    { label: 'same factor, applicable (citizen)', code: 'VA', status: 'citizen', factors: [{ id: 'voter_registration', date: '2024-01-01' }] },
    { label: 'caveat engaged', code: 'VA', status: 'LPR', factors: [{ id: 'employment', date: '2024-01-01', attrs: { is_coop: true } }] },
    { label: 'caveat not engaged', code: 'VA', status: 'LPR', factors: [{ id: 'employment', date: '2024-01-01', attrs: { is_coop: false } }] },
    { label: 'caveat UNRESOLVED', code: 'VA', status: 'LPR', factors: [{ id: 'employment', date: '2024-01-01' }] },
    { label: 'mixed good + invented', code: 'VA', status: 'LPR', factors: [{ id: 'continuous_residence', date: '2024-01-01' }, { id: 'nope', date: '2025-01-01' }] },
    { label: 'genuine factor', code: 'TX', status: 'LPR', factors: [{ id: 'continuous_residence', date: '2024-01-01' }] },
    { label: 'invented id', code: 'TX', status: 'LPR', factors: [{ id: 'nope', date: '2024-01-01' }] },
  ];

  const divergences: string[] = [];
  for (const c of CASES) {
    if (!isModelled(c.code)) continue;
    const jx = jurisdictionForCode(c.code);
    const gate = residencyFindingFor(jx, {
      student: mk(c.code, c.status), events: [], intentFactors: c.factors, allegedEntitlementDate: E,
    });
    const analysis = domicileAnalysisFor(jx, {
      student: mk(c.code, c.status), events: [], intentFactors: c.factors, allegedEntitlementDate: E,
    });
    const gateStarted = started(gate);
    const analysisStarted = Boolean(analysis.clock?.clockStart);
    if (gateStarted !== analysisStarted) {
      divergences.push(`${c.code} ${c.label}: gate=${gateStarted} analysis=${analysisStarted}`);
    }
  }
  assert(
    `gate and analysis agree on all ${CASES.length} factor cases — one pack, one record, one answer`,
    divergences.length === 0,
    divergences,
  );

  // The specific correction that mattered: an UNRESOLVED caveat must still count. Fail-closed is
  // about not asserting more than the rules support, not about refusing everything uncertain —
  // dropping it would understate a student's case on a fact nobody has established either way.
  const unresolved = domicileAnalysisFor(jurisdictionForCode('VA'), {
    student: mk('VA'), events: [],
    intentFactors: [{ id: 'employment', date: '2024-01-01' }],
    allegedEntitlementDate: E,
  });
  assert(
    'an unresolved caveat still counts toward the clock rather than being dropped',
    unresolved.clock?.clockStart === '2024-01-01',
    unresolved.clock?.clockStart,
  );

  // And the jurisdictions that must be unaffected by any of it.
  if (isModelled('TN')) {
    const tn = residencyFindingFor(jurisdictionForCode('TN'), {
      student: mk('TN'), events: [],
      intentFactors: [{ id: 'continuous_residence', date: '2024-01-01' }],
      allegedEntitlementDate: E,
    });
    assert('Tennessee stays gateless and clockless whatever is supplied', !/\d{2,4}[- ]day/.test(JSON.stringify(tn)));
  }
  if (isModelled('TX')) {
    const tx = domicileAnalysisFor(jurisdictionForCode('TX'), {
      student: mk('TX'), events: [],
      intentFactors: [{ id: 'continuous_residence', date: '2024-01-01' }],
      allegedEntitlementDate: E,
    });
    assert('Texas still accepts continuous_residence and runs its clock', tx.clock?.clockStart === '2024-01-01', tx.clock?.clockStart);
  }
}

console.log('');
console.log('An unclassified status fails CLOSED — and closed means "cannot verify", not "barred"');

// The defect: a gate is a BLACKLIST. Virginia's names F-1, J-1 and M-1, and "no gate matched" was
// being rendered as a durational answer — so a student who picked "Other" got "Domicile duration of
// 365 days appears satisfied" and "File the FAFSA — Virginia state aid is not blocked by status",
// byte-identical to a U.S. citizen's result, with zero open questions on the page. "Other" is not a
// status; it is the absence of one, and no clause in either pack can have been written about it.
//
// The guardrail these assertions exist to hold is the DIRECTION of the fix. Unclassified must reach
// `unable_to_verify` and never `ineligible`: inventing a bar with no source is the same error
// pointed the other way, and on the aid side it would deny a pathway Virginia actually keeps open.
{
  const ENT = '2026-08-05';
  const SINCE = '2023-01-01'; // comfortably past the 365-day clock
  const person = (status: string, state = 'VA'): Student => ({
    id: `t-${status}`,
    immigration: { status: status as Student['immigration']['status'], prior_statuses: [] },
    dob: '2000-01-01',
    institutions: [],
    jurisdiction_history: [{ state, from: '2020-01-01' }],
  });
  const residency = (status: string, state = 'VA'): Finding =>
    residencyFindingFor(jurisdictionForCode(state), {
      student: person(status, state),
      events: [],
      intentFactors: [{ id: 'continuous_residence', date: SINCE }],
      allegedEntitlementDate: ENT,
    });
  const aid = (status: string, state = 'VA'): Finding =>
    aidFindingFor(jurisdictionForCode(state), {
      student: person(status, state),
      deadlines: { asOf: ENT },
    });

  // Every member of the ImmigrationStatus union. Kept as a literal, then checked against the type,
  // so a status added to types.ts without being considered here is a COMPILE error rather than a
  // silently untested one.
  const ALL_STATUSES = [
    'citizen', 'LPR', 'LPR_applicant',
    'F1', 'J1', 'M1',
    'H4', 'DACA', 'TPS', 'undocumented', 'other',
  ] as const;
  const _exhaustive: Student['immigration']['status'][] = [...ALL_STATUSES];
  void _exhaustive;

  // The statuses the two Virginia packs declare they were authored against.
  const CLASSIFIED = ['citizen', 'LPR', 'F1', 'J1', 'M1'];
  const UNCLASSIFIED = ALL_STATUSES.filter((s) => !CLASSIFIED.includes(s));

  // ---- residency: the reachable case, in full ----
  const other = residency('other');
  assert('VA + Other residency is unable_to_verify', other.result === 'unable_to_verify', other.result);
  assert('VA + Other residency raises a non-empty unknown', other.unknowns.length > 0, other.unknowns.length);
  assert(
    'VA + Other residency no longer claims the duration is satisfied',
    !/appears satisfied|days of domicile appear/i.test(JSON.stringify(other)),
    other.headline,
  );
  assert(
    'VA + Other residency never says ineligible or blocked — unclassified is not a bar',
    other.result !== 'ineligible' && !/\bblock(s|ed)?\b|\bbarred\b|\bineligible\b/i.test(other.headline),
    other.headline,
  );
  assert(
    'VA + Other residency says in words that it is not a finding of a bar',
    /not a finding that the status is barred/i.test(JSON.stringify(other.reasoning_steps)),
  );
  assert(
    'VA + Other residency still names the deciding office',
    other.deciding_office === 'domicile_officer',
    other.deciding_office,
  );
  assert(
    'VA + Other residency cites the section the classification was read from',
    other.rule_citation.authority.includes('Section 02(4)'),
    other.rule_citation.authority,
  );
  assert(
    'VA + Other residency tells the reader what would resolve it',
    other.unknowns.every((u) => u.how_to_resolve.length > 0 && u.why_it_matters.length > 0),
  );

  // ---- aid: the reachable case, in full ----
  const otherAid = aid('other');
  const otherForm = aidFormFor(jurisdictionForCode('VA'), person('other'));
  assert('VA + Other aid is unable_to_verify', otherAid.result === 'unable_to_verify', otherAid.result);
  assert('VA + Other aid raises a non-empty unknown', otherAid.unknowns.length > 0, otherAid.unknowns.length);
  assert(
    'VA + Other aid no longer says state aid is not blocked by status',
    !/not blocked by status/i.test(JSON.stringify(otherAid)),
    otherAid.headline,
  );
  assert(
    'VA + Other aid never reaches ineligible — declining is not denying',
    otherAid.result !== 'ineligible',
    otherAid.result,
  );
  assert(
    'VA + Other aid form selection is undetermined, not "none"',
    otherForm?.form === 'undetermined',
    otherForm?.form,
  );
  assert(
    'VA + Other aid says the pathways stay open rather than closing them',
    !!otherForm?.remains && /still open/i.test(otherForm.remains),
    otherForm?.remains,
  );
  assert(
    'and the long reason ends with that same string, so the two cannot drift',
    !!otherForm?.remains && otherForm.reason.endsWith(otherForm.remains),
  );
  assert('VA + Other aid still names the deciding office', otherAid.deciding_office === 'financial_aid');

  // THE GUARDRAIL, stated as its own test. The forbidden fix is a citizen/LPR whitelist that denies
  // everyone else; the required one declines to answer for them. A non-citizen, non-LPR status must
  // never come back ineligible on either side.
  for (const status of UNCLASSIFIED) {
    const r = residency(status);
    const a = aid(status);
    assert(
      `${status}: unclassified reaches unable_to_verify on BOTH sides, never ineligible`,
      r.result === 'unable_to_verify' &&
        a.result === 'unable_to_verify' &&
        r.unknowns.length > 0 &&
        a.unknowns.length > 0,
      { residency: r.result, aid: a.result },
    );
  }

  // ---- the supported statuses are untouched. This is the half a fail-closed change breaks. ----
  for (const status of ['F1', 'J1', 'M1']) {
    const r = residency(status);
    const a = aid(status);
    assert(
      `${status}: still gated ineligible on residency, and still blocked on aid`,
      r.result === 'ineligible' && a.result === 'ineligible',
      { residency: r.result, aid: a.result },
    );
    assert(
      `${status}: still cites the gate, not the classification`,
      r.rule_id === 'va-domicile:eligible_alien_gate',
      r.rule_id,
    );
  }
  for (const status of ['citizen', 'LPR']) {
    const r = residency(status);
    const a = aid(status);
    assert(
      `${status}: still reaches the durational finding and the affirmative aid answer`,
      r.rule_id === 'va-domicile:clock' &&
        /appears satisfied/.test(r.headline) &&
        a.result === 'review_recommended' &&
        /not blocked by status/.test(a.headline),
      { residency: r.headline, aid: a.headline },
    );
  }

  // A status that is BOTH classified and gated must get the gate's determinate answer, not the
  // classification's "cannot verify" — the order of the two checks is load-bearing.
  assert(
    'the gate wins over the classification for a status that is in both',
    residency('F1').result === 'ineligible',
  );

  // ---- the two entry points must not disagree, which is why the check lives in the shared gate ----
  for (const status of ALL_STATUSES) {
    const gate = residency(status);
    const full = domicileAnalysisFor(jurisdictionForCode('VA'), {
      student: person(status),
      events: [],
      intentFactors: [{ id: 'continuous_residence', date: SINCE }],
      allegedEntitlementDate: ENT,
    });
    const bothUnverifiable =
      gate.rule_id === 'va-domicile:status-not-classified' &&
      full.finding.rule_id === 'va-domicile:status-not-classified';
    const neither =
      gate.rule_id !== 'va-domicile:status-not-classified' &&
      full.finding.rule_id !== 'va-domicile:status-not-classified';
    assert(
      `${status}: the gate path and the full analysis agree on whether the status was classified`,
      bothUnverifiable || neither,
      { gate: gate.rule_id, full: full.finding.rule_id },
    );
  }

  // ---- cross-jurisdiction: no Virginia assumption may leak. TX and TN declare no classification. ----
  for (const code of ['TX', 'TN']) {
    if (!isModelled(code)) continue;
    for (const status of ALL_STATUSES) {
      const r = residency(status, code);
      assert(
        `${code} + ${status}: unchanged — a pack that states no classification is not fail-closed by it`,
        r.rule_id !== `${code.toLowerCase()}-domicile:status-not-classified` &&
          !/has not read .* domicile rules for this immigration status/.test(r.headline),
        r.headline,
      );
    }
    // And every status still gets the SAME answer there, which is what "no status rule" means.
    const headlines = new Set(ALL_STATUSES.map((s) => residency(s, code).headline));
    assert(
      `${code} answers every status identically — it states no status rule and now still states none`,
      headlines.size === 1,
      [...headlines],
    );
  }

  // ---- determinism ----
  const runs = Array.from({ length: 5 }, () => JSON.stringify([residency('other'), aid('other')]));
  assert('the same unclassified input yields byte-identical output every time', new Set(runs).size === 1);
}

console.log('');
console.log('Hostile and malformed input fails CLOSED — it never crashes and never gets more confident');

// Every case below was found by a forensic pass over the released build. Each is here because it
// either threw an uncaught exception (a 500 out of a server component) or turned input nobody could
// read into a MORE confident answer than the readable case would have produced. Those are the two
// directions this product cannot afford to fail in, so each gets a test.
{
  const HENT = '2026-08-08';
  const person = (status: string, state = 'VA', history?: unknown): Student =>
    ({
      id: 'hostile',
      immigration: { status, prior_statuses: [] },
      dob: '2000-01-01',
      institutions: [],
      jurisdiction_history: history ?? [{ state, from: '2015-01-01' }],
    }) as unknown as Student;
  const vaJx = jurisdictionForCode('VA');
  const residency = (factors: unknown[]) =>
    residencyFindingFor(vaJx, {
      student: person('citizen'),
      events: [],
      intentFactors: factors as IntentFactorFact[],
      allegedEntitlementDate: HENT,
    });

  // ---- the shared date guard ----
  assert('isUsableDate accepts a real date', isUsableDate('2020-01-01'));
  assert('isUsableDate accepts a real leap day', isUsableDate('2024-02-29'));
  assert('isUsableDate rejects 30 February (it rolls over to 2 March)', !isUsableDate('2025-02-30'));
  assert('isUsableDate rejects 31 April', !isUsableDate('2025-04-31'));
  assert('isUsableDate rejects 29 February in a non-leap year', !isUsableDate('2025-02-29'));
  for (const bad of [undefined, null, '', 'not-a-date', '2020-1-1', '20200101', 12345, {}, []]) {
    assert(`isUsableDate rejects ${String(JSON.stringify(bad))}`, !isUsableDate(bad));
  }

  // ---- intent factors: an unusable date declines, it does not throw ----
  const dateCases: [string, unknown[]][] = [
    ['a factor with no date', [{ id: 'continuous_residence' }]],
    ['a factor with a null date', [{ id: 'continuous_residence', date: null }]],
    ['a factor dated 30 February', [{ id: 'continuous_residence', date: '2025-02-30' }]],
  ];
  for (const [label, factors] of dateCases) {
    let threw = false;
    let f: Finding | undefined;
    try {
      f = residency(factors);
    } catch {
      threw = true;
    }
    assert(`${label} does not throw`, !threw);
    assert(
      `${label} yields unable_to_verify with an open question`,
      !!f && f.result === 'unable_to_verify' && f.unknowns.length > 0,
      f?.result,
    );
  }
  const leap = residency([{ id: 'continuous_residence', date: '2024-02-29' }]);
  assert(
    'a real leap-day factor still starts the durational clock',
    leap.rule_id === 'va-domicile:clock' && /appears satisfied/.test(leap.headline),
    leap.headline,
  );
  const impossibleFull = domicileAnalysisFor(vaJx, {
    student: person('citizen'),
    events: [],
    intentFactors: [{ id: 'continuous_residence', date: '2025-02-30' }] as unknown as IntentFactorFact[],
    allegedEntitlementDate: HENT,
  });
  assert(
    'the full analysis refuses the same impossible date the gate path refuses',
    !impossibleFull.clock?.clockStart,
    impossibleFull.clock?.clockStart,
  );

  // ---- jurisdiction lookup: a prototype key is not a jurisdiction ----
  for (const key of ['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty']) {
    let threw = false;
    let hasPacks = true;
    try {
      hasPacks = !!jurisdictionForCode(key).packs;
    } catch {
      threw = true;
    }
    assert(`jurisdictionForCode(${JSON.stringify(key)}) does not throw`, !threw);
    assert(`jurisdictionForCode(${JSON.stringify(key)}) resolves to no packs`, !threw && !hasPacks);
  }
  assert('a real code still resolves to its packs', !!jurisdictionForCode('VA').packs);

  // ---- jurisdiction history: unreadable entries are dropped, not fatal ----
  const historyCases: [string, unknown][] = [
    ['a null entry', [null, { state: 'VA', from: '2015-01-01' }]],
    ['an entry with no state', [{ from: '2015-01-01' }]],
    ['an entry with no from', [{ state: 'VA' }]],
    ['every entry unreadable', [null, undefined]],
  ];
  for (const [label, history] of historyCases) {
    let threw = false;
    try {
      currentJurisdictionCode(person('citizen', 'VA', history));
    } catch {
      threw = true;
    }
    assert(`jurisdiction history with ${label} does not throw`, !threw);
  }
  assert(
    'a readable entry still wins beside an unreadable one',
    currentJurisdictionCode(person('citizen', 'VA', [null, { state: 'VA', from: '2015-01-01' }])) === 'VA',
  );

  // ---- CPT ledger: hours are a number or they are refused, never coerced ----
  const ftDays = (hours: unknown) =>
    computeCptLedger([
      {
        id: 'c1',
        type: 'cpt_auth',
        date: '2025-01-01',
        end_date: '2025-01-10',
        program_level: 'masters',
        attrs: { hours_per_week: hours },
        evidence_ids: [],
        confidence: 'asserted',
      },
    ] as never).forLevel('masters')?.fullTimeDays;
  assert('numeric 40 counts 10 full-time days', ftDays(40) === 10, ftDays(40));
  assert('numeric 21 is full-time (strictly over 20)', ftDays(21) === 10, ftDays(21));
  assert('numeric 20 is part-time, not full-time', ftDays(20) === 0, ftDays(20));
  assert('a negative hours value counts no full-time days', ftDays(-40) === 0, ftDays(-40));
  // JS would evaluate "40" > 20 as true. The ledger requires an actual number, so a string is
  // refused rather than believed — the safe direction for a counter that ends OPT eligibility.
  for (const bad of ['40', ' 40', '40.0', true, null, undefined, NaN]) {
    const d = ftDays(bad);
    assert(
      `hours_per_week ${String(JSON.stringify(bad))} is refused, not coerced`,
      d === undefined || d === 0,
      d,
    );
  }

  // ---- aid: a provision the pack does not state is an open question, not silence ----
  const aidInput = (provisions?: string[]) => ({
    student: person('citizen'),
    provisions,
    evidence: ['domicile_established'],
    deadlines: { asOf: HENT, collegePriority: '2027-02-01', federal: '2027-06-30' },
  });
  const ghost = aidFindingFor(vaJx, aidInput(['not_a_provision']));
  assert('an unknown provision id never yields no_issue', ghost.result !== 'no_issue', ghost.result);
  assert(
    'an unknown provision id is named as an open question',
    ghost.unknowns.some((u) => u.what.includes('not_a_provision')),
    ghost.unknowns.map((u) => u.what),
  );
  const realProvision = aidFindingFor(vaJx, aidInput(['domicile']));
  assert(
    'a provision the pack DOES state raises no such question',
    realProvision.unknowns.every((u) => !u.what.includes('is not a provision')),
    realProvision.unknowns.map((u) => u.what),
  );

  // ---- aid: an unreadable asOf bands red, never green ----
  // Non-null: `aidDeadlineFor` is undefined only for a jurisdiction with no aid pack, and VA has one.
  const bogusDeadline = aidDeadlineFor(vaJx, {
    student: person('citizen'),
    deadlines: { asOf: 'not-a-date', collegePriority: '2027-02-01' },
  })!;
  assert('an unreadable asOf yields no margin', bogusDeadline.daysOfMargin === undefined);
  assert(
    'an unreadable asOf bands red, not green',
    bogusDeadline.marginBand === 'red',
    bogusDeadline.marginBand,
  );
  const goodDeadline = aidDeadlineFor(vaJx, {
    student: person('citizen'),
    deadlines: { asOf: HENT, collegePriority: '2027-02-01' },
  })!;
  assert(
    'a readable asOf still computes a finite margin',
    typeof goodDeadline.daysOfMargin === 'number' && Number.isFinite(goodDeadline.daysOfMargin),
    goodDeadline.daysOfMargin,
  );
}

console.log('');
console.log('A misregistered pack is loud, not silently authoritative');

// resolveJurisdiction is the seam REGISTRY is edited through, and a pack filed under the wrong code
// would make every engine below it confidently wrong about a state. The router refuses to build a
// context for one rather than letting it reach a finding.
const vaPacks = resolveJurisdiction('VA')!;
assert(
  'the Virginia packs declare Virginia',
  vaPacks.domicile.jurisdiction === 'VA' && vaPacks.aid?.jurisdiction === 'VA',
);

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASSED — no state wears another state’s citation, and Virginia is unchanged.');
  process.exit(0);
} else {
  console.error(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
