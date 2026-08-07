/**
 * Phase 8 — adversarial. One question:
 *   Can I make PathWise produce a CONFIDENT Virginia residency or aid conclusion for a status it has
 *   not classified?
 * A "confident" conclusion = anything other than unable_to_verify, i.e. a durational/intent claim,
 * a "not blocked by status" claim, or an invented `ineligible`.
 */
const B = 'c:/Users/sande/PathWise/pathwise-app/.test-out/lib/';
const { jurisdictionForCode, residencyFindingFor, aidFindingFor, aidFormFor, domicileAnalysisFor } =
  require(B + 'engines/jurisdiction.js');

const ENT = '2026-08-05';
let attempts = 0, defeats = 0;

const CLASSIFIED = ['citizen', 'LPR', 'F1', 'J1', 'M1'];

function probe(name, student, opts = {}) {
  attempts++;
  const jx = jurisdictionForCode(opts.state || 'VA');
  const input = {
    student,
    events: opts.events || [],
    intentFactors: opts.intentFactors || [{ id: 'continuous_residence', date: '2020-01-01' }],
    allegedEntitlementDate: ENT,
    dependencyExceptions: opts.dependencyExceptions,
  };
  let r, a, f, full;
  try {
    r = residencyFindingFor(jx, input);
    a = aidFindingFor(jx, { student, deadlines: { asOf: ENT }, provisions: opts.provisions, evidence: opts.evidence });
    f = aidFormFor(jx, student);
    full = domicileAnalysisFor(jx, input);
  } catch (e) {
    console.log(`  THREW  ${name} :: ${e.message.split('\n')[0]}`);
    return;
  }

  const status = student.immigration.status;
  const isClassified = CLASSIFIED.includes(status);
  if (isClassified) return; // control rows are checked elsewhere

  const blob = JSON.stringify([r, a, f, full.finding]);
  const leaks = [];
  if (r.result !== 'unable_to_verify') leaks.push('residency result=' + r.result);
  if (a.result !== 'unable_to_verify') leaks.push('aid result=' + a.result);
  if (full.finding.result !== 'unable_to_verify') leaks.push('full-analysis result=' + full.finding.result);
  if (/appears satisfied|days of domicile appear|clock started|earliest eligibility/i.test(blob))
    leaks.push('durational claim leaked');
  if (/not blocked by status/i.test(blob)) leaks.push('"not blocked by status" leaked');
  if (/\bineligible\b/.test(r.result + a.result)) leaks.push('INVENTED A BAR');
  if (r.unknowns.length === 0) leaks.push('residency has no unknown');
  if (a.unknowns.length === 0) leaks.push('aid has no unknown');

  if (leaks.length) {
    defeats++;
    console.log(`  DEFEAT ${name} -> ${leaks.join('; ')}`);
  } else {
    console.log(`  HELD   ${name}`);
  }
}

const mk = (status, extra = {}) => ({
  id: 'adv',
  immigration: { status, prior_statuses: [], ...(extra.immigration || {}) },
  dob: extra.dob || '2000-01-01',
  institutions: extra.institutions || [],
  jurisdiction_history: extra.jurisdiction_history || [{ state: 'VA', from: '2015-01-01' }],
});

console.log('--- every status in the schema, plus junk');
for (const s of ['citizen','LPR','LPR_applicant','F1','J1','M1','H4','DACA','TPS','undocumented','other'])
  probe('status=' + JSON.stringify(s), mk(s));
for (const s of ['', ' ', 'other ', ' other', 'OTHER', 'Other', 'f1', 'F-1', 'F1 ', 'null', 'undefined',
                 '__proto__', 'constructor', 'toString', 'citizen,other', "F1'] or ['other",
                 'F1,J1,M1', '["F1"]', 0, 1, true, null, undefined, {}, []])
  probe('junk status=' + JSON.stringify(s), mk(s));

console.log('\n--- trying to buy a confident answer with richer input');
probe('every intent factor supplied', mk('other'), {
  intentFactors: [
    { id: 'continuous_residence', date: '2018-01-01' },
    { id: 'va_income_tax_filed', date: '2019-01-01' },
    { id: 'drivers_license', date: '2019-06-01' },
    { id: 'voter_registration', date: '2019-06-01' },
    { id: 'employment', date: '2020-01-01', attrs: { is_coop: false } },
    { id: 'va_job_offer_accepted', date: '2021-01-01' },
  ],
});
probe('all dependency exceptions asserted', mk('other'), {
  dependencyExceptions: ['veteran_or_active_duty','graduate_or_professional_student','married',
    'ward_of_court','both_parents_deceased_no_guardian','has_legal_dependents_other_than_spouse',
    'financial_self_sufficiency'],
});
probe('graduate program on the timeline', mk('other', { dob: '2006-01-01' }), {
  events: [{ id: 'p', type: 'program_start', date: '2024-01-01', program_level: 'masters',
             institution_id: 'i', attrs: {}, evidence_ids: [], confidence: 'extracted' }],
});
probe('prior F1 status on the record', mk('other', {
  immigration: { prior_statuses: [{ status: 'F1', from: '2015-01-01', to: '2020-01-01' }] },
}));
probe('prior citizen status on the record', mk('other', {
  immigration: { prior_statuses: [{ status: 'citizen', from: '2015-01-01', to: '2020-01-01' }] },
}));
probe('aid: full evidence + every provision', mk('other'), {
  provisions: ['domicile', 'military_dependent', 'tuition_equity'],
  evidence: ['domicile_established','military_orders','dependent_proof','va_high_school_attendance',
             'va_high_school_graduation','tax_filing_evidence'],
});
probe('aid: the domicile provision fully evidenced', mk('other'), {
  provisions: ['domicile'], evidence: ['domicile_established'],
});

console.log('\n--- jurisdiction shape tricks');
probe('VA claimed twice in history', mk('other', {
  jurisdiction_history: [{ state: 'VA', from: '2015-01-01' }, { state: 'VA', from: '2026-01-01' }],
}));
probe('moved VA -> TX -> VA', mk('other', {
  jurisdiction_history: [{ state: 'VA', from: '2015-01-01', to: '2020-01-01' },
                         { state: 'TX', from: '2020-01-01', to: '2024-01-01' },
                         { state: 'VA', from: '2024-01-01' }],
}));

console.log('\n--- controls: the classified statuses must still be answerable');
for (const s of CLASSIFIED) {
  const jx = jurisdictionForCode('VA');
  const r = residencyFindingFor(jx, { student: mk(s), events: [],
    intentFactors: [{ id: 'continuous_residence', date: '2020-01-01' }], allegedEntitlementDate: ENT });
  const a = aidFindingFor(jx, { student: mk(s), deadlines: { asOf: ENT } });
  console.log(`  CONTROL ${s}: residency=${r.result} aid=${a.result}` +
    (r.result === 'unable_to_verify' ? '   <-- REGRESSION: a classified status lost its answer' : ''));
}

console.log(`\n${attempts} attempts, ${defeats} defeats.`);
process.exit(defeats === 0 ? 0 : 1);
