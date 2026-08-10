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
// Adding a jurisdiction is authoring a pack and registering it in REGISTRY below. Nothing else:
// the engines take their pack as a parameter (see engines/jurisdiction.ts, which is the only thing
// that calls resolveJurisdiction), so a second pack reaches the screens without an engine edit.

import vaDomicileRaw from './va-domicile.json';
import vaAidRaw from './va-aid.json';
import tnDomicileRaw from './tn-domicile.json';
import txDomicileRaw from './tx-domicile.json';
import { JURISDICTIONS, jurisdictionByCode, type Jurisdiction } from '../coverage';
import { parseAidPack, parseDomicilePack, type AidPack, type DomicilePack } from './schema';

// The pack shapes are declared by hand in ./schema.ts and re-exported here, which is where every
// caller already imports them from.
//
// They used to be `typeof vaDomicile` — inferred from the Virginia file. That made one instance the
// definition of the shape: a second pack had to carry every field Virginia carries and could carry
// nothing Virginia lacks, `guidelines_effective` was required because Virginia happens to have one,
// and every enum-ish field widened to `string`, so `deciding_office` was cast rather than checked.
export type { AidPack, DomicilePack } from './schema';

/**
 * The packs that decide one jurisdiction's residency and aid questions.
 *
 * `aid` is OPTIONAL, and that is the most important word in this file after Phase 6. Requiring both
 * meant a jurisdiction could not be registered until someone had authored rules for BOTH domains —
 * so a state whose residency rules were researched and verified could not be shipped at all until
 * its aid rules were too. That is not a cautious constraint, it is one that pushes an author toward
 * filling the gap with something plausible.
 *
 * With it optional, a jurisdiction can honestly be "residency authored, aid not", the aid engine
 * routes to the unmodelled finding for that state, and the coverage map says so per domain.
 */
export interface JurisdictionPacks {
  domicile: DomicilePack;
  aid?: AidPack;
}

/**
 * Parsed at module load, which means an invalid pack is a startup failure rather than a wrong
 * answer someone reads later.
 *
 * `as DomicilePack` would have been one character of work and a promise from whoever typed it.
 * These throw. Given that the whole product rests on a citation being attributable to the right
 * statute, and that the failure mode of a mistyped `start_rule` is Virginia's arithmetic printed
 * under another state's heading, the difference is not stylistic.
 */
const vaDomicile = parseDomicilePack(vaDomicileRaw);
const vaAid = parseAidPack(vaAidRaw);
const tnDomicile = parseDomicilePack(tnDomicileRaw);
const txDomicile = parseDomicilePack(txDomicileRaw);

/**
 * Every jurisdiction PathWise can actually reason about, keyed by the code coverage.json uses.
 *
 * This map is the truth, and it is the ONLY truth: the coverage screen is derived from what these
 * packs declare they can answer (lib/jurisdiction-coverage.ts), so a jurisdiction cannot be shown
 * as modelled without a pack here saying so and passing the schema tests that check the claim.
 */
const REGISTRY: Readonly<Record<string, JurisdictionPacks>> = {
  VA: { domicile: vaDomicile, aid: vaAid },
  // Tennessee: residency authored, aid NOT. Registered with one pack because Tennessee's aid rules
  // have not been read against a primary source, and shipping a jurisdiction should not require
  // inventing the half nobody has researched. The coverage map reports the two domains separately.
  TN: { domicile: tnDomicile },
  // Texas: residency authored, aid NOT. Its clock counts from the start of continuous presence
  // rather than from the last act showing intent — the same 365 days as Virginia, reached by
  // different arithmetic, which is the whole reason it was authored.
  TX: { domicile: txDomicile },
};

/** Every registered pack, for the tests and for the coverage screen that is derived from them. */
export const REGISTERED_PACKS: ReadonlyArray<{ code: string; packs: JurisdictionPacks }> =
  Object.entries(REGISTRY).map(([code, packs]) => ({ code, packs }));

/** The packs for a jurisdiction, or undefined when PathWise has not modelled it. */
export function resolveJurisdiction(code: string): JurisdictionPacks | undefined {
  // `Object.hasOwn`, not a bare index. REGISTRY is an object literal, so `REGISTRY['__proto__']`
  // resolves up the prototype chain and hands back Object.prototype — truthy, and not a pack. The
  // caller then reads `.domicile` off it and crashes with an uncaught TypeError, which out of a
  // server component is a 500 rather than "PathWise has not modelled that". Every other unknown
  // code already returns undefined and gets an honest unmodelled finding; these got an exception.
  return Object.hasOwn(REGISTRY, code) ? REGISTRY[code] : undefined;
}

/** Whether PathWise can reason about this jurisdiction at all. The question /check asks first. */
export function isModelled(code: string): boolean {
  // `in` walks the prototype chain too, so this answered true for 'toString' and 'constructor'.
  return Object.hasOwn(REGISTRY, code);
}

