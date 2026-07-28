// schema.ts — what a jurisdiction rule pack IS, stated once, by hand.
//
// This file replaces `type DomicilePack = typeof vaDomicile`. That inference was fine while Virginia
// was the only pack and quietly fatal the moment a second one existed, because it made ONE INSTANCE
// the definition of the shape:
//
//   - a new pack had to carry every field Virginia carries, whether or not its state has that rule;
//   - a new pack could not carry a field Virginia lacks, however central to its own statute;
//   - `guidelines_effective` inferred as required because Virginia happens to have one;
//   - every enum-ish field inferred as `string`, so `deciding_office` was cast, not checked, and a
//     typo shipped.
//
// The contract lives here now, and Virginia is one thing that satisfies it rather than the thing
// that defines it.
//
// ---- on parsing rather than casting ----
//
// A JSON import is `unknown` shaped like a pack. Somewhere it has to become a `DomicilePack`, and
// there are two ways to do that: assert it with `as`, or check it. `as` is a promise by whoever
// typed it; the checks below are a promise the program keeps. Given that the whole product rests on
// a citation being attributable to the right statute, the difference is not academic — a pack with
// a mistyped `start_rule` under `as` silently gets Virginia's clock arithmetic, which is precisely
// the class of bug the jurisdiction seam exists to prevent, one layer deeper.
//
// So these parsers ship, and they throw. They are deliberately small: structure, required fields,
// and membership of the closed sets that select ENGINE BEHAVIOUR. The expensive checks that are
// about authoring quality rather than safety — source URL domains, verification dates, capability
// coherence, cross-pack agreement — live in ./validate.ts and run in the test suite only.

import type { DecidingOffice, FindingResult, ISODate } from '../types';

// ---------------------------------------------------------------------------------------------
// Closed sets. Each one selects engine behaviour, so an unrecognised member has to be a loud
// failure rather than a default — see CLOCK_START_RULES / CLOCK_ANCHORS in engines/domicile-clock.
// ---------------------------------------------------------------------------------------------

/**
 * Where a jurisdiction's durational clock STARTS counting.
 *
 * Virginia counts from the last qualifying intent factor. Other states count from the beginning of
 * continuous physical presence, or from admission. These are different arithmetic over the same
 * record, not different wording, which is why the pack names one and the engine dispatches on it.
 */
export const CLOCK_START_RULES = [
  'date_of_last_qualifying_intent_factor',
  'start_of_continuous_presence',
  'date_of_admission',
] as const;
export type ClockStartRule = (typeof CLOCK_START_RULES)[number];

/**
 * The date the clock is measured UP TO — the moment residency is being claimed for.
 *
 * Virginia uses the date of alleged entitlement (first day of class), supplied by the caller with
 * the record. Several states use the term's census / add-drop date, and some use the date of
 * admission. The anchor decides which date the engine measures against, so it is dispatched too.
 */
export const CLOCK_ANCHORS = [
  'date_of_alleged_entitlement',
  'census_date',
  'admission_date',
] as const;
export type ClockAnchor = (typeof CLOCK_ANCHORS)[number];

export const DOMAINS = ['residency', 'aid'] as const;
export type PackDomain = (typeof DOMAINS)[number];

/**
 * How far PathWise has actually carried a domain in a jurisdiction. This is the vocabulary the
 * coverage map is DERIVED from — see lib/coverage.ts — rather than a status maintained beside it,
 * because a hand-maintained status is a claim that can outrun the packs, and this product cannot
 * afford one of those.
 *
 *   modelled       — rules authored and verified against the primary source; engines answer in full.
 *   partial        — some rules authored; the pack says which, and the rest answer unable_to_verify.
 *   sourced_only   — the deciding body and its published rule are captured and linked. No rules
 *                    authored: PathWise can say WHO decides and WHERE the rule is, and nothing more.
 *   not_modelled   — nothing captured yet beyond the jurisdiction's name.
 *   unable_to_verify — a source was sought and could not be confirmed. Deliberately distinct from
 *                    not_modelled: one is work not done, the other is work done that failed.
 */
