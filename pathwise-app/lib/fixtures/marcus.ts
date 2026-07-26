// marcus.ts — the second example student. He exists to show Engine B doing the work, not refusing.
//
// Priya's record ends at the gate: F-1 status, and SCHEV Part II §03(A) closes domicile before any
// other question is reached. That refusal is the honest answer, but it is only ever one branch of
// the engine. Marcus is the other branch — and he is deliberately the same person a year later:
//
//   - He was on F-1 himself until 2019, when he became a lawful permanent resident. The gate reads
//     the same clause for him and does not fire, so the analysis runs on.
//   - He is 22 at the term he is claiming, under the pack's dependency threshold, so he is
//     rebuttably presumed dependent — and the presumption is rebutted by the record itself, not by
//     an assertion: his master's program is on the timeline, which is the pack's
//     "graduate or professional student" exception.
//   - His intent factors are a realistic mix, and every branch of §06(B) is exercised:
//       * continuous residence since the move from Maryland — primary, and NOT an auxiliary act;
//       * a Virginia driver's licence — secondary, and one of the four acts the pack's
//         auxiliary-acts warning names, so it carries little weight;
//       * a summer co-op — the pack's own caveat on the employment factor takes it back out
//         entirely ("Co-op employment confers no domicile"), which is exactly the fact a student
//         would assume helps most;
//       * a signed Virginia job offer — primary, and the LAST qualifying factor, which is what
//         actually starts his clock;
//       * voter registration — INAPPLICABLE, because the pack's own inapplicable_when clause
//         excludes it for anyone who is not a citizen. Not a gap; not a failure. Inapplicable.
//       * Virginia income tax — not on record, so it stays an open question rather than a guess.
//   - The counterintuitive result, and the reason this fixture is shaped this way: the job offer is
//     the strongest evidence of intent he has, and it is the very thing that pushes his earliest
//     in-state term out to June 2027. The clock starts at the LAST qualifying factor, not the first
//     (§05(C)(1)) — so continuous residence since August 2024 does not get him there.
//
// Every rule named above lives in rulepacks/va-domicile.json. Nothing here asserts a rule; this
// file is only facts.

import type { Student, Event } from '../types';
import type { DomicileInput } from '../engines/domicile-gate';

export const marcusStudent: Student = {
  id: 'marcus',
  immigration: {
    status: 'LPR',
    status_since: '2019-03-04',
    // He arrived on the same student visa Priya holds. The prior status is why his record is
    // "complex" in the pack's sense, and the engine says so.
    prior_statuses: [{ status: 'F1', from: '2015-08-18', to: '2019-03-03' }],
  },
  dob: '2004-02-09',
  institutions: [
    { id: 'nova', name: 'Northern Virginia Community College', state: 'VA', level: 'bachelors' },
    { id: 'schoolZ', name: 'School Z', state: 'VA', level: 'masters' },
  ],
  jurisdiction_history: [
    { state: 'MD', from: '2015-08-18', to: '2024-07-31' },
    { state: 'VA', from: '2024-08-01' },
  ],
};

export const marcusEvents: Event[] = [
  // The move out of Maryland — where continuous Virginia residence begins.
  {
    id: 'mv-va',
    type: 'physical_move',
    date: '2024-08-01',
    jurisdiction: 'VA',
    attrs: { from_state: 'MD' },
    evidence_ids: ['lease-va'],
    confidence: 'extracted',
  },
  {
    id: 'lease-va-signed',
    type: 'lease_signed',
    date: '2024-07-18',
    jurisdiction: 'VA',
    attrs: { term_months: 12 },
    evidence_ids: ['lease-va'],
    confidence: 'extracted',
  },
  { id: 'enrol-nova', type: 'enrollment', date: '2024-08-26', institution_id: 'nova', program_level: 'bachelors', attrs: {}, evidence_ids: [], confidence: 'confirmed' },
  {
    id: 'lic-va',
    type: 'license_issued',
    date: '2024-09-12',
    jurisdiction: 'VA',
    attrs: {},
    evidence_ids: ['lic-va-doc'],
    confidence: 'extracted',
  },
  // The co-op. On paper it is employment in Virginia; under the pack's caveat it confers no
  // domicile at all.
  {
    id: 'emp-coop',
    type: 'employment',
    date: '2025-05-19',
    end_date: '2025-08-15',
    jurisdiction: 'VA',
    attrs: { hours_per_week: 40, is_coop: true, employer: 'Dominion Systems (co-op)' },
    evidence_ids: ['coop-letter'],
    confidence: 'confirmed',
  },
  // Two admission milestones. The auxiliary-acts warning qualifies one of its acts as
  // "post_admission", so the timeline has to be able to date admission — it can.
  { id: 'adm-applied-z', type: 'admission_applied', date: '2025-11-03', institution_id: 'schoolZ', program_level: 'masters', attrs: {}, evidence_ids: [], confidence: 'confirmed' },
  { id: 'adm-accepted-z', type: 'admission_accepted', date: '2026-01-15', institution_id: 'schoolZ', program_level: 'masters', attrs: {}, evidence_ids: ['adm-letter-z'], confidence: 'extracted' },
  // The signed offer — and the master's start, which is both the dependency exception and the
  // date of alleged entitlement below.
  {
    id: 'offer-va',
    type: 'job_offer_accepted',
    date: '2026-06-08',
    jurisdiction: 'VA',
    attrs: { hours_per_week: 40, employer: 'Arlington Analytics', is_coop: false, start_date: '2026-09-01' },
    evidence_ids: ['offer-letter-va'],
    confidence: 'confirmed',
  },
  { id: 'prog-start-z', type: 'program_start', date: '2026-08-24', institution_id: 'schoolZ', program_level: 'masters', attrs: {}, evidence_ids: ['adm-letter-z'], confidence: 'extracted' },
];

// The domicile record itself. The factor ids are the pack's own; the dates are the record's; and
// `is_coop` is the single fact the pack's employment caveat turns on.
//
// `allegedEntitlementDate` is the first official day of class of the term being claimed — the
// pack's own anchor definition — which is the master's program start above.
export const marcusDomicile: DomicileInput = {
  student: marcusStudent,
  events: marcusEvents,
  intentFactors: [
    { id: 'continuous_residence', date: '2024-08-01', event_ids: ['mv-va', 'lease-va-signed'] },
    { id: 'drivers_license', date: '2024-09-12', event_ids: ['lic-va'] },
    { id: 'employment', date: '2025-05-19', attrs: { is_coop: true }, event_ids: ['emp-coop'] },
    { id: 'va_job_offer_accepted', date: '2026-06-08', event_ids: ['offer-va'] },
    // voter_registration is absent on purpose: the pack's inapplicable_when clause excludes it for
    // a non-citizen, so the engine has to reach that conclusion itself rather than be told.
    // va_income_tax_filed is absent because it genuinely is not on his record yet.
  ],
  allegedEntitlementDate: '2026-08-24',
  // No dependency exception is asserted. The one that fires is derived from the timeline.
  dependencyExceptions: [],
};
