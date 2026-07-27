// evidence-flow.test.ts — locks the evidence flow AND the demo numbers it must not have moved.
//
// Run: npm run test:evidence
//
// Two jobs. First, that the evidence record is genuinely derived from a read rather than invented:
// a real id, a real file_ref, a real fingerprint, an empty `extracted` (because nothing was
// extracted), and an event that carries the evidence at `asserted` confidence.
//
// Second, and the reason this file exists at all: that making the evidence real did NOT change a
// single number the engine produces. The ledger reads `cpt_auth` events only, so attaching the
// level-change event must leave 342 / 54 / 23 and the pooled 552 exactly where they were.
//
// Covers both halves. The pure builders run anywhere; the browser half (lib/evidence-read.ts) needs
// File and SubtleCrypto, and Node 20 supplies both — so the actual read path is exercised here
// rather than taken on trust, and its fingerprint is cross-checked against node:crypto.

import { createHash } from 'node:crypto';
import { computeCptLedger } from '../engines/cpt-ledger';
import {
  LEVEL_CHANGE_DOC_TYPE,
  SAMPLE_DOCUMENT_FILENAME,
  buildSampleDocumentContent,
  describeRead,
  evidenceFromLocalRead,
  evidenceIdFor,
  formatBytes,
  levelChangeEventFromEvidence,
} from '../evidence';
import { makeSampleDocument, readLocalFile } from '../evidence-read';
import { priyaEvents } from '../fixtures/priya';
import type { Event, LocalFileRead } from '../types';

