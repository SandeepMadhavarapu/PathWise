// jurisdiction.ts — the seam. The only file in the app that calls resolveJurisdiction, and the only
// entry point a screen uses to get a residency or aid finding.
//
// Before this file existed, the question "under whose rules?" was answered in two different places
// and in two different ways: the engines answered it by importing the Virginia packs at module
// scope, and /check answered it with a local `if` that decided whether to call them at all. The
// first was silently wrong for every state but one — computeAidEligibility would print "Virginia
// state aid" and cite SCHEV for a Texas student, because it never read the student's jurisdiction.
// The second was correct but private: one screen's guard, which the four other engine call sites
// did not have and did not know they needed.
//
// Now there is one answer. A Student carries a jurisdiction; this file resolves it to a pack or to
// nothing; the engines take the pack as an argument and can no longer be run without one. A state
// PathWise has not modelled routes to unmodelled-jurisdiction.ts instead — `unable_to_verify`, the
// office that does decide, and a link where coverage.json has a verified one.
//
// The property that matters, and the reason `display` is optional: an unmodelled jurisdiction has
// no cites to render, so a screen that tries to show one has nothing to show rather than something
// borrowed. The type makes the leak unrepresentable instead of merely unlikely.

import type { Finding, ISODate, Student } from '../types';
import {
  describeUnmodelled,
  resolveJurisdiction,
  type JurisdictionPacks,
  type UnmodelledJurisdiction,
} from '../rulepacks';
import { jurisdictionByCode } from '../coverage';
import { domicileView, runDomicileGate, type DomicileInput } from './domicile-gate';
import { runDomicileAnalysis, type DomicileAnalysis } from './domicile';
import {
  aidView,
  computeAidEligibility,
  resolveAidDeadline,
  selectAidForm,
  type AidDeadline,
  type AidEligibilityInput,
  type AidFormSelection,
} from './aid-eligibility';
import { unmodelledAidFinding, unmodelledResidencyFinding } from './unmodelled-jurisdiction';

/**
 * The citations and figures a screen prints in its own chrome — chips, hero lines, prose.
 *
 * Present only when a pack decided them. This is the replacement for the GATE_DISPLAY_CITE /
 * AID_DISPLAY_CITE / DOMICILE_DURATION_DAYS module constants, which were Virginia's values no
 * matter which state the screen was rendering.
 */
export interface JurisdictionDisplay {
  /** The gate cite, abbreviated for a chip, in the pack's own spelling. */
  residencyCite: string;
  /** The same section reference written out in full. */
  residencyFullCite: string;
  aidCite: string;
  /**
   * The jurisdiction's durational requirement in days. Absent where it has none — Tennessee sets no
   * durational component at all — so a screen quoting "the N-day clock" has nothing to quote rather
   * than quoting zero, which would read as a rule and is not one.
   */
  durationDays?: number;
}

/** A student's jurisdiction, resolved: either PathWise has its rules, or it says so. */
export interface JurisdictionContext {
  code: string;
  name: string;
  /** The packs that decide this jurisdiction. Present iff PathWise has modelled it. */
  packs?: JurisdictionPacks;
  /** The honest description of a jurisdiction with no pack. Present iff it has none. */
  unmodelled?: UnmodelledJurisdiction;
  /** Display strings. Present iff `packs` is — there is nothing to cite otherwise. */
  display?: JurisdictionDisplay;
}

/**
 * The jurisdiction a student is in on a given date.
 *
 * Reads `jurisdiction_history` — the entry whose window contains `asOf`, else the most recent one
 * to have started. A student with no history at all has no jurisdiction, and that is reported as
 * such rather than defaulted to anything.
 */
export function currentJurisdictionCode(student: Student, asOf?: ISODate): string | undefined {
  const history = student.jurisdiction_history;
  if (!history?.length) return undefined;
  if (asOf) {
    const containing = history.find((h) => h.from <= asOf && (!h.to || h.to >= asOf));
    if (containing) return containing.state;
  }
  return history.slice().sort((a, b) => (a.from < b.from ? 1 : -1))[0].state;
}

/**
 * Resolve a jurisdiction code to its context.
 *
 * The mismatch check is not defensive noise: REGISTRY maps a code to packs by hand, and a pack
 * filed under the wrong code would make every engine below silently authoritative about the wrong
 * state — the exact failure this whole seam exists to prevent. Throwing makes a mis-registration a
 * build-time-visible bug instead of a citation a student would have no way to question.
 */
