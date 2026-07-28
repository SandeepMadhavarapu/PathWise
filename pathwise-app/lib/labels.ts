// labels.ts — how an internal identifier is said out loud.
//
// The engines address events and evidence by id, which is correct: an id is stable, unique and
// exactly what a reasoning step needs to point at. What it is not is something to show a student.
// The finding screens were rendering those ids raw — `event · prog-start-z`, `doc ·
// tax_filing_evidence` — which is the single loudest "this is a developer tool" signal in a product
// whose whole argument is that it explains itself.
//
// So: ids stay in the engines and stay in the DOM's data, and this module is the one place that
// turns one into a sentence. Nothing here is a rule. If an id is not recognised it is humanised
// rather than hidden, because a slightly awkward label is still better than a token — and better
// than silently dropping a source the finding actually rests on.
//
// `titleFor`/`evidenceLabel` were previously private to JourneyTimeline; they are here now so the
// timeline, the finding detail and the domicile analysis cannot disagree about what an event is
// called.

import type { Event } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const month = MONTHS[Number(m) - 1];
  if (!month) return iso;
  return `${Number(d)} ${month} ${y}`;
}

/** What an event TYPE is called. */
export function eventTypeLabel(type: string): string {
  switch (type) {
    case 'program_start': return 'Program start';
    case 'program_end': return 'Program end';
    case 'cpt_auth': return 'CPT authorization';
    case 'opt_auth': return 'OPT authorization';
    case 'ead_issued': return 'EAD issued';
    case 'i20_issued': return 'I-20 issued';
    case 'enrollment': return 'Enrollment';
    case 'transfer': return 'Transfer';
    case 'level_change': return 'Level change';
    case 'employment': return 'Employment';
    case 'status_change': return 'Status change';
    case 'admission_applied': return 'Applied for admission';
    case 'admission_accepted': return 'Admission accepted';
    case 'move_in': return 'Moved in';
    case 'lease_signed': return 'Lease signed';
    case 'license_issued': return 'Driver’s license issued';
    case 'job_offer_signed': return 'Job offer signed';
    default: return humanizeToken(type);
  }
}

/** What a piece of evidence is, from the shape of its id. */
export function evidenceLabel(id: string): string {
  if (id.startsWith('i20')) return 'Form I-20';
  if (id.startsWith('ead')) return 'EAD card';
  if (id.startsWith('offer')) return 'Offer letter';
  if (id.startsWith('lease')) return 'Lease';
  if (id.startsWith('tax')) return 'Tax return';
  if (id.startsWith('adm')) return 'Admission letter';
  return 'Document';
}

/** `some_internal_id` / `some-internal-id` → `Some internal id`. The last-resort readable form. */
export function humanizeToken(token: string): string {
  const words = token.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * One event, named the way the timeline names it, with its date so two authorizations of the same
 * kind are distinguishable. Falls back to a humanised id for an event not on the record handed in.
 */
export function describeEvent(id: string, events: readonly Event[]): string {
  const ev = events.find((e) => e.id === id);
  if (!ev) return humanizeToken(id);
  return `${eventTypeLabel(ev.type)} · ${formatShortDate(ev.date)}`;
}

/** One piece of evidence, named for what it is rather than what it is keyed by. */
export function describeEvidence(id: string): string {
  return evidenceLabel(id);
}