let failures = 0;
function assert(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}`, extra ?? '');
  }
}

// A read exactly as readLocalFile would hand it back: measured facts, nothing about the contents.
const READ: LocalFileRead = {
  fileName: 'i20-masters.pdf',
  sizeBytes: 284_113,
  mimeType: 'application/pdf',
  lastModified: '2024-01-16',
  sha256: '9f2ac41bd3e5087c6a1f4b2e9d0c7a58316be4f0d2c9a7b5e83f1049c6d2ab7e',
  readAt: '2026-07-27T10:15:00.000Z',
  origin: 'picked',
};

console.log('Evidence record — derived from the read, not invented');

const evidence = evidenceFromLocalRead(READ, { docType: LEVEL_CHANGE_DOC_TYPE });

assert('id is derived from the fingerprint', evidence.id === `ev-${READ.sha256!.slice(0, 12)}`, evidence.id);
assert('id is stable for the same read', evidenceIdFor(READ) === evidence.id);
assert('file_ref is the file actually read', evidence.file_ref === READ.fileName, evidence.file_ref);
assert('doc_type is the slot being filled', evidence.doc_type === 'I-20', evidence.doc_type);
assert('the read is carried on the record', evidence.local?.sha256 === READ.sha256);
assert('bytes read are carried', evidence.local?.sizeBytes === 284_113, evidence.local?.sizeBytes);
// The whole point of the fix: no extraction is claimed, because no extraction happened.
assert('extracted is empty — nothing was extracted', Object.keys(evidence.extracted).length === 0, evidence.extracted);
assert('user_corrected is false', evidence.user_corrected === false);

console.log('\nAn unhashable read is marked, never faked');
const noHash: LocalFileRead = { ...READ, sha256: undefined };
const noHashEvidence = evidenceFromLocalRead(noHash, { docType: LEVEL_CHANGE_DOC_TYPE });
assert('id says so rather than inventing a hash', noHashEvidence.id.startsWith('ev-unhashed-'), noHashEvidence.id);
assert('describeRead does not claim a fingerprint', !describeRead(noHash).includes('SHA-256'), describeRead(noHash));
assert('describeRead states it read no words', describeRead(READ).includes('did not read the words'));

console.log('\nA sample can never read as the student’s own document');
const sample = evidenceFromLocalRead({ ...READ, origin: 'sample' }, { docType: LEVEL_CHANGE_DOC_TYPE });
assert('origin survives onto the record', sample.local?.origin === 'sample', sample.local?.origin);

console.log('\nThe event the evidence produces');

const levelChange = levelChangeEventFromEvidence(evidence);

assert('evidence is actually attached', JSON.stringify(levelChange.evidence_ids) === JSON.stringify([evidence.id]), levelChange.evidence_ids);
// PathWise read the bytes, not the words — so the claim is the student's, and the record says so.
assert("confidence is 'asserted', not 'confirmed'", levelChange.confidence === 'asserted', levelChange.confidence);
assert('it is a level_change event', levelChange.type === 'level_change', levelChange.type);
assert('it sits at the master’s level', levelChange.program_level === 'masters', levelChange.program_level);

console.log('\nENGINE OUTPUT UNCHANGED — the demo numbers must not have moved');

const settledEvents: Event[] = [...priyaEvents, levelChange];
const settledLedger = computeCptLedger(settledEvents);
const masters = settledLedger.forLevel('masters');
const bachelors = settledLedger.forLevel('bachelors');

assert('masters full-time days === 342', masters?.fullTimeDays === 342, masters?.fullTimeDays);
assert('masters overlap days === 54', masters?.overlapDays === 54, masters?.overlapDays);
assert('masters daysToCliff === 23', masters?.daysToCliff === 23, masters?.daysToCliff);
assert('masters band === amber', masters?.band === 'amber', masters?.band);
assert('masters still OPT-eligible', masters?.optEligible === true, masters?.optEligible);
assert('bachelors partitioned at 210', bachelors?.fullTimeDays === 210, bachelors?.fullTimeDays);

// The ledger reads cpt_auth events only, so attaching the level-change event must be inert.
// If this ever fails, the evidence flow has started moving arithmetic it has no business moving.
const withoutEvidence = computeCptLedger(priyaEvents).forLevel('masters');
assert(
  'attaching evidence leaves the ledger untouched',
  withoutEvidence?.fullTimeDays === masters?.fullTimeDays &&
    withoutEvidence?.daysToCliff === masters?.daysToCliff,
  { withoutEvidence: withoutEvidence?.fullTimeDays, withEvidence: masters?.fullTimeDays },
);

// Reading B — the same authorizations with the level change unproven. The gray "unable to verify"
// state is derived from these two disagreeing, so the pooled count has to stay put too.
const pooledEvents: Event[] = priyaEvents.map((e) =>
  e.type === 'cpt_auth' ? { ...e, program_level: 'masters' as const } : e,
);
const pooled = computeCptLedger(pooledEvents).forLevel('masters');
assert('pooled reading === 552', pooled?.fullTimeDays === 552, pooled?.fullTimeDays);
assert('pooled reading loses OPT', pooled?.optEligible === false, pooled?.optEligible);
assert(
  'the two readings still disagree (this is what makes the finding gray)',
  masters?.optEligible !== pooled?.optEligible,
);

console.log('\nDisplay helpers');
assert('formatBytes — bytes', formatBytes(512) === '512 bytes', formatBytes(512));
assert('formatBytes — KB', formatBytes(284_113) === '277 KB', formatBytes(284_113));
assert('formatBytes — MB', formatBytes(5_242_880) === '5.0 MB', formatBytes(5_242_880));

/**
 * The read itself, run for real. This is the assertion the whole change exists to earn: the bytes
 * are genuinely passed over, and the fingerprint on screen is a true SHA-256 of those exact bytes —
 * cross-checked here against an independent implementation.
 */
async function testTheRead() {
  console.log('\nThe read, actually performed');

  const content = buildSampleDocumentContent();
  const expectedBytes = Buffer.byteLength(content, 'utf8');
  const expectedHash = createHash('sha256').update(content, 'utf8').digest('hex');

  const file = makeSampleDocument();
  assert('sample document is a real File', file instanceof File, typeof file);
  assert('sample is named as a sample', file.name === SAMPLE_DOCUMENT_FILENAME, file.name);

  const read = await readLocalFile(file, 'sample');

  assert('every byte was read', read.sizeBytes === expectedBytes, { got: read.sizeBytes, expectedBytes });
  // If this passes, the file's contents genuinely went through the hash — it cannot be faked.
  assert('sha256 is a true hash of those bytes', read.sha256 === expectedHash, { got: read.sha256, expectedHash });
  assert('mime type is carried', read.mimeType === 'text/plain', read.mimeType);
  assert('origin is sample', read.origin === 'sample', read.origin);
  assert('readAt is a real timestamp', !Number.isNaN(Date.parse(read.readAt)), read.readAt);

  const fromRead = evidenceFromLocalRead(read, { docType: LEVEL_CHANGE_DOC_TYPE });
  assert('the id traces back to the real hash', fromRead.id === `ev-${expectedHash.slice(0, 12)}`, fromRead.id);
  assert('still no extraction claimed', Object.keys(fromRead.extracted).length === 0);

  // A different document must produce a different fingerprint, or the id means nothing.
  const other = new File(['a different document entirely'], 'other.txt', { type: 'text/plain' });
  const otherRead = await readLocalFile(other, 'picked');
  assert('a different file fingerprints differently', otherRead.sha256 !== read.sha256, otherRead.sha256);
}

void testTheRead().then(() => {
  console.log('');
  if (failures === 0) {
    console.log('ALL TESTS PASSED — evidence is real, and 342 / 54 / 23 / 552 are unchanged.');
    process.exit(0);
  } else {
    console.error(`${failures} TEST(S) FAILED`);
    process.exit(1);
  }
});
