// jurisdiction-coverage.ts — how far PathWise has carried each jurisdiction, DERIVED.
//
// This is the file that makes "do not fake 50-state support" a structural property rather than a
// promise. The coverage map used to read a `status` string maintained by hand in coverage.json,
// beside the packs that were the actual truth. Nothing stopped the two disagreeing except a check
// that they agreed — and a check is a thing that can be deleted by whoever is in a hurry.
//
// Now there is one source. A jurisdiction's level in a domain is what its registered pack DECLARES
// it can answer in that domain, and where no pack is registered it is what the index can honestly
// support: a verified official source, a recorded failure to find one, or nothing.
//
// The consequence worth stating plainly: you cannot make the map say "modelled" by editing the map.
// You can only make it say that by authoring a pack that declares it, registering it, and passing
// the schema tests — which check that a pack claiming `modelled` carries the rules that word
// implies. Faking coverage is not discouraged here, it is unreachable.
//
// Import direction: this module imports both the index and the registry. Neither imports it.

import { JURISDICTIONS, jurisdictionByCode, type Jurisdiction } from './coverage';
import { REGISTERED_PACKS } from './rulepacks';
import {
  DETERMINATE_LEVELS,
  DOMAINS,
  type Capability,
  type CapabilityLevel,
  type PackDomain,
} from './rulepacks/schema';

/** How far one domain has been carried in one jurisdiction, and on whose authority. */
export interface DomainCoverage {
  domain: PackDomain;
  level: CapabilityLevel;
  /** What the pack says it answers here. Present only where a pack declares it. */
  answers?: string[];
  /** Why the level is below `modelled`, in the pack author's or the index's own words. */
  reason?: string;
  /** The body that decides this domain here, where PathWise knows it. */
  authority?: string;
  source_url?: string;
  /** How that link was confirmed. See Jurisdiction.source_check. */
  sourceCheck?: 'fetched' | 'serving_blocked';
  /** The pack behind this, where one is registered — so the UI can link to the file itself. */
  packId?: string;
}

export interface JurisdictionCoverage {
  code: string;
  name: string;
  note?: string;
  residency: DomainCoverage;
  aid: DomainCoverage;
  /** Both domains, in a fixed order, for a UI that renders them uniformly. */
  domains: DomainCoverage[];
  /**
   * The furthest either domain has been carried. Used for sorting and for headline counts — never
   * to describe the jurisdiction, because "modelled" for residency and "not modelled" for aid is a
   * real and common state that a single word would flatten into a lie.
   */
  furthest: CapabilityLevel;
  /** True when at least one domain can return a determinate answer. */
  decidesAnything: boolean;
}

/** Best-first. The order a reader should meet them in, and the order `furthest` is computed by. */
const LEVEL_RANK: Record<CapabilityLevel, number> = {
  modelled: 0,
  partial: 1,
  sourced_only: 2,
  unable_to_verify: 3,
  not_modelled: 4,
};

export function compareLevels(a: CapabilityLevel, b: CapabilityLevel): number {
  return LEVEL_RANK[a] - LEVEL_RANK[b];
}

/**
 * What the INDEX alone can support for a domain, when no pack is registered.
 *
 * The three answers are meaningfully different and the difference is the product's credibility:
 * a verified source means PathWise can name who decides and link the rule; a recorded failure means
 * someone looked and could not confirm one; nothing means nobody has looked yet. Collapsing them
 * would let an untouched row look like an attempt.
 */
function fromIndex(j: Jurisdiction, domain: PackDomain): DomainCoverage {
  // Per domain, and this matters more than it looks. The index's `source_url` is the RESIDENCY
  // source — the policy in coverage.json has always said so — and state aid is very often decided
  // by a different body entirely. Reading one source for both domains would let a verified
  // residency link silently vouch for an aid claim nobody has checked, which is exactly the kind of
  // overclaim that is invisible from the outside.
  const authority = domain === 'aid' ? j.aid_authority : j.authority;
  const sourceUrl = domain === 'aid' ? j.aid_source_url : j.source_url;
  const sourceCheck = domain === 'aid' ? j.aid_source_check : j.source_check;

  if (j.unverifiable) {
    return { domain, level: 'unable_to_verify', reason: j.unverifiable };
  }
  if (sourceUrl) {
    return {
      domain,
      level: 'sourced_only',
      // Worded to claim exactly what an agency link establishes and no more. For most states what
      // is on record is the state higher-education agency and its published guidance — NOT a
      // determination of who rules on an individual case, which in some states is the agency, in
      // others the institution, and in North Carolina a dedicated service. Saying "the deciding
      // body" flatly would be asserting something PathWise has not checked state by state.
      reason:
        'The state agency and its published guidance are on record and linked. Which body rules on an individual case — the agency, the institution, or a dedicated service — is not modelled, and no rule from this jurisdiction has been authored.',
      authority,
      source_url: sourceUrl,
      sourceCheck,
    };
  }
  return {
    domain,
    level: 'not_modelled',
    reason: `PathWise has not yet verified an official source for ${
      domain === 'aid' ? 'state aid' : 'residency'
    } in this jurisdiction.`,
  };
}

