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
import type { UnemploymentClockInput } from '../engines/unemployment-clock';
import type { OptBudgetInput } from '../engines/opt-budget';
import type { AidEligibilityInput } from '../engines/aid-eligibility';

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

// Post-completion OPT scenario — the live unemployment clock (Engine A part 4).
//   - Her master's program ends 2026-05-15 (prog-mast-end above); post-completion OPT starts
//     right after, inside the grace/OPT window.
//   - She is in a STEM field (stem: true) — but she has NOT reported any employment yet. Per the
//     rulepack that means her real cap is 90, not 150: the STEM +60 only unlocks once a
//     qualifying job is on record. The clock is running the whole time she job-hunts.
//   - asOf is the demo's "today". The engine computes ~70 of 90 days used — a live amber signal.
export const priyaOpt: UnemploymentClockInput = {
  optStartDate: '2026-05-16',
  stem: true,
  employment: [],
  asOf: '2026-07-24',
};

// OPT budget — Engine A part 3. The 12 months are per level, and pre-completion spends them too.
//   - During the master's she took a part-time pre-completion OPT: 2025-10-01 -> 2026-03-31, six
//     authorized months at 15 hrs/week. Part-time pre-completion is deducted at HALF rate, so those
//     six months cost her 3.0 months of budget — not 6, and not 0.
//   - Her post-completion OPT therefore could only be recommended for 9 months (12 - 3), which is
//     why it runs 2026-05-16 -> 2027-02-15 and not a full year. Most students never learn that the
//     shortened grant traces back to a campus job two years earlier.
//   - Both are master's-level. Her bachelor's budget is a separate 12 months and is untouched here.
//   - Usage is computed from the authorized ranges above; hours actually worked never enter it.
export const priyaOptBudget: OptBudgetInput = {
  level: 'masters',
  authorizations: [
    {
      id: 'opt-pre-pt',
      start: '2025-10-01',
      end: '2026-03-31',
      intensity: 'part_time',
      phase: 'pre_completion',
      level: 'masters',
      employer: 'School Y Research Lab',
    },
    {
      id: 'opt-post-ft',
      start: '2026-05-16',
      end: '2027-02-15',
      intensity: 'full_time',
      phase: 'post_completion',
      level: 'masters',
    },
  ],
};

// Aid eligibility — Engine C. The third reader of the same record.
//   - Her F-1 status is the whole story again: it closes the Virginia state-aid door before need,
//     merit or paperwork is reached. Same fact as the residency gate, different office.
//   - The two provisions below are the ones she would actually ask about. `domicile` is the route
//     everyone assumes after six years in Virginia; `tuition_equity` is the one that gets suggested
//     in forums (and is under litigation). Listing them is not a claim she qualifies — it is what
//     PathWise checks, and the checklist shows exactly what each one still needs.
//   - Evidence on record: she has filed Virginia returns since her first CPT job, so
//     `tax_filing_evidence` is present. She did not attend high school in Virginia, so those two
//     items are absent — and stay absent, as honest unknowns, rather than being guessed at.
//   - Deadlines are for the 2027–28 award year. The college's own priority date (1 Feb) lands a full
//     149 days before the federal deadline everybody quotes — which is the entire point of the
//     earliest-of rule. `state` is deliberately omitted so it is derived from the rulepack's own
//     VASA priority date (03-01) rather than restated here.
export const priyaAid: AidEligibilityInput = {
  student: priyaStudent,
  provisions: ['domicile', 'tuition_equity'],
  evidence: ['tax_filing_evidence'],
  deadlines: {
    collegePriority: '2027-02-01',
    federal: '2027-06-30',
    asOf: '2026-07-24',
  },
};

// The life event used in the demo's money moment.
export const priyaJobOffer = {
  type: 'job_offer_signed' as const,
  date: '2026-08-01',
  attrs: { hours_per_week: 40, in_field: true, is_coop: false, employer: 'Acme Corp', start_date: '2026-09-15' },
};
