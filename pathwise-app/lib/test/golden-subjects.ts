// golden-subjects.ts — the one definition of what "Virginia's output" means.
//
// Shared by capture-golden.ts (which records it) and golden-virginia.test.ts (which checks it), so
// the recorder and the checker cannot drift into measuring different things.
//
// The subjects are every engine output the jurisdiction refactor touched: both branches of Engine B
// (Priya stopped at the gate, Marcus past it), the aid finding and its deadline arithmetic, the
// life-event consequences, and the ordered plan that is built from all of them. If parameterising
// the engines moved a single character of any of them, the test that reads this file fails.

import {
  aidDeadlineFor,
  aidFindingFor,
  domicileAnalysisFor,
  jurisdictionFor,
  residencyFindingFor,
} from '../engines/jurisdiction';
import { applyLifeEvent } from '../engines/consequence-engine';
import { computeNextSteps } from '../engines/next-steps';
import { computeCptLedger } from '../engines/cpt-ledger';
import { computeUnemploymentClock } from '../engines/unemployment-clock';
import { computeOptBudget } from '../engines/opt-budget';
import {
  priyaStudent,
  priyaEvents,
  priyaAid,
  priyaOpt,
  priyaOptBudget,
  priyaJobOffer,
} from '../fixtures/priya';
import { marcusDomicile, marcusStudent } from '../fixtures/marcus';

/** The date of alleged entitlement the screens use for Priya. One definition, so nothing drifts. */
export const PRIYA_ALLEGED_ENTITLEMENT = '2026-08-24';

/**
 * Every captured subject, computed through the real router — the same path a screen takes.
 *
 * Going through `jurisdictionFor` rather than calling the engines directly is deliberate: it means
 * the golden proves the ROUTED output is unchanged, not merely that the engines still work when
 * handed the right pack by hand.
 */
export function buildGolden(): Record<string, unknown> {
  const priyaJx = jurisdictionFor(priyaStudent);
  const marcusJx = jurisdictionFor(marcusStudent);

  const priyaGateInput = {
    student: priyaStudent,
    events: priyaEvents,
    intentFactors: [],
    allegedEntitlementDate: PRIYA_ALLEGED_ENTITLEMENT,
  };

  const domicileGate = residencyFindingFor(priyaJx, priyaGateInput);
  const aidEligibility = aidFindingFor(priyaJx, priyaAid);
  const aidDeadline = aidDeadlineFor(priyaJx, priyaAid);

  return {
    'priya:domicile-gate': domicileGate,
    'marcus:domicile-analysis': domicileAnalysisFor(marcusJx, marcusDomicile),
    'priya:aid-eligibility': aidEligibility,
    'priya:aid-deadline': aidDeadline,
    'priya:job-offer-consequences': applyLifeEvent(priyaStudent, priyaJobOffer, priyaJx),
    'priya:next-steps': computeNextSteps({
      level: 'masters',
      ledger: computeCptLedger(priyaEvents),
      clock: computeUnemploymentClock(priyaOpt),
      optBudget: computeOptBudget(priyaOptBudget),
      domicile: domicileGate,
      aid: aidEligibility,
      aidDeadline,
      asOf: priyaOpt.asOf,
    }),
  };
}