export const CAPABILITY_LEVELS = [
  'modelled',
  'partial',
  'sourced_only',
  'not_modelled',
  'unable_to_verify',
] as const;
export type CapabilityLevel = (typeof CAPABILITY_LEVELS)[number];

/** The levels at which an engine is allowed to return a determinate answer in that domain. */
export const DETERMINATE_LEVELS: readonly CapabilityLevel[] = ['modelled', 'partial'];

export const VOLATILITY_STATUSES = ['stable', 'under_litigation', 'recently_changed'] as const;
export type VolatilityStatus = (typeof VOLATILITY_STATUSES)[number];

const DECIDING_OFFICES: readonly DecidingOffice[] = [
  'DSO',
  'registrar',
  'domicile_officer',
  'financial_aid',
  'USCIS',
  'SEVP',
  'state_higher_ed_agency',
];

const FINDING_RESULTS: readonly FindingResult[] = [
  'ineligible',
  'potential_risk',
  'review_recommended',
  'unable_to_verify',
  'no_issue',
];

// ---------------------------------------------------------------------------------------------
// The shapes
// ---------------------------------------------------------------------------------------------

export interface Volatility {
  status: VolatilityStatus;
  note: string;
}

/**
 * A body that decides something in this jurisdiction.
 *
 * `deciding_office` on a rule stays as it was — it is the Finding's own vocabulary and a closed set
 * every screen already renders. This is the richer record behind it: several states split residency
 * and aid across different bodies (a coordinating board and a grant commission), and a product that
 * names "the financial aid office" for both is losing the fact that they are not the same building.
 */
export interface Agency {
  id: string;
  /** The body's full name, as it names itself. */
  name: string;
  /** How it is abbreviated in a chip — the body's own abbreviation, never one PathWise coins. */
  short_name: string;
  /** Which domains this body decides. A body may decide both. */
  decides: PackDomain[];
  source_url?: string;
}

/**
 * What this pack claims to be able to answer, per domain. Authored, not inferred: a pack that has
 * a `clock` block is not thereby a complete residency model, and only the author knows what was
 * verified against the source.
 */
export interface Capability {
  domain: PackDomain;
  level: CapabilityLevel;
  /** The specific questions this pack answers. Free-form ids, for display and for the honesty test. */
  answers?: string[];
  /** Required below `modelled`: what is missing, in words a reader can act on. */
  reason?: string;
}

/**
 * One gate: a condition that, when it matches, decides the domain outright.
 *
 * `gates` has always been an array and only `gates[0]` was ever read, which meant a jurisdiction
 * with two gates silently lost the second — the worst possible failure mode, because the pack looked
 * complete. Every gate is evaluated now, in the order the pack lists them, which is the order the
 * source applies them in.
 */
export interface Gate {
  id: string;
  cite: string;
  /** The abbreviated spelling for a chip, in the pack's own words. */
  display_cite: string;
  /** The condition, as a clause the engine's small readers understand. Unreadable ⇒ does not fire. */
  when: string;
  result: FindingResult;
  headline: string;
  explain: string;
  deciding_office: DecidingOffice;
  /** Whether a firing gate ends the enquiry, as the source prescribes. */
  stops_analysis: boolean;
  /** Optional link to the richer agency record. */
  agency_id?: string;
}

export interface Clock {
  duration_days: number;
  anchor: ClockAnchor;
  anchor_definition: string;
  start_rule: ClockStartRule;
  start_rule_note: string;
  start_rule_cite: string;
}

export interface Dependency {
  presumed_dependent_under_age: number;
  cite: string;
  exceptions: string[];
}

export interface IntentFactor {
  id: string;
  weight: string;
  inapplicable_when?: string;
  caveat?: string;
}

export interface AuxiliaryActsWarning {
  cite: string;
  note: string;
  acts: string[];
}

export interface ConstructionRule {
  id: string;
  note: string;
  cite?: string;
  /**
   * Which reasoner explains this rule against a record. Absent means "no reasoner" — the rule is
   * still surfaced verbatim, with the pack's own words and no invented relevance. That is the honest
   * degradation: a jurisdiction whose construction rules PathWise cannot reason about says the rule
   * and stops, rather than borrowing the reasoning written for another state's rule of the same name.
   */
  kind?: string;
}

