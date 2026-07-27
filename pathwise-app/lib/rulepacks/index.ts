// index.ts — the jurisdiction resolver. The one place that answers "does PathWise have rules for
// this state?", and the only honest way to ask.
//
// Before this file existed, every domicile and aid screen reached straight for the Virginia packs.
// That was invisible while Virginia was the only state on screen, and wrong the moment a student
// picked another one: the engines would run Virginia's rules and print Virginia's citation under a
// heading that said Texas. A confident answer sourced to the wrong statute is worse than no answer,
// because the citation is the thing that makes the answer trustworthy.
//
// So: ask here first. A jurisdiction with a registered pack gets the real engines. A jurisdiction
// without one gets `unable_to_verify` and a link to the body that actually decides — never
// Virginia's rules wearing another state's name. See ./unmodelled-jurisdiction.ts for that half.
//
// Adding a jurisdiction is authoring a pack and registering it in REGISTRY below. The engines still
// import the Virginia packs directly (see domicile-gate.ts, domicile.ts, aid-eligibility.ts), so
// the second pack will also need those three imports parameterised — this file is the seam that
// makes that a mechanical change instead of an archaeological one, and the honest statement of
// where the work stands is in ARCHITECTURE_NOTE at the bottom.

import vaDomicile from './va-domicile.json';
import vaAid from './va-aid.json';
import { JURISDICTIONS, jurisdictionByCode, type Jurisdiction } from '../coverage';

/** The packs that decide one jurisdiction's residency and aid questions. */
export interface JurisdictionPacks {
  domicile: typeof vaDomicile;
  aid: typeof vaAid;
}

/**
 * Every jurisdiction PathWise can actually reason about, keyed by the code coverage.json uses.
 *
 * This map is the truth. `coverage.json` is the public claim about the same thing, and
 * `COVERAGE_DISAGREEMENTS` below checks the two against each other, so the map on /coverage cannot
 * quietly promise a state the engines do not have.
 */
const REGISTRY: Readonly<Record<string, JurisdictionPacks>> = {
  VA: { domicile: vaDomicile, aid: vaAid },
};

/** The packs for a jurisdiction, or undefined when PathWise has not modelled it. */
export function resolveJurisdiction(code: string): JurisdictionPacks | undefined {
  return REGISTRY[code];
}

/** Whether PathWise can reason about this jurisdiction at all. The question /check asks first. */
export function isModelled(code: string): boolean {
  return code in REGISTRY;
}

/** The codes with packs, in coverage-file order so the UI never has to sort them itself. */
export const MODELLED_CODES: readonly string[] = JURISDICTIONS.filter((j) => j.code in REGISTRY).map(
  (j) => j.code,
);

/**
 * What a jurisdiction PathWise cannot reason about can still tell a student: who decides, and where
 * the rule lives. Both may be absent, and an absent one is reported as absent.
 */
export interface UnmodelledJurisdiction {
  code: string;
  name: string;
  status: Jurisdiction['status'];
  note?: string;
  authority?: string;
  source_url?: string;
}

/**
 * Describe a jurisdiction that has no pack. Returns undefined when the code is not one coverage.json
 * lists at all, which is a caller bug rather than a coverage gap — the two are worth telling apart.
 */
export function describeUnmodelled(code: string): UnmodelledJurisdiction | undefined {
  const j = jurisdictionByCode(code);
  if (!j || isModelled(code)) return undefined;
  return {
    code: j.code,
    name: j.name,
    status: j.status,
    note: j.note,
    authority: j.authority,
    source_url: j.source_url,
  };
}

/**
 * Where the registry and the coverage file disagree. Empty is the only correct value.
 *
 * A jurisdiction marked `implemented` with no pack behind it is a promise the engines cannot keep;
 * a registered pack the coverage map calls unmodelled understates what PathWise can do. Computed
 * rather than asserted, so it stays true as either side changes.
 */
export const COVERAGE_DISAGREEMENTS: readonly string[] = JURISDICTIONS.flatMap((j) => {
  const claimed = j.status === 'implemented';
  const registered = j.code in REGISTRY;
  if (claimed && !registered) return [`${j.code}: coverage.json says "implemented" but no pack is registered`];
  if (registered && !claimed) return [`${j.code}: a pack is registered but coverage.json says "${j.status}"`];
  return [];
});

/**
 * The honest statement of how far "adding a jurisdiction is one file" actually goes today, kept
 * next to the code it describes so it cannot drift into a claim we have stopped earning.
 *
 * True today: which jurisdictions PathWise will reason about, and what a student sees when it will
 * not, are both decided by data — REGISTRY and coverage.json — and no screen decides it privately.
 * NOT yet true: the domicile and aid engines still import the Virginia packs at module scope, so a
 * second pack needs those imports parameterised before it can reach a screen. That is the next
 * change, and it is deliberately not this one.
 */
export const ARCHITECTURE_NOTE =
  'Jurisdiction routing is data-driven; the domicile and aid engines still bind the Virginia packs at import and must be parameterised before a second pack can run.';
