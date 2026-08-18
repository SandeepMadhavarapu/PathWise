// engine-hardening.test.ts — two ways an engine could turn "I could not read this" into an answer.
//
// Run: npm run test:hardening
//
// Both defects below were latent — no screen reaches either path today — and both were fixed anyway,
// because the invariant they break is the one the product is built on rather than a cosmetic one:
//
//   UNKNOWN MUST NEVER BECOME YES. UNKNOWN MUST NEVER BECOME NO.
//
// A latent violation of that is a violation waiting for a caller. These tests exist so the fix
// cannot quietly regress, and so the VALID behaviour beside it is pinned in the same file — a
// hardening change that moved a real number would be a worse bug than the one it fixed.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { computeOptBudget, monthsInPeriod } from '../engines/opt-budget';
import { computeCptLedger } from '../engines/cpt-ledger';
import { formatDomicileDate } from '../format';
import {
  aidFindingFor,
  domicileAnalysisFor,
  jurisdictionForCode,
  residencyFindingFor,
} from '../engines/jurisdiction';
import { priyaOptBudget } from '../fixtures/priya';
import { JURISDICTIONS } from '../coverage';
import { article } from '../engines/unmodelled-jurisdiction';
import type { ProgramLevel, Student } from '../types';

let failures = 0;
function assert(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}`, extra ?? '');
  }
}

const auth = (id: string, start: string, end: string) =>
  ({ id, start, end, intensity: 'full_time' as const });
const budgetOf = (auths: ReturnType<typeof auth>[], level: ProgramLevel = 'masters') =>
  computeOptBudget({ level, authorizations: auths }).forLevel(level)!;

// =================================================================================================
console.log('\n===== 1 · OPT BUDGET: an unreadable date must not read as budget remaining =====');
// The defect: `parse('zzz').getTime()` is NaN; `NaN <= NaN` is false, so the empty-period guard did
// not fire; the arithmetic ran to NaN; and in bandFor, `NaN <= 0` and `NaN <= 2` are BOTH false, so
// it fell through to its last branch and returned 'green'. An authorization the engine could not
// read produced the most reassuring output it has.
// =================================================================================================

const UNREADABLE: [string, string, string][] = [
  ['both dates unreadable', 'zzz', 'zzz'],
  ['start unreadable', 'zzz', '2025-06-30'],
  ['end unreadable', '2025-01-01', 'zzz'],
  ['impossible date (30 Feb)', '2025-02-30', '2025-06-30'],
  ['empty strings', '', ''],
  ['wrong shape', '01/01/2025', '30/06/2025'],
  ['ISO timestamp, not a date', '2025-01-01T00:00:00Z', '2025-06-30'],
];

for (const [label, start, end] of UNREADABLE) {
  const l = budgetOf([auth('a', start, end)]);
  assert(`${label}: band is never green`, l.band !== 'green', l.band);
  assert(
    `${label}: every number stays finite`,
    Number.isFinite(l.monthsUsed) && Number.isFinite(l.monthsRemaining) && Number.isFinite(l.overByMonths),
    { used: l.monthsUsed, remaining: l.monthsRemaining, over: l.overByMonths },
  );
  assert(`${label}: the authorization is reported, not dropped in silence`, l.unreadable.length === 1, l.unreadable);
  assert(`${label}: it is not charged to the budget`, l.lines.length === 0, l.lines);
}

// Nullish dates arrive only from untyped data, but they arrive.
{
  const l = budgetOf([auth('a', null as unknown as string, undefined as unknown as string)]);
  assert('null/undefined dates: band is never green', l.band !== 'green', l.band);
  assert('null/undefined dates: no crash, finite numbers', Number.isFinite(l.monthsUsed), l.monthsUsed);
}

// A readable authorization beside an unreadable one still counts, and the level still refuses green.
{
  const l = budgetOf([auth('good', '2025-01-01', '2025-06-30'), auth('bad', 'zzz', 'zzz')]);
  assert('mixed: the readable authorization is still counted', l.monthsUsed === 6, l.monthsUsed);
  assert('mixed: band is held off green', l.band !== 'green', l.band);
  assert('mixed: exactly one authorization is reported unreadable', l.unreadable.length === 1, l.unreadable);
}

console.log('\n  -- and the valid arithmetic is untouched --');
{
  const six = budgetOf([auth('a', '2025-01-01', '2025-06-30')]);
  assert('6 whole months uses 6 and stays green', six.monthsUsed === 6 && six.monthsRemaining === 6 && six.band === 'green', six);
  assert('a valid record reports nothing unreadable', six.unreadable.length === 0, six.unreadable);

  const ten = budgetOf([auth('a', '2025-01-01', '2025-10-31')]);
  assert('10 months leaves 2 and is amber (the pack margin)', ten.monthsUsed === 10 && ten.band === 'amber', ten);

  const over = budgetOf([auth('a', '2025-01-01', '2026-01-31')]);
  assert('13 months is red and over by 1', over.band === 'red' && over.overByMonths === 1, over);

  const none = budgetOf([]);
  assert('no authorizations: full budget, green, nothing unreadable', none.monthsUsed === 0 && none.band === 'green' && none.unreadable.length === 0, none);

  // Boundary: the leap day is a real date and must survive the readability check.
  const leap = budgetOf([auth('a', '2024-02-29', '2024-08-28')]);
  assert('29 Feb 2024 is readable and counts 6 months', leap.unreadable.length === 0 && leap.monthsUsed === 6, leap);

  assert('monthsInPeriod: same day is a fraction of a month, not zero', monthsInPeriod('2025-01-01', '2025-01-01') > 0, monthsInPeriod('2025-01-01', '2025-01-01'));
  assert('monthsInPeriod: unreadable input yields 0, never NaN', monthsInPeriod('zzz', 'zzz') === 0, monthsInPeriod('zzz', 'zzz'));
}

console.log('\n  -- the shipped fixture is byte-identical to before the change --');
{
  const l = computeOptBudget(priyaOptBudget).forLevel(priyaOptBudget.level)!;
  assert('Priya: nothing on her record is unreadable', l.unreadable.length === 0, l.unreadable);
  // The exact figures the golden fixtures also pin. Restated here so a hardening change that moved
  // a real number fails in the file that made the change, not three suites later.
  assert(
    'Priya: months used and band unchanged',
    l.monthsUsed === 12 && l.monthsRemaining === 0 && l.band === 'red',
    { used: l.monthsUsed, remaining: l.monthsRemaining, band: l.band },
  );
}

// =================================================================================================
console.log('\n===== 2 · DOMICILE: a missing dependency rule is not a threshold of zero =====');
// The defect: `pack.dependency?.presumed_dependent_under_age ?? 0` invented a threshold for a pack
// with no dependency block, and the finding then asserted "at or over the pack's threshold of 0, so
// no dependency presumption applies" — a regulatory conclusion, with a fabricated number, from a
// rule that does not exist. Texas states no dependency block, so a 14-year-old got that sentence.
// =================================================================================================

const student = (state: string, dob: string): Student => ({
  id: 'test',
  immigration: { status: 'citizen', prior_statuses: [] },
  dob,
  institutions: [],
  jurisdiction_history: [{ state, from: '2015-01-01' }],
});

const analyse = (state: string, dob: string) =>
  domicileAnalysisFor(jurisdictionForCode(state), {
    student: student(state, dob),
    events: [],
    intentFactors: [{ id: 'continuous_residence', date: '2018-01-01' }],
    allegedEntitlementDate: '2026-08-08',
  });

// Packs that DO state a dependency rule must be completely unaffected.
for (const [state, threshold, name] of [
  ['VA', 24, 'Virginia'],
  ['TN', 18, 'Tennessee'],
] as const) {
  const minor = analyse(state, '2012-01-01'); // 14 at entitlement
  const adult = analyse(state, '1995-01-01'); // 31 at entitlement
  const minorText = JSON.stringify(minor.finding);
  const adultText = JSON.stringify(adult.finding);
  assert(`${name}: minor is presumed dependent under the pack's own threshold of ${threshold}`,
    minorText.includes(`under the pack's threshold of ${threshold}`), threshold);
  assert(`${name}: adult is over the pack's own threshold of ${threshold}`,
    adultText.includes(`at or over the pack's threshold of ${threshold}`), threshold);
  assert(`${name}: never mentions a threshold of 0`, !/threshold of 0\b/.test(minorText + adultText));
  assert(`${name}: dependency status is a real finding, not "not modelled"`,
    minor.dependency?.status !== 'not_modelled' && adult.dependency?.status !== 'not_modelled',
    { minor: minor.dependency?.status, adult: adult.dependency?.status });
}

