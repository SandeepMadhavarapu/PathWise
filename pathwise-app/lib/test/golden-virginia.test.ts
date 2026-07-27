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
 * The one intended change to Virginia's output, pinned on both sides.
 *
 * consequence-engine.ts used to hand-type the residency-suppression citation as two string
 * literals sitting a few lines from the pack that states the same rule — a paraphrase of
 * va-domicile.json's gate, kept in sync by nothing. It now reads the gate's own `explain` and its
 * own section reference, which is why these two strings moved.
 *
 * This is recorded as an exception rather than absorbed by re-running the capture, because
 * regenerating the baseline would discard the evidence that NOTHING ELSE moved. Both the old and
 * the new value are pinned: a third state for either of these strings fails just as loudly as an
 * unlisted change anywhere else.
 */
const INTENDED_CHANGES: Difference[] = [
  {
    path: 'priya:job-offer-consequences[2].cite.text',
    before: 'Holders of a student visa cannot establish domicile in Virginia.',
    after: 'Holders of student or temporary visas do not have the capacity to establish domicile in Virginia.',
  },
  {
    path: 'priya:job-offer-consequences[2].cite.authority',
    before: 'SCHEV Domicile Guidelines Pt II §03(A)',
    after: 'Part II, Section 03(A) & Section 02(4); SCHEV Domicile Guidelines, Code of Virginia 23.1-510(D)',
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
  `nothing changed except the ${INTENDED_CHANGES.length} pack-sourced citation strings`,
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