/** What a pack declares for one domain, or undefined if it declares nothing for it. */
function fromCapability(
  cap: Capability | undefined,
  authority: string,
  sourceUrl: string,
  packId: string,
): DomainCoverage | undefined {
  if (!cap) return undefined;
  return {
    domain: cap.domain,
    level: cap.level,
    answers: cap.answers,
    reason: cap.reason,
    authority,
    source_url: sourceUrl,
    packId,
  };
}

/** Every jurisdiction, with each domain's level derived from the packs actually registered. */
export const COVERAGE: readonly JurisdictionCoverage[] = JURISDICTIONS.map((j) => {
  const registered = REGISTERED_PACKS.find((r) => r.code === j.code);

  const byDomain = new Map<PackDomain, DomainCoverage>();
  if (registered) {
    // `aid` is optional: a jurisdiction may have residency rules authored and no aid rules. The
    // domain it says nothing about falls through to `fromIndex` below, so it is described by what
    // the index can support rather than by silence.
    const { domicile, aid } = registered.packs;
    const authored = [domicile, aid].filter((p): p is NonNullable<typeof p> => p !== undefined);
    for (const pack of authored) {
      for (const cap of pack.capabilities) {
        const derived = fromCapability(cap, pack.authority, pack.source_url, pack.pack_id);
        // A pack may only speak for a domain it has not already been spoken for in. Two packs
        // claiming one domain is a registration bug, and the schema test is where it surfaces.
        if (derived && !byDomain.has(cap.domain)) byDomain.set(cap.domain, derived);
      }
    }
  }

  const domains = DOMAINS.map((d) => byDomain.get(d) ?? fromIndex(j, d));
  const [residency, aid] = domains;
  const furthest = domains.map((d) => d.level).sort(compareLevels)[0];

  return {
    code: j.code,
    name: j.name,
    note: j.note,
    residency,
    aid,
    domains,
    furthest,
    decidesAnything: domains.some((d) => DETERMINATE_LEVELS.includes(d.level)),
  };
});

export function coverageFor(code: string): JurisdictionCoverage | undefined {
  return COVERAGE.find((c) => c.code === code);
}

/** How many jurisdictions sit at each level, counted by their furthest domain. */
export const LEVEL_COUNTS: Record<CapabilityLevel, number> = COVERAGE.reduce(
  (acc, c) => ({ ...acc, [c.furthest]: (acc[c.furthest] ?? 0) + 1 }),
  { modelled: 0, partial: 0, sourced_only: 0, not_modelled: 0, unable_to_verify: 0 },
);

/**
 * Jurisdictions whose engines can return a determinate answer in AT LEAST ONE domain.
 *
 * Renamed from `MODELLED_COUNT`, because that name is what caused the bug this comment exists to
 * prevent recurring. Three screens read it and rendered it as "N states are fully modelled" — a
 * strictly stronger claim than this filter makes. It was true while Virginia was the only
 * registered jurisdiction; registering Tennessee and Texas, which declare `partial` residency and
 * ship no aid pack at all, silently turned a correct sentence into a false one on the landing page,
 * on /check, and in the /coverage heading — directly above tiles badging those two states
 * "partial" and "source captured". The page contradicted itself one scroll apart.
 *
 * If you want the sentence "fully modelled", you want FULLY_MODELLED below. This one answers a
 * narrower question: can the engines say anything determinate here at all?
 */
export const DECIDES_ANYTHING = COVERAGE.filter((c) => c.decidesAnything);
export const DECIDES_ANYTHING_COUNT = DECIDES_ANYTHING.length;

/**
 * FULLY modelled: every domain PathWise models is at `modelled` for this jurisdiction.
 *
 * Tested with `every`, not by reading `furthest`. `furthest` is the BEST level across domains, so a
 * jurisdiction with residency modelled and aid unread would satisfy it — which is the same class of
 * overclaim, one step subtler. The only jurisdiction that can be described as fully modelled is one
 * with nothing left partial or unread.
 */
export const FULLY_MODELLED = COVERAGE.filter((c) =>
  c.domains.every((d) => d.level === 'modelled'),
);
export const FULLY_MODELLED_NAMES = FULLY_MODELLED.map((c) => c.name);
export const FULLY_MODELLED_COUNT = FULLY_MODELLED.length;

/** Authored, but not all the way — declared `partial` in at least one domain, and nothing unread. */
export const PARTIALLY_MODELLED = COVERAGE.filter(
  (c) => !c.domains.every((d) => d.level === 'modelled') && c.domains.some((d) => d.level === 'partial'),
);
export const PARTIALLY_MODELLED_COUNT = PARTIALLY_MODELLED.length;

/** Everything short of a determinate answer anywhere — the honest remainder. */
export const UNMODELLED_COUNT = COVERAGE.length - DECIDES_ANYTHING_COUNT;

/** Jurisdictions with a verified official source but no authored rules. */
export const SOURCED_ONLY_COUNT = COVERAGE.filter((c) => c.furthest === 'sourced_only').length;

/**
 * A registered pack for a code the index does not list would be a jurisdiction the engines can
 * answer for and the map cannot show. Empty is the only correct value; the schema test asserts it.
 */
export const UNLISTED_REGISTRATIONS: readonly string[] = REGISTERED_PACKS.filter(
  (r) => !jurisdictionByCode(r.code),
).map((r) => `${r.code}: a pack is registered but coverage.json does not list this jurisdiction`);
