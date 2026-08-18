// check-source-urls.mjs — resolve every source URL the rulepacks cite, and refresh the manifest.
//
// Run: npm run check:sources
//
// WHY THIS IS A SCRIPT AND NOT A TEST
//
// The obvious version of this is a test that fetches every source_url and fails on a bad status.
// That test would be worse than nothing here, for two reasons measured against these actual URLs:
//
//   · State agencies bot-block. Of the 55 URLs these packs cite, 13 answer 403/405/503 or refuse the
//     connection entirely to an automated client while serving a real browser perfectly. A test that
//     called those dead would cry wolf until someone switched it off, and the one time it was right
//     nobody would be listening.
//   · It would put the network on the critical path of `npm test`. A judge running the suite on
//     conference wifi would watch it fail for reasons that have nothing to do with the code.
//
// So the split is: this script goes to the network and reports; the manifest records what a human
// concluded; and lib/test/source-urls.test.ts checks the packs against the manifest OFFLINE. The
// test is deterministic and always runs. What it prevents is the specific accident that shipped a
// 404 to production: a URL changing, or a new one being added, without anyone checking it.
//
// A status this script cannot resolve is never silently promoted to "live". It is reported as
// `unverified` and a person has to look.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK_DIR = join(HERE, '..', 'lib', 'rulepacks');
// Deliberately NOT inside lib/rulepacks/: that directory is scanned by
// jurisdiction-routing.test.ts, which asserts every non-jurisdiction file there names no single
// state's authority. This manifest necessarily names many. It describes the packs; it is not one.
const MANIFEST = join(HERE, '..', 'lib', 'source-urls.verified.json');

// A real desktop UA. Not to evade anything — several of these hosts serve a different (or no)
// response to a bare Node client, and the question being asked is "does this work for a reader".
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/** Every https URL any pack cites, wherever it sits in the structure. */
export function collectSourceUrls(packDir = PACK_DIR) {
  const urls = new Map(); // url -> Set of "file:jsonpath"
  for (const file of readdirSync(packDir).filter((f) => f.endsWith('.json'))) {
    const json = JSON.parse(readFileSync(join(packDir, file), 'utf8'));
    walk(json, file, '', urls);
  }
  return urls;
}

function walk(node, file, path, urls) {
  if (typeof node === 'string') {
    if (/^https?:\/\//.test(node)) {
      if (!urls.has(node)) urls.set(node, new Set());
      urls.get(node).add(`${file}${path}`);
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, file, `${path}[${i}]`, urls));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walk(v, file, `${path}.${k}`, urls);
  }
}

/**
 * Classify one URL.
 *
 * `dead` is deliberately narrow — only 404/410, the two codes that mean "this page is not here".
 * Everything else a machine cannot resolve is `unverified`, which is a request for a human, not a
 * verdict. Calling a bot-blocked government site "dead" is exactly the false positive that would
 * make this whole mechanism useless.
 */
async function classify(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(25_000),
    });
    const body = res.status === 200 ? (await res.text()).slice(0, 4000) : '';
    // Some CMSes serve a 200 with a "page not found" body. Catch the obvious ones.
    const softDead = /page not found|<title>[^<]*404/i.test(body);
    if (res.status === 404 || res.status === 410) return { status: 'dead', observed: `HTTP ${res.status}` };
    if (softDead) return { status: 'dead', observed: `HTTP 200 but body reads "page not found"` };
    if (res.status === 200) return { status: 'live', observed: `HTTP 200` };
    return { status: 'unverified', observed: `HTTP ${res.status} — needs a human in a real browser` };
  } catch (err) {
    return { status: 'unverified', observed: `no response to an automated client (${String(err.message).slice(0, 60)})` };
  }
}

const urls = collectSourceUrls();
const prev = (() => { try { return JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch { return { urls: {} }; } })();

console.log(`Resolving ${urls.size} distinct source URLs from the rulepacks…\n`);
const out = {};
let dead = 0, unverified = 0, live = 0, preserved = 0;
const conflicts = [];
for (const [url, where] of urls) {
  const r = await classify(url);
  const carried = prev.urls?.[url];
  // A human confirmation already on file survives a machine's inability to reach the host. It does
  // NOT survive a 404: a page that has gone is gone whatever anyone concluded last month.
  //
  // It also has to survive a SUCCESS, which is the case this originally got wrong. The old
  // condition preserved a human note only when the fresh probe came back `unverified`; when the
  // host answered 200 the curated entry was replaced with a bare "HTTP 200". That silently
  // destroyed thirteen review notes in one run — among them the one recording that tn.gov resets
  // automated clients intermittently and is not dead, which is precisely the knowledge someone
  // needs the next time it flakes. A machine re-reaching a page is not new information about a
  // page a human has already been to; it is the weaker observation of the two.
  const humanReviewed = carried?.status === 'live_confirmed_in_browser';
  const final =
    r.status === 'dead'
      ? r
      : humanReviewed
        ? { status: carried.status, observed: carried.observed, ...(carried.confirmed_on ? { confirmed_on: carried.confirmed_on } : {}) }
        : r;
  // A human entry that a fresh probe now calls dead is the one case a person must look at: it is
  // reported rather than quietly overwritten, and the dead status is what gets written.
  if (humanReviewed && r.status === 'dead') {
    conflicts.push({ url, was: carried.observed, now: r.observed });
  }
  if (humanReviewed && r.status !== 'dead') preserved++;
  out[url] = { ...final, cited_by: [...where].sort() };
  if (final.status === 'dead') dead++;
  else if (final.status === 'unverified') unverified++;
  else live++;
  const tag = final.status === 'dead' ? 'DEAD' : final.status === 'unverified' ? 'CHECK' : 'ok';
  console.log(`  ${tag.padEnd(6)} ${final.observed.padEnd(52)} ${url}`);
}

if (preserved > 0) {
  console.log(`
  ${preserved} human-reviewed entr${preserved === 1 ? 'y' : 'ies'} preserved unchanged.`);
}
if (conflicts.length > 0) {
  console.log(`
  *** ${conflicts.length} human-reviewed URL(s) now look DEAD. A person must decide:`);
  for (const c of conflicts) console.log(`      ${c.url}
        was: ${c.was}
        now: ${c.now}`);
}

writeFileSync(
  MANIFEST,
  JSON.stringify(
    {
      note:
        'Generated by scripts/check-source-urls.mjs and reviewed by a human. lib/test/source-urls.test.ts ' +
        'checks the packs against this file OFFLINE, so the suite never depends on the network. ' +
        'A URL that is not in this file, or is marked dead, fails the test. "unverified" means an ' +
        'automated client could not resolve it and a person must open it in a browser; ' +
        '"live_confirmed_in_browser" records that someone did.',
      checked_on: new Date().toISOString().slice(0, 10),
      urls: out,
    },
    null,
    2,
  ) + '\n',
);

console.log(`\n${live} live · ${unverified} need a human · ${dead} dead`);
console.log(`Manifest written: ${MANIFEST}`);
if (dead > 0) {
  console.error(`\n${dead} DEAD URL(S). Fix the pack before committing.`);
  process.exit(1);
}
