// pack-schema.test.ts — every registered pack satisfies the contract, and a bad pack is rejected.
//
// Run: npm run test:schema
//
// Two halves, and the second matters more than the first.
//
// The first half checks the packs that exist. That is table stakes: they parse, their sources are
// official, their verification dates are real, and what they claim to answer they actually carry.
//
// The second half checks the packs that DO NOT exist — deliberately broken ones, built here and fed
// to the parser to prove it says no. A validator nobody has watched fail is a validator nobody knows
// works, and the specific failure being guarded against is the expensive one: a pack with an
// unrecognised `start_rule` must be REJECTED, not quietly given Virginia's clock arithmetic under
// its own state's heading. That failure would ship a wrong number with a correct citation attached,
// which is the one error a reader has no way to catch.

import { REGISTERED_PACKS } from '../rulepacks';
import { parseAidPack, parseDomicilePack, PackSchemaError } from '../rulepacks/schema';
import {
  duplicateDomainClaims,
  validateIndexSources,
  validateAidPack,
  validateDomicilePack,
  type ValidationProblem,
} from '../rulepacks/validate';
import { COVERAGE, LEVEL_COUNTS, UNLISTED_REGISTRATIONS } from '../jurisdiction-coverage';
import { JURISDICTIONS } from '../coverage';
import { clockAnchorFor, clockStartFor, ClockStrategyError } from '../engines/domicile-clock';
import { checkEligibleAlienGate, domicileView } from '../engines/domicile-gate';
import vaDomicileRaw from '../rulepacks/va-domicile.json';
import vaAidRaw from '../rulepacks/va-aid.json';

let failures = 0;
function assert(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}`, extra ?? '');
  }
}

/** Runs `fn` and reports whether it threw the expected kind of error. */
function rejects(name: string, fn: () => unknown, expect: new (...a: never[]) => Error): void {
  try {
    fn();
    assert(name, false, 'did not throw');
  } catch (e) {
    assert(name, e instanceof expect, `threw ${(e as Error).name}: ${(e as Error).message.slice(0, 120)}`);
  }
}

const TODAY = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------------------------
console.log('Every registered pack satisfies the contract');
// ---------------------------------------------------------------------------------------------

assert('at least one jurisdiction is registered', REGISTERED_PACKS.length > 0);

const problems: ValidationProblem[] = [];
for (const { code, packs } of REGISTERED_PACKS) {
  validateDomicilePack(packs.domicile, TODAY, problems);
  assert(`${code}: domicile pack declares jurisdiction ${code}`, packs.domicile.jurisdiction === code);

  // Aid rules are optional per jurisdiction — residency authored and aid not is a real state, and
  // the one the capability system exists to express. Checked when present, not demanded.
  if (packs.aid) {
    validateAidPack(packs.aid, TODAY, problems);
    assert(`${code}: aid pack declares jurisdiction ${code}`, packs.aid.jurisdiction === code);
  }

  // Every clock strategy a pack names must resolve. This is the assertion that makes "fail closed"
  // real rather than aspirational — a lookup that throws is the whole mechanism.
  if (packs.domicile.clock) {
    const { start_rule, anchor } = packs.domicile.clock;
    let resolved = true;
    try {
      clockStartFor(start_rule);
      clockAnchorFor(anchor);
    } catch {
      resolved = false;
    }
    assert(`${code}: clock strategies "${start_rule}" / "${anchor}" both resolve`, resolved);
  }
}

const errors = problems.filter((p) => p.severity === 'error');
const warnings = problems.filter((p) => p.severity === 'warning');
assert(
  `no validation errors across ${REGISTERED_PACKS.length} jurisdiction(s)`,
  errors.length === 0,
  errors.map((e) => `\n    ${e.packId}: ${e.message}`).join(''),
);
if (warnings.length) {
  console.log(`  NOTE  ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`        ${w.packId}: ${w.message}`);
}

const dupes = duplicateDomainClaims(
  REGISTERED_PACKS.map(({ code, packs }) => ({
    code,
    capabilities: [...packs.domicile.capabilities, ...(packs.aid?.capabilities ?? [])],
  })),
);
assert('no jurisdiction has two packs claiming one domain', dupes.length === 0, dupes);
assert(
  'no pack is registered for a jurisdiction the index does not list',
  UNLISTED_REGISTRATIONS.length === 0,
  UNLISTED_REGISTRATIONS,
);