/** Fields every pack carries, whatever domain it is for. */
interface PackHeader {
  schema_version: number;
  pack_id: string;
  domain: PackDomain;
  jurisdiction: string;
  authority: string;
  source_url: string;
  guidelines_effective?: string;
  verified_on: ISODate;
  /** Who read the primary source on `verified_on`. Optional; absent means unattributed. */
  verified_by?: string;
  volatility: Volatility;
  agencies: Agency[];
  capabilities: Capability[];
}

export interface DomicilePack extends PackHeader {
  domain: 'residency';
  /**
   * The body that rules on residency here. Optional only because a pack WITH gates states it on
   * each gate; required when `gates` is empty, since there is then nothing else carrying it. The
   * parser enforces exactly that, because a finding with no office named is a finding that has
   * quietly become PathWise's own opinion.
   */
  deciding_office?: DecidingOffice;
  gates: Gate[];
  /**
   * Optional, and that is the whole point of it being optional: not every state has a durational
   * requirement. Tennessee has none. A pack without a clock is not an incomplete pack, and the
   * engine must not treat a missing clock as a clock of zero days.
   */
  clock?: Clock;
  dependency?: Dependency;
  intent_factors?: IntentFactor[];
  auxiliary_acts_warning?: AuxiliaryActsWarning;
  construction_rules?: ConstructionRule[];
}

export interface AidBlock {
  when: string;
  result: string;
  headline: string;
  cite: string;
}

export interface AidProvision {
  id: string;
  note: string;
  requires: string[];
  volatility?: string;
}

export interface AidPack extends PackHeader {
  domain: 'aid';
  display_cite: string;
  form_selection: { rule: string; fafsa_blocks: AidBlock[] };
  state_provisions: AidProvision[];
  deadlines: { priority_date: string; rule: string; cite: string };
  confidentiality: { note: string; product_consequence: string };
}

// ---------------------------------------------------------------------------------------------
// The parsers. Small, strict, and they throw.
// ---------------------------------------------------------------------------------------------

export class PackSchemaError extends Error {
  constructor(packId: string, problems: string[]) {
    super(
      `Rule pack "${packId}" does not satisfy the pack schema:\n` +
        problems.map((p) => `  - ${p}`).join('\n'),
    );
    this.name = 'PackSchemaError';
  }
}

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Collects problems instead of throwing on the first, so one run reports the whole pack.
 *
 * Deliberate: someone authoring the first pack for a new state should get every structural mistake
 * in one pass, not discover them one deploy at a time.
 */
class Check {
  constructor(
    private readonly where: string,
    /** Shared with every child, so one throw reports everything found anywhere in the pack. */
    readonly problems: string[] = [],
  ) {}

  at(path: string): Check {
    return new Check(`${this.where}.${path}`, this.problems);
  }

  fail(msg: string): void {
    this.problems.push(`${this.where}: ${msg}`);
  }

  str(o: Obj, key: string, required = true): string {
    const v = o[key];
    if (typeof v === 'string' && v.length > 0) return v;
    if (v === undefined && !required) return '';
    this.fail(`${key} must be a non-empty string (got ${JSON.stringify(v)})`);
    return '';
  }

  num(o: Obj, key: string): number {
    const v = o[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    this.fail(`${key} must be a finite number (got ${JSON.stringify(v)})`);
    return 0;
  }

  bool(o: Obj, key: string): boolean {
    const v = o[key];
    if (typeof v === 'boolean') return v;
    this.fail(`${key} must be a boolean (got ${JSON.stringify(v)})`);
    return false;
  }

  /**
   * Membership of a closed set. This is the check that matters most: every set in this file selects
   * engine behaviour, so a value outside one has no behaviour to select and must not be given a
   * default. The message names the alternatives, because the author of a new pack is the person who
   * will read it.
   */
  oneOf<T extends string>(o: Obj, key: string, allowed: readonly T[]): T {
    const v = o[key];
    if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) return v as T;
    this.fail(`${key} must be one of [${allowed.join(', ')}] (got ${JSON.stringify(v)})`);
    return allowed[0];
  }

