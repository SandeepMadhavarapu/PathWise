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
  coverageAgreesWithPacks,
  validateAidPack,
  validateDomicilePack,
  type ValidationProblem,
} from '../rulepacks/validate';
import { clockAnchorFor, clockStartFor, ClockStrategyError } from '../engines/domicile-clock';
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
  validateAidPack(packs.aid, TODAY, problems);

  assert(`${code}: domicile pack declares jurisdiction ${code}`, packs.domicile.jurisdiction === code);
  assert(`${code}: aid pack declares jurisdiction ${code}`, packs.aid.jurisdiction === code);

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

const disagreements = coverageAgreesWithPacks(
  REGISTERED_PACKS.map(({ code, packs }) => ({
    code,
    capabilities: [...packs.domicile.capabilities, ...packs.aid.capabilities],
  })),
);
assert('the coverage map and the registered packs agree', disagreements.length === 0, disagreements);

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
rejects(
  'a pack with no gates is rejected',
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  () => clockStartFor('made_up_rule' as any),
  ClockStrategyError,
);
rejects(
  'the clock anchor lookup throws on an unknown anchor rather than defaulting',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  () => clockAnchorFor('made_up_anchor' as any),
  ClockStrategyError,
);

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

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASSED — every pack satisfies the contract, and an unsafe one cannot.');
  process.exit(0);
} else {
  console.error(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
