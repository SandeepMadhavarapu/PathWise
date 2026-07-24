// priya.ts — the demo student. She embodies the overlap trap.
//
// Story (verified numbers, see src/test/cpt-ledger.test.ts):
//   - F-1 student. That one fact blocks VA in-state residency AND VA state aid (the hero finding).
//   - Bachelor's at School X: 210 days of full-time CPT — PARTITIONED, does not count toward masters.
//   - Master's at School Y:
//       * one full-time CPT block of 288 days, PLUS
//       * two part-time CPTs (12 hrs/week each) that overlap for 54 days -> aggregate to 24 hrs/week
//         -> those 54 days count as FULL-TIME.
//     Masters full-time total = 288 + 54 = 342 days. Cliff = 365. She is 23 days from losing OPT: AMBER.
//   - The money moment: she signs a job offer with a FUTURE start date -> unemployment clock does
//     NOT stop; a new 10-day SEVIS obligation appears; residency clock (if past the gate) would start.

import type { Student, Event } from '../types';

export const priyaStudent: Student = {
  id: 'priya',
  immigration: {
    status: 'F1',
    status_since: '2020-08-15',
    prior_statuses: [],
  },
  dob: '2002-04-11',
  institutions: [
    { id: 'schoolX', name: 'School X', state: 'VA', level: 'bachelors' },
    { id: 'schoolY', name: 'School Y', state: 'VA', level: 'masters' },
  ],
  jurisdiction_history: [{ state: 'VA', from: '2020-08-15' }],
};

export const priyaEvents: Event[] = [
  // ---- Bachelor's level CPT (School X) — 210 full-time days, must NOT count toward masters ----
  {
    id: 'cpt-bach-1',
    type: 'cpt_auth',
    date: '2021-05-17',
    end_date: '2021-12-12', // 210 inclusive days
    institution_id: 'schoolX',
    program_level: 'bachelors',
    attrs: { hours_per_week: 40, in_field: true },
    evidence_ids: ['i20-bach'],
    confidence: 'extracted',
  },

  // ---- Master's level CPT (School Y) ----
  // Full-time block: 288 inclusive days.
  {
    id: 'cpt-mast-ft',
    type: 'cpt_auth',
    date: '2024-06-03',
    end_date: '2025-03-17', // 288 inclusive days
    institution_id: 'schoolY',
    program_level: 'masters',
    attrs: { hours_per_week: 40, in_field: true },
    evidence_ids: ['i20-mast-1'],
    confidence: 'extracted',
  },
  // Part-time #1: 12 hrs/week.
  {
    id: 'cpt-mast-pt1',
    type: 'cpt_auth',
    date: '2025-06-01',
    end_date: '2025-08-31',
    institution_id: 'schoolY',
    program_level: 'masters',
    attrs: { hours_per_week: 12, in_field: true },
    evidence_ids: ['i20-mast-2'],
    confidence: 'extracted',
  },
  // Part-time #2: 12 hrs/week. Overlaps pt1 from 2025-07-09..2025-08-31 = 54 days -> 24 hrs/week.
  {
    id: 'cpt-mast-pt2',
    type: 'cpt_auth',
    date: '2025-07-09',
    end_date: '2025-09-30',
    institution_id: 'schoolY',
    program_level: 'masters',
    attrs: { hours_per_week: 12, in_field: true },
    evidence_ids: ['i20-mast-3'],
    confidence: 'extracted',
  },

  // Master's program milestones (for the deadline / consequence engine).
  { id: 'prog-mast-start', type: 'program_start', date: '2024-01-16', institution_id: 'schoolY', program_level: 'masters', attrs: {}, evidence_ids: ['i20-mast-1'], confidence: 'extracted' },
  { id: 'prog-mast-end', type: 'program_end', date: '2026-05-15', institution_id: 'schoolY', program_level: 'masters', attrs: {}, evidence_ids: ['i20-mast-1'], confidence: 'extracted' },
];

// The life event used in the demo's money moment.
export const priyaJobOffer = {
  type: 'job_offer_signed' as const,
  date: '2026-08-01',
  attrs: { hours_per_week: 40, in_field: true, is_coop: false, employer: 'Acme Corp', start_date: '2026-09-15' },
};