  arr(o: Obj, key: string, required = true): unknown[] {
    const v = o[key];
    if (Array.isArray(v)) return v;
    if (v === undefined && !required) return [];
    this.fail(`${key} must be an array (got ${JSON.stringify(v)})`);
    return [];
  }

  strArr(o: Obj, key: string, required = true): string[] {
    return this.arr(o, key, required).filter((x): x is string => typeof x === 'string');
  }

  obj(o: Obj, key: string, required = true): Obj {
    const v = o[key];
    if (isObj(v)) return v;
    if (v === undefined && !required) return {};
    this.fail(`${key} must be an object (got ${JSON.stringify(v)})`);
    return {};
  }
}

function parseVolatility(c: Check, raw: Obj): Volatility {
  const v = c.obj(raw, 'volatility');
  const vc = c.at('volatility');
  return { status: vc.oneOf(v, 'status', VOLATILITY_STATUSES), note: vc.str(v, 'note') };
}

function parseAgencies(c: Check, raw: Obj): Agency[] {
  return c.arr(raw, 'agencies').map((entry, i) => {
    const ac = c.at(`agencies[${i}]`);
    if (!isObj(entry)) {
      ac.fail('must be an object');
      return { id: '', name: '', short_name: '', decides: [] };
    }
    const decides = ac.arr(entry, 'decides').flatMap((d, j): PackDomain[] => {
      if (typeof d === 'string' && (DOMAINS as readonly string[]).includes(d)) {
        return [d as PackDomain];
      }
      c.at(`agencies[${i}]`).fail(
        `decides[${j}] must be one of [${DOMAINS.join(', ')}] (got ${JSON.stringify(d)})`,
      );
      return [];
    });
    return {
      id: ac.str(entry, 'id'),
      name: ac.str(entry, 'name'),
      short_name: ac.str(entry, 'short_name'),
      decides,
      source_url: typeof entry.source_url === 'string' ? entry.source_url : undefined,
    };
  });
}

function parseCapabilities(c: Check, raw: Obj): Capability[] {
  const caps = c.arr(raw, 'capabilities').map((entry, i) => {
    const cc = c.at(`capabilities[${i}]`);
    if (!isObj(entry)) {
      cc.fail('must be an object');
      return { domain: 'residency' as PackDomain, level: 'not_modelled' as CapabilityLevel };
    }
    const level = cc.oneOf(entry, 'level', CAPABILITY_LEVELS);
    // Anything short of a full model has to say what is missing. A pack that declares itself partial
    // without saying which part is not being honest, it is being vague — and vague is what the
    // capability field exists to eliminate.
    if (level !== 'modelled' && typeof entry.reason !== 'string') {
      cc.fail(`level "${level}" requires a "reason" explaining what is not modelled`);
    }
    return {
      domain: cc.oneOf(entry, 'domain', DOMAINS),
      level,
      answers: Array.isArray(entry.answers)
        ? (entry.answers as unknown[]).filter((x): x is string => typeof x === 'string')
        : undefined,
      reason: typeof entry.reason === 'string' ? entry.reason : undefined,
    };
  });
  if (caps.length === 0) c.fail('capabilities must declare at least one domain');
  return caps;
}

function parseHeader(c: Check, raw: Obj, domain: PackDomain): PackHeader {
  const agencies = parseAgencies(c, raw);
  const capabilities = parseCapabilities(c, raw);

  // A capability for a domain nobody decides is a claim with no office behind it.
  for (const cap of capabilities) {
    if (
      DETERMINATE_LEVELS.includes(cap.level) &&
      !agencies.some((a) => a.decides.includes(cap.domain))
    ) {
      c.fail(
        `capabilities declares "${cap.level}" for ${cap.domain} but no agency in this pack decides ${cap.domain}`,
      );
    }
  }

  return {
    schema_version: c.num(raw, 'schema_version'),
    pack_id: c.str(raw, 'pack_id'),
    domain: c.oneOf(raw, 'domain', [domain]),
    jurisdiction: c.str(raw, 'jurisdiction'),
    authority: c.str(raw, 'authority'),
    source_url: c.str(raw, 'source_url'),
    guidelines_effective:
      typeof raw.guidelines_effective === 'string' ? raw.guidelines_effective : undefined,
    verified_on: c.str(raw, 'verified_on'),
    verified_by: typeof raw.verified_by === 'string' ? raw.verified_by : undefined,
    volatility: parseVolatility(c, raw),
    agencies,
    capabilities,
  };
}