// ---------------------------------------------------------------------------------------------
console.log('');
console.log('Coverage is derived from the packs, and cannot be faked by editing the map');
// ---------------------------------------------------------------------------------------------

assert('every jurisdiction in the index has a derived coverage row', COVERAGE.length === JURISDICTIONS.length);

// The load-bearing claim of the whole coverage screen. A jurisdiction shows as modelled if and only
// if a registered pack says so — there is no field anywhere that could be edited to fake it.
const registeredCodes = new Set(REGISTERED_PACKS.map((r) => r.code));
const wronglyModelled = COVERAGE.filter((c) => c.decidesAnything && !registeredCodes.has(c.code));
assert(
  'no jurisdiction claims a determinate capability without a registered pack',
  wronglyModelled.length === 0,
  wronglyModelled.map((c) => c.code),
);

const wronglyUnmodelled = REGISTERED_PACKS.filter(
  (r) => !COVERAGE.find((c) => c.code === r.code)?.decidesAnything,
);
assert(
  'every registered pack is reflected in the coverage map',
  wronglyUnmodelled.length === 0,
  wronglyUnmodelled.map((r) => r.code),
);

// Per-domain, not per-jurisdiction: a state may be modelled for one domain and not the other, and
// the map has to be able to say so.
assert(
  'coverage is rated per domain',
  COVERAGE.every((c) => c.domains.length === 2 && c.residency.domain === 'residency' && c.aid.domain === 'aid'),
);

// Every jurisdiction with no pack must sit at a level that cannot decide anything.
const unpackaged = COVERAGE.filter((c) => !registeredCodes.has(c.code));
assert(
  `all ${unpackaged.length} unregistered jurisdictions sit at a non-determinate level`,
  unpackaged.every((c) => ['sourced_only', 'not_modelled', 'unable_to_verify'].includes(c.furthest)),
  unpackaged.filter((c) => !['sourced_only', 'not_modelled', 'unable_to_verify'].includes(c.furthest)).map((c) => c.code),
);

// A jurisdiction with no verified source may not be shown as source-captured.
const sourcedWithoutSource = COVERAGE.filter(
  (c) => c.furthest === 'sourced_only' && !c.domains.some((d) => d.source_url),
);
assert(
  'nothing is shown as "source captured" without a source', 
  sourcedWithoutSource.length === 0,
  sourcedWithoutSource.map((c) => c.code),
);

// The overclaim the residency/aid split exists to prevent.
//
// One source may legitimately serve both domains — in many states one body genuinely decides both,
// and Texas's coordinating board and Virginia's SCHEV are exactly that. What must not happen is two
// DIFFERENT bodies being backed by one link, which would mean a check made against one of them
// silently vouching for the other. So: sharing a URL is allowed, sharing a URL under two different
// authority names is not.
const mismatchedSharedSource = COVERAGE.filter(
  (c) =>
    c.residency.source_url &&
    c.residency.source_url === c.aid.source_url &&
    c.residency.authority !== c.aid.authority,
);
assert(
  'no jurisdiction backs two different named authorities with one link',
  mismatchedSharedSource.length === 0,
  mismatchedSharedSource.map((c) => `${c.code}: "${c.residency.authority}" vs "${c.aid.authority}"`),
);

assert(
  'the level counts add up to every jurisdiction',
  Object.values(LEVEL_COUNTS).reduce((a, b) => a + b, 0) === COVERAGE.length,
  LEVEL_COUNTS,
);

// ---------------------------------------------------------------------------------------------
console.log('');
console.log('The jurisdiction index is held to the same standard as a pack');
// ---------------------------------------------------------------------------------------------

const indexProblems = validateIndexSources(JURISDICTIONS);
const indexErrors = indexProblems.filter((p) => p.severity === 'error');
assert(
  `every source link in the index is official, attributed and records how it was checked (${JURISDICTIONS.length} jurisdictions)`,
  indexErrors.length === 0,
  indexErrors.map((e) => `
    ${e.packId}: ${e.message}`).join(''),
);