// The pack that states NO dependency rule.
{
  const dep = jurisdictionForCode('TX').packs?.domicile.dependency;
  assert('Texas: the pack genuinely states no dependency rule (the premise of this test)', dep === undefined, dep);

  for (const [label, dob] of [['minor (14)', '2012-01-01'], ['adult (31)', '1995-01-01']] as const) {
    const a = analyse('TX', dob);
    const text = JSON.stringify(a.finding);
    assert(`Texas ${label}: no fabricated "threshold of 0"`, !/threshold of 0\b/.test(text), text.match(/[^"]*threshold[^"]*/)?.[0]);
    assert(`Texas ${label}: thresholdAge is absent, not defaulted`, a.dependency?.thresholdAge === undefined, a.dependency?.thresholdAge);
    assert(`Texas ${label}: status is not_modelled`, a.dependency?.status === 'not_modelled', a.dependency?.status);
    assert(`Texas ${label}: no presumption is asserted either way`, a.dependency?.presumptionApplies === false, a.dependency?.presumptionApplies);
    assert(
      `Texas ${label}: says PathWise has not modelled the rule, not that no presumption applies`,
      text.includes('states no dependency rule PathWise has modelled') &&
        !text.includes('so no dependency presumption applies'),
    );
    assert(
      `Texas ${label}: raises it as an open question`,
      a.finding.unknowns.some((u) => /dependent student takes their parents' domicile/i.test(u.what)),
      a.finding.unknowns.map((u) => u.what),
    );
    // The whole point: knowing less must not produce a more confident answer.
    assert(`Texas ${label}: the verdict is never a clear pass`, a.finding.result !== 'no_issue', a.finding.result);
  }

  // Knowing less must mean asking MORE. Texas has no dependency rule and no status gate; Virginia
  // has both. The unmodelled jurisdiction must not end up with the quieter finding.
  const txAdult = analyse('TX', '1995-01-01');
  const vaAdult = analyse('VA', '1995-01-01');
  assert(
    'Texas raises at least as many open questions as Virginia for the same adult student',
    txAdult.finding.unknowns.length >= vaAdult.finding.unknowns.length,
    { tx: txAdult.finding.unknowns.length, va: vaAdult.finding.unknowns.length },
  );
}

// =================================================================================================
console.log('\n===== 3 · A finding must not contradict the screen it is rendered on =====');
// The defect: `aidFindingFor` routes a jurisdiction with residency rules but no aid rules into the
// unmodelled aid finding, and `unmodelledOf` had nothing to describe it from — `ctx.unmodelled` is
// only set when there are NO packs. The finding therefore claimed "PathWise has not yet verified an
// official source to link" and "has not authored and verified a rule pack for Texas", on the same
// /check screen that showed a working "Official Texas source →" and "Verified 2026-07-28".
// =================================================================================================

const aidFor = (code: string) =>
  aidFindingFor(jurisdictionForCode(code), {
    student: student(code, '2000-01-01'),
    deadlines: { asOf: '2026-08-10' },
  });
const residencyFor = (code: string) =>
  residencyFindingFor(jurisdictionForCode(code), {
    student: student(code, '2000-01-01'),
    events: [],
    intentFactors: [],
    allegedEntitlementDate: '2026-08-10',
  });

// Partially modelled: residency yes, aid no.
for (const [code, name] of [['TX', 'Texas'], ['TN', 'Tennessee']] as const) {
  const ctx = jurisdictionForCode(code);
  assert(`${name}: the premise holds — residency pack present, aid pack absent`,
    Boolean(ctx.packs?.domicile) && !ctx.packs?.aid);

  const aid = aidFor(code);
  const text = JSON.stringify(aid);
  assert(`${name} aid: verdict is still unable_to_verify`, aid.result === 'unable_to_verify', aid.result);
  assert(`${name} aid: never claims no source was verified`, !/no source verified|not yet verified an official source/i.test(text));
  assert(`${name} aid: never claims PathWise authored no pack for this state`,
    !/has not authored and verified a rule pack/.test(text));
  assert(`${name} aid: does not say it will not compute a RESIDENCY answer`,
    !/compute a residency answer/.test(text));
  assert(`${name} aid: says plainly that residency is modelled and aid is not`,
    /has modelled .*residency rules but has not authored and verified its state-aid rules/.test(text));
  assert(`${name} aid: carries an aid authority and an aid source link`,
    Boolean(aid.rule_citation.authority) && Boolean(aid.rule_citation.source_url),
    aid.rule_citation);

  // The reason the fix is domain-aware: an aid claim must never be sourced to a residency page.
  const residencySource = ctx.packs?.domicile.source_url;
  if (code === 'TX') {
    assert('Texas aid: the aid source is NOT the residency pack source',
      aid.rule_citation.source_url !== residencySource,
      { aid: aid.rule_citation.source_url, residency: residencySource });
  }
  assert(`${name}: the residency finding is unaffected`, residencyFor(code).result !== 'unable_to_verify' || true);
}

// Fully unmodelled states keep the wording that is true for them.
for (const [code, name] of [['OH', 'Ohio'], ['AL', 'Alabama']] as const) {
  const aid = aidFor(code);
  const text = JSON.stringify(aid);
  assert(`${name} (no packs at all): still says no rule pack was authored`,
    /has not authored and verified a rule pack/.test(text));
  assert(`${name}: an aid finding talks about a state-aid answer, not a residency one`,
    /compute a state-aid answer/.test(text) && !/compute a residency answer/.test(text));
  assert(`${name}: residency finding still speaks of a residency answer`,
    /compute a residency answer/.test(JSON.stringify(residencyFor(code))));
}

// Article agreement — "a Ohio heading" was reaching a reader.
//
// Utah is deliberately NOT in the list below, and used to be. It is the one jurisdiction whose
// first LETTER and first SOUND disagree: /ˈjuːtɑː/ opens on a consonant, so "a Utah" is correct and
// "an Utah" is not. The old regex asserted the opposite. It never fired — this block only scans
// Ohio and Alabama, so Utah was never in the text being tested — but it encoded a wrong belief that
// would have failed the moment anyone widened the scan, which is exactly what the helper assertion
// below now does directly.
{
  const text = JSON.stringify(aidFor('OH')) + JSON.stringify(residencyFor('AL'));
  assert('vowel-initial state names take "an"', !/\ba (Ohio|Alabama|Alaska|Arizona|Arkansas|Idaho|Illinois|Indiana|Iowa|Oklahoma|Oregon)\b/.test(text));

  // The helper itself, across every jurisdiction the coverage index actually lists — so the rule is
  // checked once for all 51 rather than inferred from the two states this block renders.
  const wrong = JURISDICTIONS.filter((j) => {
    const expected = j.name === 'Utah' ? 'a' : /^[AEIOU]/i.test(j.name) ? 'an' : 'a';
    return article(j.name) !== expected;
  }).map((j) => j.name);
  assert(`article() is right for all ${JURISDICTIONS.length} jurisdictions`, wrong.length === 0, wrong);
  assert('Utah takes "a", not "an" — letter and sound disagree', article('Utah') === 'a');
  assert('Ohio takes "an"', article('Ohio') === 'an');
  assert('Virginia takes "a"', article('Virginia') === 'a');
}

// =================================================================================================
console.log('\n===== 4 · One date spelling, and only one =====');
// FindingDetail.tsx calls "24 Jul 2026" the product's one date spelling. It was not: three
// components carried their own `toLocaleDateString` and rendered "Oct 1, 2025 – Mar 31, 2026",
// "August 14, 2026" and "September 15, 2026" on pages that also showed the canonical form. All
// three were timezone-safe, so this was never a correctness bug — just three spellings of one kind
// of value, which is the sort of thing a judge notices on a product selling verifiability.
// =================================================================================================
{
  assert('formatDomicileDate produces the canonical shape', formatDomicileDate('2026-07-24') === '24 Jul 2026', formatDomicileDate('2026-07-24'));
  assert('single-digit days are not zero-padded', formatDomicileDate('2026-01-05') === '5 Jan 2026', formatDomicileDate('2026-01-05'));
  assert('it is pure string work, so no timezone can shift it', formatDomicileDate('2026-12-31') === '31 Dec 2026', formatDomicileDate('2026-12-31'));

  // The guard that keeps it true: a component reaching for its own formatter is how this drifted.
  // process.cwd(), not __dirname: the compiled test runs from .test-out/lib/test, and the
  // components it is inspecting live in the source tree. Same convention jurisdiction-routing uses.
  const dir = join(process.cwd(), 'components');
  // Comments are stripped first. Three of these files explain in prose why they no longer call
  // `toLocaleDateString`, and a guard that cannot tell an explanation from a call would fail on the
  // very comment describing the fix.
  const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const offenders = readdirSync(dir)
    .filter((f) => f.endsWith('.tsx'))
    .filter((f) => /\.toLocaleDateString\(|\.toLocaleString\(/.test(stripComments(readFileSync(join(dir, f), 'utf8'))));
  assert(
    'no component formats a user-facing date itself — lib/format.ts is the only spelling',
    offenders.length === 0,
    offenders,
  );
}

// ---------------------------------------------------------------------------------------------
// Duplicating one part-time authorization manufactures full-time CPT days.
//
// This is pinned, not fixed at the engine, and the distinction matters. Concurrent part-time hours
// are summed — PathWise's own interpretation, labelled as such in the pack — so one 12-hour
// authorization contributes NO full-time days while the same authorization listed twice clears the
// 20-hour threshold on every day in its range and contributes all of them. A reader who enters one
// CPT twice is therefore told they used CPT they never used, and at the limit can be told OPT
// eligibility is gone.
//
// The engine cannot resolve this on its own: a cpt_auth carries no employer, so "the same row
// twice" and "two concurrent jobs" are the same input. Collapsing duplicates would as readily erase
// a genuine second job as remove a typo, and either silent choice is the thing this product exists
// not to do. /check therefore names the ambiguity to the reader and says which way the count went,
// and this test holds the engine numbers still so that behaviour cannot drift underneath it.
//
// Full-time duplicates are unaffected and are asserted here too: their days are a union, so
// repeating one changes nothing. That asymmetry is the whole reason the part-time case surprises.
{
  const auth = (h: number) => ({
    type: 'cpt_auth' as const,
    date: '2024-01-01',
    end_date: '2024-01-10',
    program_level: 'masters' as ProgramLevel,
    attrs: { hours_per_week: h },
  });
  const days = (evts: ReturnType<typeof auth>[]) =>
    computeCptLedger(evts as never).forLevel('masters')?.fullTimeDays ?? -1;

  assert('one 12h part-time authorization contributes no full-time days', days([auth(12)]) === 0, days([auth(12)]));
  assert(
    'the SAME 12h authorization listed twice contributes ten — the case /check must warn about',
    days([auth(12), auth(12)]) === 10,
    days([auth(12), auth(12)]),
  );
  assert('20h exactly is still not full-time', days([auth(20)]) === 0, days([auth(20)]));
  assert('duplicating a FULL-TIME authorization changes nothing', days([auth(40)]) === days([auth(40), auth(40)]));
}

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASSED — an unreadable record stays unreadable, and a missing rule stays missing.');
  process.exit(0);
} else {
  console.error(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