/** Parse a domicile pack, or throw with every problem found. */
export function parseDomicilePack(raw: unknown): DomicilePack {
  const packId = isObj(raw) && typeof raw.pack_id === 'string' ? raw.pack_id : '<unknown>';
  const c = new Check('pack');
  if (!isObj(raw)) throw new PackSchemaError(packId, ['pack must be an object']);

  const header = parseHeader(c, raw, 'residency');
  const agencyIds = new Set(header.agencies.map((a) => a.id));

  // May be empty, and Tennessee is why. Tenn. Comp. R. & Regs. 1540-01-01-.03 classifies on
  // domicile and nothing else: no status gate, no alien provision, nothing that closes the door
  // outright. A schema that demanded a gate would have forced whoever authored that pack to invent
  // one, and an invented gate is fabricated law wearing a citation. An empty list is a fact about
  // the jurisdiction; `checkEligibleAlienGate` finds nothing to fire and the analysis continues.
  const rawGates = c.arr(raw, 'gates');

  const gates: Gate[] = rawGates.map((entry, i) => {
    const gc = c.at(`gates[${i}]`);
    if (!isObj(entry)) {
      gc.fail('must be an object');
      return {
        id: '', cite: '', display_cite: '', when: '', result: 'unable_to_verify',
        headline: '', explain: '', deciding_office: 'registrar', stops_analysis: false,
      };
    }
    const agencyId = typeof entry.agency_id === 'string' ? entry.agency_id : undefined;
    if (agencyId && !agencyIds.has(agencyId)) {
      gc.fail(`agency_id "${agencyId}" is not declared in this pack's agencies`);
    }
    return {
      id: gc.str(entry, 'id'),
      cite: gc.str(entry, 'cite'),
      display_cite: gc.str(entry, 'display_cite'),
      when: gc.str(entry, 'when'),
      result: gc.oneOf(entry, 'result', FINDING_RESULTS),
      headline: gc.str(entry, 'headline'),
      explain: gc.str(entry, 'explain'),
      deciding_office: gc.oneOf(entry, 'deciding_office', DECIDING_OFFICES),
      stops_analysis: gc.bool(entry, 'stops_analysis'),
      agency_id: agencyId,
    };
  });

  // Who decides. A gated pack carries it per gate; a gateless one must state it at the top, or no
  // finding it produces could name an office at all.
  let decidingOffice: DecidingOffice | undefined;
  if (raw.deciding_office !== undefined) {
    decidingOffice = c.oneOf(raw, 'deciding_office', DECIDING_OFFICES);
  } else if (gates.length === 0) {
    c.fail(
      'deciding_office is required when a pack states no gates — with no gate to carry it, nothing ' +
        'else in the pack names the body that rules on residency',
    );
  }

  let clock: Clock | undefined;
  if (raw.clock !== undefined) {
    const k = c.obj(raw, 'clock');
    const kc = c.at('clock');
    clock = {
      duration_days: kc.num(k, 'duration_days'),
      anchor: kc.oneOf(k, 'anchor', CLOCK_ANCHORS),
      anchor_definition: kc.str(k, 'anchor_definition'),
      start_rule: kc.oneOf(k, 'start_rule', CLOCK_START_RULES),
      start_rule_note: kc.str(k, 'start_rule_note'),
      start_rule_cite: kc.str(k, 'start_rule_cite'),
    };
  }

  let dependency: Dependency | undefined;
  if (raw.dependency !== undefined) {
    const d = c.obj(raw, 'dependency');
    const dc = c.at('dependency');
    dependency = {
      presumed_dependent_under_age: dc.num(d, 'presumed_dependent_under_age'),
      cite: dc.str(d, 'cite'),
      exceptions: dc.strArr(d, 'exceptions'),
    };
  }

  const intentFactors: IntentFactor[] | undefined =
    raw.intent_factors === undefined
      ? undefined
      : c.arr(raw, 'intent_factors').map((entry, i) => {
          const fc = c.at(`intent_factors[${i}]`);
          if (!isObj(entry)) {
            fc.fail('must be an object');
            return { id: '', weight: '' };
          }
          return {
            id: fc.str(entry, 'id'),
            weight: fc.str(entry, 'weight'),
            inapplicable_when:
              typeof entry.inapplicable_when === 'string' ? entry.inapplicable_when : undefined,
            caveat: typeof entry.caveat === 'string' ? entry.caveat : undefined,
          };
        });

  let auxiliary: AuxiliaryActsWarning | undefined;
  if (raw.auxiliary_acts_warning !== undefined) {
    const a = c.obj(raw, 'auxiliary_acts_warning');
    const ac = c.at('auxiliary_acts_warning');
    auxiliary = { cite: ac.str(a, 'cite'), note: ac.str(a, 'note'), acts: ac.strArr(a, 'acts') };
  }

  const construction: ConstructionRule[] | undefined =
    raw.construction_rules === undefined
      ? undefined
      : c.arr(raw, 'construction_rules').map((entry, i) => {
          const rc = c.at(`construction_rules[${i}]`);
          if (!isObj(entry)) {
            rc.fail('must be an object');
            return { id: '', note: '' };
          }
          return {
            id: rc.str(entry, 'id'),
            note: rc.str(entry, 'note'),
            cite: typeof entry.cite === 'string' ? entry.cite : undefined,
            kind: typeof entry.kind === 'string' ? entry.kind : undefined,
          };
        });

  if (c.problems.length) throw new PackSchemaError(packId, c.problems);

  return {
    ...header,
    domain: 'residency',
    deciding_office: decidingOffice,
    gates,
    clock,
    dependency,
    intent_factors: intentFactors,
    auxiliary_acts_warning: auxiliary,
    construction_rules: construction,
  };
}

