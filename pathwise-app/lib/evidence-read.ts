// evidence-read.ts — the browser half of the evidence flow.
//
// This is the only place in PathWise that touches a file, and it does exactly three things: read the
// bytes, count them, and fingerprint them. There is no upload, no FileReader left holding the
// contents, no copy kept: the ArrayBuffer goes out of scope when this function returns, and what
// survives is a LocalFileRead — a name, a size, and a hash.
//
// Split from evidence.ts so the record-building stays pure and testable under plain node; everything
// that needs a browser is here.

import type { LocalFileRead } from './types';
import { SAMPLE_DOCUMENT_FILENAME, buildSampleDocumentContent } from './evidence';

/** Bytes → lowercase hex. */
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SubtleCrypto is only exposed on secure origins (https, or localhost). On anything else it is
 * simply absent — so the fingerprint is reported as unavailable rather than invented. The bytes are
 * still genuinely read either way, which is the claim the screen actually makes.
 */
async function sha256Of(bytes: ArrayBuffer): Promise<string | undefined> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return undefined;
  try {
    return toHex(await subtle.digest('SHA-256', bytes));
  } catch {
    return undefined;
  }
}

/** File.lastModified (epoch ms) → 'YYYY-MM-DD', or undefined when the browser doesn't supply one. */
function lastModifiedDate(file: File): string | undefined {
  if (!file.lastModified) return undefined;
  const d = new Date(file.lastModified);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/**
 * Read a file the student chose, on their device, and return only what was learned from it.
 *
 * `sizeBytes` is taken from the buffer actually read, not from `file.size` — so the number on screen
 * is the number of bytes that genuinely passed through, rather than a property we were handed.
 */
export async function readLocalFile(
  file: File,
  origin: LocalFileRead['origin'],
): Promise<LocalFileRead> {
  const bytes = await file.arrayBuffer();
  const sha256 = await sha256Of(bytes);

  return {
    fileName: file.name,
    sizeBytes: bytes.byteLength,
    mimeType: file.type || 'unknown',
    lastModified: lastModifiedDate(file),
    sha256,
    readAt: new Date().toISOString(),
    origin,
  };
}

/**
 * A real file, built in the browser, for walking through the flow without a real I-20 to hand. It
 * goes through `readLocalFile` like anything else — the read is not simulated, only the document is
 * a stand-in, and `origin: 'sample'` says so everywhere it travels.
 */
export function makeSampleDocument(): File {
  return new File([buildSampleDocumentContent()], SAMPLE_DOCUMENT_FILENAME, {
    type: 'text/plain',
    lastModified: Date.now(),
  });
}