// Nothing may be silent: a jurisdiction either has a source, or says why it does not.
const silent = JURISDICTIONS.filter((j) => !j.source_url && !j.aid_source_url && !j.unverifiable);
assert(
  'no jurisdiction is silent — each has a source or a stated reason it has none',
  silent.length === 0,
  silent.map((j) => j.code),
);

// ---------------------------------------------------------------------------------------------
console.log('');
console.log('A pack that would be unsafe is rejected, not defaulted');
// ---------------------------------------------------------------------------------------------

/** The Virginia pack with one field broken — the smallest possible difference from a valid pack. */
function brokenDomicile(mutate: (p: Record<string, unknown>) => void): () => unknown {
  return () => {
    const copy = JSON.parse(JSON.stringify(vaDomicileRaw)) as Record<string, unknown>;
    mutate(copy);
    return parseDomicilePack(copy);
  };
}

// THE one that matters most. An unknown clock rule has no behaviour to select, and the failure mode
// of defaulting it is Virginia's arithmetic printed under another state's name.
rejects(
  'an unknown clock start_rule is rejected',
  brokenDomicile((p) => {
    (p.clock as Record<string, unknown>).start_rule = 'whenever_the_student_arrived';
  }),
  PackSchemaError,
);
rejects(
  'an unknown clock anchor is rejected',
  brokenDomicile((p) => {
    (p.clock as Record<string, unknown>).anchor = 'some_other_date';
  }),
  PackSchemaError,
);
rejects(
  'an unknown deciding_office is rejected',
  brokenDomicile((p) => {
    (p.gates as Record<string, unknown>[])[0].deciding_office = 'the_dean';
  }),
  PackSchemaError,
);
rejects(
  'an unknown gate result is rejected',
  brokenDomicile((p) => {
    (p.gates as Record<string, unknown>[])[0].result = 'probably_fine';
  }),
  PackSchemaError,
);
// A pack with no gates is now LEGAL, and Tennessee is why: Tenn. Comp. R. & Regs. 1540-01-01-.03
// classifies on domicile and nothing else — no status gate, no alien provision. The schema used to
// demand at least one, which would have forced whoever authored that pack to invent one, and an
// invented gate is fabricated law wearing a citation. This asserts the change deliberately rather
// than leaving the old expectation to fail quietly.
{
  const copy = JSON.parse(JSON.stringify(vaDomicileRaw)) as Record<string, unknown>;
  copy.gates = [];
  copy.deciding_office = 'state_higher_ed_agency';
  let parsed = false;
  try {
    parseDomicilePack(copy);
    parsed = true;
  } catch {
    parsed = false;
  }
  assert('a pack with no gates is accepted — some jurisdictions genuinely have none', parsed);
}

// ...but only if it says who decides. `deciding_office` lived on the gate and nowhere else, so a
// gateless pack had no way to name the body ruling on residency — and a finding with no office
// named is a finding that has quietly become PathWise's own opinion.
rejects(
  'a gateless pack with no deciding_office is rejected — nothing would name who decides',
  brokenDomicile((p) => {
    p.gates = [];
  }),
  PackSchemaError,
);
rejects(
  'a pack with no capabilities is rejected',
  brokenDomicile((p) => {
    p.capabilities = [];
  }),
  PackSchemaError,
);
rejects(
  'a pack with no agencies cannot declare a determinate capability',
  brokenDomicile((p) => {
    p.agencies = [];
  }),
  PackSchemaError,
);
rejects(
  'a gate referencing an undeclared agency is rejected',
  brokenDomicile((p) => {
    (p.gates as Record<string, unknown>[])[0].agency_id = 'ministry_of_magic';
  }),
  PackSchemaError,
);
rejects(
  'a capability below "modelled" must say what is missing',
  brokenDomicile((p) => {
    p.capabilities = [{ domain: 'residency', level: 'partial' }];
  }),
  PackSchemaError,
);
rejects(
  'an unknown volatility status is rejected',
  brokenDomicile((p) => {
    (p.volatility as Record<string, unknown>).status = 'probably_stable';
  }),
  PackSchemaError,
);
rejects(
  'an aid pack fed to the domicile parser is rejected',
  () => parseDomicilePack(vaAidRaw),
  PackSchemaError,
);
rejects('a non-object is rejected', () => parseDomicilePack('not a pack'), PackSchemaError);