/** Parse an aid pack, or throw with every problem found. */
export function parseAidPack(raw: unknown): AidPack {
  const packId = isObj(raw) && typeof raw.pack_id === 'string' ? raw.pack_id : '<unknown>';
  const c = new Check('pack');
  if (!isObj(raw)) throw new PackSchemaError(packId, ['pack must be an object']);

  const header = parseHeader(c, raw, 'aid');

  const fs = c.obj(raw, 'form_selection');
  const fsc = c.at('form_selection');
  const blocks: AidBlock[] = fsc.arr(fs, 'fafsa_blocks').map((entry, i) => {
    const bc = c.at(`form_selection.fafsa_blocks[${i}]`);
    if (!isObj(entry)) {
      bc.fail('must be an object');
      return { when: '', result: '', headline: '', cite: '' };
    }
    return {
      when: bc.str(entry, 'when'),
      result: bc.str(entry, 'result'),
      headline: bc.str(entry, 'headline'),
      cite: bc.str(entry, 'cite'),
    };
  });

  const provisions: AidProvision[] = c.arr(raw, 'state_provisions').map((entry, i) => {
    const pc = c.at(`state_provisions[${i}]`);
    if (!isObj(entry)) {
      pc.fail('must be an object');
      return { id: '', note: '', requires: [] };
    }
    return {
      id: pc.str(entry, 'id'),
      note: pc.str(entry, 'note'),
      requires: pc.strArr(entry, 'requires'),
      volatility: typeof entry.volatility === 'string' ? entry.volatility : undefined,
    };
  });

  const dl = c.obj(raw, 'deadlines');
  const dlc = c.at('deadlines');
  const conf = c.obj(raw, 'confidentiality');
  const cfc = c.at('confidentiality');

  if (c.problems.length) throw new PackSchemaError(packId, c.problems);

  return {
    ...header,
    domain: 'aid',
    display_cite: c.str(raw, 'display_cite'),
    form_selection: { rule: fsc.str(fs, 'rule'), fafsa_blocks: blocks },
    state_provisions: provisions,
    deadlines: {
      priority_date: dlc.str(dl, 'priority_date'),
      rule: dlc.str(dl, 'rule'),
      cite: dlc.str(dl, 'cite'),
    },
    confidentiality: {
      note: cfc.str(conf, 'note'),
      product_consequence: cfc.str(conf, 'product_consequence'),
    },
  };
}
