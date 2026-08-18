// source-urls.test.ts — no pack may cite a URL nobody has checked.
//
// Run: npm run test:sources
//
// THE ACCIDENT THIS EXISTS TO PREVENT
//
// PathWise shipped to production with both Virginia source URLs returning a real SCHEV 404. The
// packs said "Verified on 24 Jul 2026" and the finding screens offered "Read the source →", and the
// button landed on "Page Not Found". Nothing in the suite noticed, because nothing in the suite had
// ever looked at a URL. For a product whose entire claim is that a reader can go and check, that is
// the worst class of defect available: the citation was not wrong, it was unreachable, and only a
// reader who took us at our word would ever find out.
//
// WHY THIS TEST DOES NOT USE THE NETWORK
//
// The tempting version fetches every URL and asserts a good status. Measured against these actual
// 55 URLs, 11 of them refuse automated clients — Cloudflare interstitials, CloudFront rejections,
// plain 403s — while serving a human perfectly. A test that called those dead would fail constantly,
// be switched off within a week, and be silent on the day it mattered. It would also put conference
// wifi on the critical path of `npm test`.
//
// So the network lives in scripts/check-source-urls.mjs, a human reviews what it found, and the
// result is committed as source-urls.verified.json. This test is pure and offline: it compares the
// packs against that record. Adding or changing a source URL fails here until someone has actually
// checked it — which is exactly the step that was missing.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
// Lives beside lib/rulepacks/ rather than inside it: jurisdiction-routing.test.ts scans that
// directory and asserts no shared file names a single state's authority, and this manifest names
// many. It describes the packs; it is not one of them.
import manifest from '../source-urls.verified.json';