// And the runtime half of the same lock: even if a bad value reached the engine, the lookup throws.
rejects(
  'the clock start lookup throws on an unknown rule rather than defaulting',
  () => clockStartFor('made_up_rule' as any),
  ClockStrategyError,
);
rejects(
  'the clock anchor lookup throws on an unknown anchor rather than defaulting',
  () => clockAnchorFor('made_up_anchor' as any),
  ClockStrategyError,
);

// ---------------------------------------------------------------------------------------------
console.log('');
console.log('A pack that states a status rule has to say how far it was read');
// ---------------------------------------------------------------------------------------------

// The Claim #2 defect, as an authoring rule. A gate is a blacklist, so a `modelled` pack that states
// one without a `status_classification` leaves every status the gate does not name being read as
// considered-and-permitted — which is how Virginia came to answer a student whose status it cannot
// name exactly as it answers a U.S. citizen. This makes that shape a build-visible error rather than
// something only a probe would find.
{
  const stripped = JSON.parse(JSON.stringify(vaDomicileRaw)) as Record<string, unknown>;
  delete stripped.status_classification;
  const problems = validateDomicilePack(parseDomicilePack(stripped), TODAY);
  assert(
    'a modelled domicile pack with a gate and no status_classification is an error',
    problems.some((p) => p.severity === 'error' && p.message.includes('status_classification')),
    problems.map((p) => p.message),
  );

  const strippedAid = JSON.parse(JSON.stringify(vaAidRaw)) as Record<string, unknown>;
  delete strippedAid.status_classification;
  const aidProblems = validateAidPack(parseAidPack(strippedAid), TODAY);
  assert(
    'a modelled aid pack with a block and no status_classification is an error',
    aidProblems.some((p) => p.severity === 'error' && p.message.includes('status_classification')),
    aidProblems.map((p) => p.message),
  );

  // An empty list is worse than an absent one: it looks like a reading somebody made, and every
  // status would fail closed against a rule nobody wrote.
  rejects(
    'a status_classification with an empty classified list is rejected',
    brokenDomicile((p) => {
      (p.status_classification as Record<string, unknown>).classified = [];
    }),
    PackSchemaError,
  );

  // TX and TN state no status rule at all, so the requirement must not reach them — the absence is
  // a fact about those jurisdictions, and their gap is already carried as an open question.
  for (const { code, packs } of REGISTERED_PACKS) {
    if (packs.domicile.gates.length > 0) continue;
    const gapless = validateDomicilePack(packs.domicile, TODAY).filter(
      (p) => p.severity === 'error' && p.message.includes('status_classification'),
    );
    assert(`${code} is not required to classify statuses — it states no status rule`, gapless.length === 0);
  }
}

// ---------------------------------------------------------------------------------------------
console.log('');
console.log('The parser reports everything wrong at once, not just the first thing');
// ---------------------------------------------------------------------------------------------

try {
  const copy = JSON.parse(JSON.stringify(vaDomicileRaw)) as Record<string, unknown>;
  (copy.clock as Record<string, unknown>).anchor = 'nope';
  (copy.gates as Record<string, unknown>[])[0].deciding_office = 'nope';
  (copy.volatility as Record<string, unknown>).status = 'nope';
  parseDomicilePack(copy);
  assert('three broken fields are all reported', false, 'did not throw');
} catch (e) {
  const msg = (e as Error).message;
  assert(
    'three broken fields are all reported in one error',
    msg.includes('anchor') && msg.includes('deciding_office') && msg.includes('status'),
    msg,
  );
}

// ---------------------------------------------------------------------------------------------
console.log('');
console.log('A valid pack still parses — the checks above are not just refusing everything');
// ---------------------------------------------------------------------------------------------