/** The codes with packs, in coverage-file order so the UI never has to sort them itself. */
export const MODELLED_CODES: readonly string[] = JURISDICTIONS.filter((j) => j.code in REGISTRY).map(
  (j) => j.code,
);

/**
 * The jurisdiction /check opens on.
 *
 * Named explicitly, and that is the whole point. This used to be `MODELLED_CODES[0]`, with a
 * comment saying it meant "the modelled one" and would keep meaning that as packs were added. It
 * did not: MODELLED_CODES is in coverage-file order, which is alphabetical, so registering Tennessee
 * and Texas silently moved the default from Virginia to Tennessee — the least complete of the three.
 * A visitor's first check went from the full cross-domain finding (one status fact closing both the
 * residency and the aid door, each with its own citation) to "PathWise has not modelled Tennessee
 * state aid rules". Nothing was broken; the weakest answer had simply become the first one.
 *
 * So the default is a deliberate product decision rather than an emergent property of sort order,
 * and adding a fiftieth pack cannot change it. Virginia is chosen because it is the only
 * jurisdiction modelled in BOTH domains, which is what makes the cross-domain demonstration
 * possible at all.
 *
 * `assertDefaultIsRegistered` below fails loudly if this is ever pointed at a code with no pack.
 */
export const DEFAULT_CHECK_JURISDICTION = 'VA';

/**
 * A default pointing at an unregistered jurisdiction would open /check on a state the engines
 * cannot answer for — silently, and only on that one screen. Checked rather than assumed.
 */
export function assertDefaultIsRegistered(): void {
  if (!(DEFAULT_CHECK_JURISDICTION in REGISTRY)) {
    throw new Error(
      `DEFAULT_CHECK_JURISDICTION is "${DEFAULT_CHECK_JURISDICTION}", which has no registered rule ` +
        `pack. /check would open on a jurisdiction PathWise cannot reason about.`,
    );
  }
}

/**
 * What a jurisdiction PathWise cannot reason about can still tell a student: who decides, and where
 * the rule lives. Both may be absent, and an absent one is reported as absent.
 */
export interface UnmodelledJurisdiction {
  code: string;
  name: string;
  note?: string;
  authority?: string;
  source_url?: string;
  /** Present where a source was sought and could not be confirmed, with the reason. */
  unverifiable?: string;
}

/**
 * Describe a jurisdiction that has no pack. Returns undefined when the code is not one coverage.json
 * lists at all, which is a caller bug rather than a coverage gap — the two are worth telling apart.
 */
export function describeUnmodelled(code: string): UnmodelledJurisdiction | undefined {
  const j = jurisdictionByCode(code);
  if (!j || isModelled(code)) return undefined;
  return describeFromCoverage(code, 'residency');
}

/**
 * What the coverage index knows about a jurisdiction in ONE domain, whether or not a pack exists.
 *
 * `describeUnmodelled` above answers "PathWise has no rules for this state at all", and returns
 * undefined the moment any pack is registered. That is right for the whole-jurisdiction question and
 * wrong for the per-domain one, and the gap was reachable: Texas and Tennessee ship residency rules
 * and no aid rules, so `aidFindingFor` fell through to the unmodelled aid finding with NOTHING to
 * describe the jurisdiction from. The finding then took its "no source verified" wording and told a
 * reader "PathWise has not yet verified an official source to link" on the same screen as a working
 * "Official Texas source →" link and "Verified 2026-07-28".
 *
 * The domain matters and is not cosmetic. An aid finding must never be sourced to a residency page:
 * the coverage entry carries `aid_authority`/`aid_source_url` separately, and for four states
 * (CA, DC, NC, TX) they are genuinely different pages. Passing the domain is what keeps an aid claim
 * cited to an aid source.
 */
export function describeFromCoverage(
  code: string,
  domain: 'residency' | 'aid',
): UnmodelledJurisdiction | undefined {
  const j = jurisdictionByCode(code);
  if (!j) return undefined;
  const aid = domain === 'aid';
  return {
    code: j.code,
    name: j.name,
    note: j.note,
    authority: (aid ? j.aid_authority : j.authority) ?? undefined,
    source_url: (aid ? j.aid_source_url : j.source_url) ?? undefined,
    unverifiable: j.unverifiable,
  };
}

// COVERAGE_DISAGREEMENTS used to live here: the registry and coverage.json each carried a claim
// about how far a jurisdiction had been modelled, and this checked that the two agreed. They are
// not two things any more — coverage.json records what is KNOWN about a jurisdiction and the packs
// declare what PathWise can ANSWER, and the map is derived from the second. See
// lib/jurisdiction-coverage.ts, and UNLISTED_REGISTRATIONS there for the one disagreement that is
// still possible: a pack registered for a code the index does not list.

// ARCHITECTURE_NOTE used to live here, recording that the engines still bound the Virginia packs at
// import and had to be parameterised before a second pack could run. That is no longer true, so the
// note is gone rather than reworded — see engines/jurisdiction.ts. What keeps it true is not this
// comment but lib/test/jurisdiction-routing.test.ts, which fails if any engine imports a
// jurisdiction pack again.