export function jurisdictionForCode(code: string): JurisdictionContext {
  const name = jurisdictionByCode(code)?.name ?? code;
  const packs = resolveJurisdiction(code);

  if (!packs) {
    return { code, name, unmodelled: describeUnmodelled(code) };
  }

  for (const [domain, pack] of [
    ['domicile', packs.domicile],
    ['aid', packs.aid],
  ] as const) {
    // `aid` is optional — a jurisdiction may have residency authored and aid not.
    if (!pack) continue;
    if (pack.jurisdiction !== code) {
      throw new Error(
        `Rulepack misregistration: the ${domain} pack "${pack.pack_id}" declares jurisdiction ` +
          `"${pack.jurisdiction}" but is registered under "${code}". A pack must never answer for a ` +
          `jurisdiction it was not authored for.`,
      );
    }
  }

  const d = domicileView(packs.domicile);
  // No aid pack means no aid citation to render — the same discipline as an unmodelled jurisdiction
  // having no `display` at all. A screen with nothing to cite shows nothing, never something borrowed.
  const a = packs.aid ? aidView(packs.aid) : undefined;
  return {
    code,
    name,
    packs,
    display: {
      residencyCite: d.gateDisplayCite,
      residencyFullCite: d.gateCite,
      aidCite: a?.displayCite ?? '',
      durationDays: d.durationDays,
    },
  };
}

/** The same, for a student — the form every screen actually uses. */
export function jurisdictionFor(student: Student, asOf?: ISODate): JurisdictionContext {
  const code = currentJurisdictionCode(student, asOf);
  // No jurisdiction on the record is not the same as an unmodelled one, and is not Virginia either.
  // `describeUnmodelled` returns undefined for a code coverage.json does not list, which is exactly
  // what an absent code is, so the unmodelled findings below still say something true about it.
  return jurisdictionForCode(code ?? '');
}

/**
 * The residency finding for this student, under this jurisdiction's rules — or the honest refusal
 * when PathWise has no rules to apply.
 */
export function residencyFindingFor(ctx: JurisdictionContext, input: DomicileInput): Finding {
  if (!ctx.packs) return unmodelledResidencyFinding(unmodelledOf(ctx));
  return runDomicileGate({ ...input, packs: ctx.packs });
}

/** The aid finding, same contract. */
export function aidFindingFor(ctx: JurisdictionContext, input: AidEligibilityInput): Finding {
  // No jurisdiction pack at all, or one with no aid rules authored: either way PathWise has no aid
  // rules for this state and says so, rather than reaching for the nearest pack that has some.
  if (!ctx.packs?.aid) return unmodelledAidFinding(unmodelledOf(ctx));
  return computeAidEligibility({ ...input, packs: { ...ctx.packs, aid: ctx.packs.aid } });
}

/**
 * The full domicile analysis. Returns the same `DomicileAnalysis` shape either way so a screen does
 * not branch: an unmodelled jurisdiction yields the refusal as its `finding`, `gated: false` (no
 * gate was applied — there is no pack to apply one from) and no worked sections.
 */
export function domicileAnalysisFor(
  ctx: JurisdictionContext,
  input: DomicileInput,
): DomicileAnalysis {
  if (!ctx.packs) {
    return {
      finding: unmodelledResidencyFinding(unmodelledOf(ctx)),
      gated: false,
      construction: [],
    };
  }
  return runDomicileAnalysis({ ...input, packs: ctx.packs });
}

/**
 * Which form this student files, and what is left when neither one opens the door.
 *
 * Routed rather than imported for the same reason everything else here is: which forms exist, and
 * whether a status closes them, is the aid pack's answer and not a fact about students in general.
 * Absent without a pack — a screen with no jurisdiction has no form to recommend, and recommending
 * one regardless is precisely the failure this returns `undefined` to prevent.
 */
export function aidFormFor(
  ctx: JurisdictionContext,
  student: Student,
): AidFormSelection | undefined {
  if (!ctx.packs?.aid) return undefined;
  return selectAidForm(student, aidView(ctx.packs.aid));
}

/** The aid deadline arithmetic, which needs the pack's priority date and earliest-of rule. */
export function aidDeadlineFor(
  ctx: JurisdictionContext,
  input: AidEligibilityInput,
): AidDeadline | undefined {
  if (!ctx.packs?.aid) return undefined;
  return resolveAidDeadline({ ...input, packs: { ...ctx.packs, aid: ctx.packs.aid } });
}

/**
 * The unmodelled description for a context that has no packs.
 *
 * A code coverage.json does not list at all (including the empty string, i.e. a student with no
 * jurisdiction on record) has no entry to describe, so one is synthesised that claims nothing: no
 * authority, no source link. The unmodelled findings render that as "PathWise has not verified an
 * official source", which is the truth about a state it has never heard of.
 */
function unmodelledOf(ctx: JurisdictionContext): UnmodelledJurisdiction {
  return (
    ctx.unmodelled ?? {
      code: ctx.code,
      name: ctx.name || 'this jurisdiction',
    }
  );
}