const va = parseDomicilePack(vaDomicileRaw);
assert('Virginia parses', va.jurisdiction === 'VA');
assert('Virginia carries its gate', va.gates.length === 1 && va.gates[0].id === 'eligible_alien_gate');
assert('Virginia carries a 365-day clock', va.clock?.duration_days === 365);
assert(
  'Virginia declares residency modelled',
  va.capabilities.some((c) => c.domain === 'residency' && c.level === 'modelled'),
);
assert('Virginia names SCHEV as the deciding agency', va.agencies.some((a) => a.short_name === 'SCHEV'));

const vaAid = parseAidPack(vaAidRaw);
assert('the Virginia aid pack parses', vaAid.jurisdiction === 'VA');
assert(
  'the aid pack declares aid modelled',
  vaAid.capabilities.some((c) => c.domain === 'aid' && c.level === 'modelled'),
);


// ---------------------------------------------------------------------------------------------
console.log('');
console.log('Multi-gate: every gate is evaluated, and the FIRING gate is the one cited');
// ---------------------------------------------------------------------------------------------
//
// No registered jurisdiction states two gates today, and none will be given one to satisfy a test:
// Texas plainly requires lawful presence, but the list of visa types eligible to establish domicile
// lives in 19 TAC § 21.24 and PathWise has not read it, so writing that gate would be inventing law.
//
// The code path is real regardless, and it is the one whose failure is worst — `gates[0]` was the
// only gate ever read, so a second one was silently discarded and the pack still looked complete.
// So it is exercised here with a SYNTHETIC pack, built in this file and registered nowhere. It is
// a fixture for the engine, not a claim about any state.

{
  const synthetic = JSON.parse(JSON.stringify(vaDomicileRaw)) as Record<string, unknown>;
  const firstGate = (synthetic.gates as Record<string, unknown>[])[0];
  synthetic.gates = [
    // Gate one matches J-1 only, so an F-1 student must fall through to gate two.
    {
      ...firstGate,
      id: 'first_gate',
      when: "immigration.status in ['J1']",
      cite: 'FIRST GATE CITE',
      display_cite: 'FIRST',
      headline: 'J-1 status is closed by the first gate',
      explain: 'The first gate closes for J-1.',
      deciding_office: 'domicile_officer',
    },
    {
      ...firstGate,
      id: 'second_gate',
      when: "immigration.status in ['F1']",
      cite: 'SECOND GATE CITE',
      display_cite: 'SECOND',
      headline: 'F-1 status is closed by the second gate',
      explain: 'The second gate closes for F-1.',
      deciding_office: 'registrar',
    },
  ];

  const pack = parseDomicilePack(synthetic);
  assert('a two-gate pack parses', pack.gates.length === 2);

  const view = domicileView(pack);
  assert(
    'both gates contribute to the status set',
    view.gateStatuses.has('J1') && view.gateStatuses.has('F1'),
    [...view.gateStatuses],
  );
  assert('the first gate is found for its own status', view.statusGateFor('J1')?.id === 'first_gate');
  assert(
    'the SECOND gate is found for F-1 — it would have been silently dropped before',
    view.statusGateFor('F1')?.id === 'second_gate',
    view.statusGateFor('F1')?.id,
  );
  assert('a status no gate names fires nothing', view.statusGateFor('citizen') === undefined);

  const f1 = checkEligibleAlienGate(
    {
      id: 'x',
      immigration: { status: 'F1', prior_statuses: [] },
      dob: '2000-01-01',
      institutions: [],
      jurisdiction_history: [],
    },
    view,
  );
  // The whole point: the finding must carry the FIRING gate's citation and office, not the first
  // gate's. Citing gate one for a student closed by gate two is the wrong-statute failure again,
  // one level in.
  assert('the F-1 finding comes from the second gate', f1?.rule_id.endsWith('second_gate') === true, f1?.rule_id);
  assert(
    'and cites the SECOND gate, not the first',
    f1?.rule_citation.authority.includes('SECOND GATE CITE') === true &&
      f1?.rule_citation.authority.includes('FIRST GATE CITE') === false,
    f1?.rule_citation.authority,
  );
  assert(
    "and carries the second gate's own deciding office",
    f1?.deciding_office === 'registrar',
    f1?.deciding_office,
  );
}

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASSED — every pack satisfies the contract, and an unsafe one cannot.');
  process.exit(0);
} else {
  console.error(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