let failures = 0;
function assert(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}`, extra ?? '');
  }
}

/** Every https URL any pack cites, wherever it sits in the structure. */
function collect(dir: string): Map<string, string[]> {
  const urls = new Map<string, string[]>();
  const walk = (node: unknown, file: string, path: string): void => {
    if (typeof node === 'string') {
      if (/^https?:\/\//.test(node)) {
        if (!urls.has(node)) urls.set(node, []);
        urls.get(node)!.push(`${file}${path}`);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, file, `${path}[${i}]`));
      return;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) walk(v, file, `${path}.${k}`);
    }
  };
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    walk(JSON.parse(readFileSync(join(dir, file), 'utf8')), file, '');
  }
  return urls;
}

// process.cwd(), not __dirname: this must inspect the rule packs in the SOURCE tree, not the
// copies tsc emits beside the compiled test. Same convention jurisdiction-routing.test.ts uses.
const PACK_DIR = join(process.cwd(), 'lib', 'rulepacks');
const cited = collect(PACK_DIR);
const known = manifest.urls as Record<string, { status: string; observed?: string }>;

console.log(`\n===== SOURCE URLS (${cited.size} cited across the rule packs) =====\n`);

assert('the packs cite at least one source URL', cited.size > 0, cited.size);

// 1 · https only. An http citation for a legal source is a downgrade attack waiting to happen and
//     several of these hosts do not redirect.
{
  const insecure = [...cited.keys()].filter((u) => !u.startsWith('https://'));
  assert('every cited source URL is https', insecure.length === 0, insecure);
}

// 2 · Nothing cited is known-dead. This is the assertion that would have caught the SCHEV 404.
{
  const dead = [...cited.keys()].filter((u) => known[u]?.status === 'dead');
  assert(
    'no pack cites a URL recorded as dead',
    dead.length === 0,
    dead.map((u) => `${u} <- ${cited.get(u)!.join(', ')}`),
  );
}

// 3 · Nothing cited is unchecked. A URL that is edited or added without anyone opening it fails
//     here, which is the whole point: the manifest is the record that a human looked.
{
  const unchecked = [...cited.keys()].filter((u) => !known[u]);
  assert(
    'every cited URL appears in source-urls.verified.json (run `npm run check:sources` after changing one)',
    unchecked.length === 0,
    unchecked.map((u) => `${u} <- ${cited.get(u)!.join(', ')}`),
  );
}

// 4 · Nothing is left in the "a machine could not resolve this and nobody looked" state.
{
  const pending = [...cited.keys()].filter((u) => known[u]?.status === 'unverified');
  assert(
    'no cited URL is still awaiting a human check',
    pending.length === 0,
    pending.map((u) => `${u} — open it in a browser, then record it in the manifest`),
  );
}

// 5 · The manifest does not rot in the other direction: an entry for a URL no pack cites any more is
//     harmless, but a manifest that has drifted far from the packs is not being maintained.
{
  const orphans = Object.keys(known).filter((u) => !cited.has(u));
  assert('the manifest has no stale entries for URLs no pack cites', orphans.length === 0, orphans);
}

// 6 · The two Virginia packs specifically — the only fully modelled jurisdiction, and the entire
//     demo path. Named rather than left to the general rule because this is the pair that broke.
{
  for (const [file, label] of [
    ['va-domicile.json', 'Virginia domicile'],
    ['va-aid.json', 'Virginia aid'],
  ] as const) {
    const theirs = [...cited.entries()].filter(([, where]) => where.some((w) => w.startsWith(file)));
    assert(`${label}: cites at least one source URL`, theirs.length > 0);
    assert(
      `${label}: every cited URL is live`,
      theirs.every(([u]) => known[u]?.status === 'live' || known[u]?.status === 'live_confirmed_in_browser'),
      theirs.map(([u]) => `${u} = ${known[u]?.status ?? 'MISSING'}`),
    );
  }
}

// 7 · Every jurisdiction the coverage file claims a verified source for must actually have one in
//     the manifest — the screens render these as "Official <state> source →".
{
  const coverage = JSON.parse(readFileSync(join(PACK_DIR, 'coverage.json'), 'utf8')) as {
    jurisdictions: { code: string; source_url?: string; aid_source_url?: string }[];
  };
  const bad: string[] = [];
  for (const j of coverage.jurisdictions ?? []) {
    for (const u of [j.source_url, j.aid_source_url]) {
      if (!u) continue;
      const s = known[u]?.status;
      if (s !== 'live' && s !== 'live_confirmed_in_browser') bad.push(`${j.code}: ${u} = ${s ?? 'MISSING'}`);
    }
  }
  assert('every jurisdiction source link the coverage file offers a reader resolves', bad.length === 0, bad);
}

// 6 · Human review survives the machine.
//
// `npm run check:sources` re-probes every URL and rewrites this manifest. It used to keep a human's
// `live_confirmed_in_browser` note only when the fresh probe FAILED; when a host answered 200 the
// curated entry was replaced with a bare "HTTP 200". One run destroyed thirteen review notes,
// including the one recording that tn.gov resets automated clients intermittently and is not dead —
// exactly the knowledge the next person needs when it flakes again. A machine re-reaching a page is
// the weaker of the two observations, not the newer one.
//
// This test does not exercise the script; it guards the artefact the script writes, which is what a
// careless run actually damages. If these annotations thin out, someone has overwritten review with
// automation and the suite says so before it reaches a commit.
{
  const humanReviewed = Object.entries(known).filter(
    ([, v]) => v.status === 'live_confirmed_in_browser',
  );
  assert(
    'human browser confirmations are still on file (check:sources must not overwrite review)',
    humanReviewed.length >= 12,
    `${humanReviewed.length} entries carry live_confirmed_in_browser; expected at least 12`,
  );
  // A confirmation with no reasoning is not review. Each must still say what the human saw.
  const empty = humanReviewed.filter(([, v]) => !v.observed || v.observed.trim().length < 20);
  assert(
    'every human confirmation still carries the observation that justifies it',
    empty.length === 0,
    empty.map(([u]) => u),
  );
}

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASSED — every cited source URL has been checked, and none is dead.');
  process.exit(0);
} else {
  console.error(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
