// evidence.ts — turning a file the student picked into a real Evidence record.
//
// PathWise reads the BYTES of a document, never the words. There is no OCR here and no extraction:
// what comes back is a fingerprint and a size, which is exactly enough to say truthfully that the
// file was read on this device, and not one word more than that.
//
// The consequence is deliberate and is the honest part of this flow. Because PathWise cannot know
// what the document says, an event built from it is `asserted` — the student attests what the
// document records — never `confirmed` and never `extracted`. The same discipline the engines apply
// to a missing rule, applied to our own evidence handling.
//
// Everything in this file is pure: same read in, same record out. No browser APIs, no clock, no
// network, nothing stored. The browser half lives in evidence-read.ts.

import type { DocType, Evidence, Event, LocalFileRead } from './types';

/** The document the "What changed?" flow is missing, and the event it would establish. */
export const LEVEL_CHANGE_DOC_TYPE: DocType = 'I-20';

/**
 * The id an Evidence record gets. Derived from the fingerprint of the bytes actually read, so the
 * same document always yields the same id and two different documents never collide. Where no hash
 * could be computed, the read timestamp stands in — visibly different, so it cannot be mistaken for
 * a content-derived id.
 */
export function evidenceIdFor(read: LocalFileRead): string {
  return read.sha256 ? `ev-${read.sha256.slice(0, 12)}` : `ev-unhashed-${read.readAt}`;
}

/**
 * Build the Evidence record for a file that was read locally.
 *
 * `extracted` is left empty because nothing was extracted. That is not a gap to be filled later with
 * a guess — it is the accurate statement of what this flow does.
 */
export function evidenceFromLocalRead(
  read: LocalFileRead,
  opts: { docType: DocType },
): Evidence {
  return {
    id: evidenceIdFor(read),
    doc_type: opts.docType,
    file_ref: read.fileName,
    extracted: {},
    user_corrected: false,
    local: read,
  };
}

/**
 * The level-change event this evidence is attested to establish: School X (bachelor's) → School Y
 * (master's), dated to the master's program start already on Priya's record.
 *
 * `confidence: 'asserted'` is the whole point. The document is attached and its bytes were read, but
 * the claim that it RECORDS the level change comes from the student, so the record says so.
 */
export function levelChangeEventFromEvidence(evidence: Evidence): Event {
  return {
    id: 'level-change-x-to-y',
    type: 'level_change',
    date: '2024-01-16', // the master's program start at School Y
    institution_id: 'schoolY',
    program_level: 'masters',
    attrs: { from_level: 'bachelors', from_institution: 'schoolX' },
    evidence_ids: [evidence.id],
    confidence: 'asserted',
  };
}

// ---- display helpers (shared by the screen, so the copy cannot drift from the record) ----

/** 284_113 → "277 KB". Binary units, one decimal only where it earns its place. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} ${bytes === 1 ? 'byte' : 'bytes'}`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** The fingerprint, short enough to read aloud but long enough to be a fingerprint. */
export function shortHash(read: LocalFileRead): string | undefined {
  return read.sha256 ? read.sha256.slice(0, 16) : undefined;
}

/**
 * The one sentence stating what PathWise actually did with the file. Every number in it comes off
 * the read itself, so the screen cannot claim a byte more than was read.
 */
export function describeRead(read: LocalFileRead): string {
  const hash = shortHash(read);
  const fingerprint = hash
    ? `and fingerprinted it — SHA-256 ${hash}…`
    : 'and counted its bytes (this browser exposes no hashing on an insecure origin, so no fingerprint is shown rather than a made-up one)';
  return (
    `PathWise read ${read.fileName} in this tab — ${formatBytes(read.sizeBytes)} — ${fingerprint} ` +
    `It did not read the words inside it, and the file was never uploaded.`
  );
}

// ---- the sample document ----
//
// A walkthrough needs to reach the recompute without a real I-20 on hand. The honest way to do that
// is not to skip the read — it is to build a real file in the browser and put it through the exact
// same path, carrying `origin: 'sample'` so nothing downstream can mistake it for the student's own
// document. Its bytes are these bytes; its hash is a hash of these bytes.

export const SAMPLE_DOCUMENT_FILENAME = 'sample-level-change-i20.txt';

export function buildSampleDocumentContent(): string {
  return [
    'PATHWISE SAMPLE DOCUMENT — NOT A REAL FORM I-20',
    '',
    'This file was generated inside your browser so the "What changed?" walkthrough can be',
    'followed without a real immigration document on hand.',
    '',
    'It stands in for: Form I-20 recording a level change,',
    "School X (bachelor's) -> School Y (master's), issued for the master's program.",
    '',
    'PathWise reads the bytes of this file and computes their SHA-256 fingerprint, exactly as it',
    'would for a document you picked yourself. It does not read the words on this page, and this',
    'file is never uploaded anywhere.',
  ].join('\n');
}
