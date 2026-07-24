// cpt-ledger.test.ts — regression test that LOCKS the verified demo numbers.
// Run: npx ts-node src/test/cpt-ledger.test.ts
// If this passes, Engine A's core math (partition, full-time cliff, overlap aggregation) is correct.

import { computeCptLedger } from '../engines/cpt-ledger';
import { runDomicileGate } from '../engines/domicile-gate';
import { priyaStudent, priyaEvents } from '../fixtures/priya';

let failures = 0;
function assert(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}`, extra ?? '');
  }
}

console.log('Engine A — CPT ledger (Priya)');
const ledger = computeCptLedger(priyaEvents);
const masters = ledger.forLevel('masters');
const bachelors = ledger.forLevel('bachelors');

assert('masters ledger exists', !!masters, masters);
assert('bachelors ledger exists', !!bachelors, bachelors);

// The core verified numbers.
assert('masters full-time days === 342', masters?.fullTimeDays === 342, masters?.fullTimeDays);
assert('masters overlap days === 54', masters?.overlapDays === 54, masters?.overlapDays);
assert('masters daysToCliff === 23', masters?.daysToCliff === 23, masters?.daysToCliff);
assert('masters band === amber', masters?.band === 'amber', masters?.band);
assert('masters still OPT-eligible (under 365)', masters?.optEligible === true, masters?.optEligible);

// Level partition: bachelor's days must NOT contaminate masters.
assert('bachelors full-time days === 210', bachelors?.fullTimeDays === 210, bachelors?.fullTimeDays);
assert('bachelors counted separately (green)', bachelors?.band === 'green', bachelors?.band);

console.log('\nEngine B — domicile gate (Priya, F-1)');
const finding = runDomicileGate({
  student: priyaStudent,
  events: priyaEvents,
  intentFactors: [],
  allegedEntitlementDate: '2026-08-24',
});
assert('F-1 gate fires -> ineligible', finding.result === 'ineligible', finding.result);
assert('gate stops analysis with a citation', finding.rule_citation.authority.includes('SCHEV'), finding.rule_citation.authority);
assert('deciding office is domicile_officer', finding.deciding_office === 'domicile_officer', finding.deciding_office);

console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASSED — the demo numbers are locked: 342 / 54 / 23 (amber), bachelors 210 partitioned.');
  process.exit(0);
} else {
  console.error(`${failures} TEST(S) FAILED`);
  process.exit(1);
}
