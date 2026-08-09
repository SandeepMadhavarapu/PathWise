import type { Agency, PackDomain } from "./rulepacks/schema";
import type { DecidingOffice } from "./types";

// Display-format the visa status code (display text only): F1 -> F-1, J1 -> J-1, M1 -> M-1.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A date as this product writes one: "1 Jun 2027".
 *
 * It lived in engines/domicile.ts, which meant engines/domicile-gate.ts could not reach it —
 * domicile.ts imports the gate, so the dependency only runs one way. The gate therefore printed
 * raw ISO into user-facing prose ("earliest eligibility 2027-06-01") while the full analysis one
 * file over printed "1 Jun 2027" for the same value. The narrow gate path is the one /check uses,
 * so the unformatted half was the half real visitors saw.
 *
 * Here rather than there because this is where the product already keeps its one spelling of a
 * thing. domicile.ts re-exports it, so its existing callers are untouched.
 */
export function formatDomicileDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function formatImmigrationStatus(statusLabel: string): string {
  const map: Record<string, string> = { F1: "F-1", J1: "J-1", M1: "M-1" };
  return map[statusLabel] ?? statusLabel;
}

/* =============================================================================
   Countdowns against a regulatory limit.

   The engines report headroom as a SIGNED number — `daysToCliff` is `365 - fullTimeDays`, and it
   goes negative the moment the cliff is crossed. That is correct arithmetic and it is not changed
   here. What was wrong is that six display sites formatted it verbatim, so a student with two
   ordinary full-time CPT years read:

       "-366 days from the CPT cliff"
       "at 731 days you are -366 days from 365 — cross it and you lose OPT eligibility"

   The first is not English. The second is worse: it is the future tense, promising a consequence
   to someone for whom it has already happened, on the one question — OPT eligibility — that
   decides whether an F-1 student can stay. And the same card's detail line already said
   "OPT eligibility lost for this level", so one card stated both.

   It survived because every fixture, test and screenshot sits INSIDE the cap: Priya is at 342 of
   365 and day 70 of 90, so the negative branch had never once rendered.

   The sign is therefore read in exactly one place. Callers get a magnitude and a direction and
   cannot format a negative by accident; a seventh surface added later inherits the fix by using
   these rather than by remembering to.

   Presentation only. No engine, no pack, no arithmetic, no band, no outcome — and for any
   non-negative input every string below is byte-identical to what it replaced, which is why the
   342-day path and the golden fixture do not move.
   ============================================================================= */

/** A countdown reduced to how far, and which side of the line. */
export interface LimitDistance {
  /** Always positive: the distance itself, never a signed remainder. */
  days: number;
  /** True once the limit has been passed. */
  crossed: boolean;
}

export function limitDistance(remaining: number): LimitDistance {
  return { days: Math.abs(remaining), crossed: remaining < 0 };
}

/** "23 days from the CPT cliff" · "366 days past the CPT cliff" */
export function formatCliffDistance(remaining: number): string {
  const { days, crossed } = limitDistance(remaining);
  return `${days} ${days === 1 ? "day" : "days"} ${crossed ? "past" : "from"} the CPT cliff`;
}

/** The short ledger form: "23 to the cliff" · "366 past the cliff" */
export function formatToCliff(remaining: number): string {
  const { days, crossed } = limitDistance(remaining);
  return crossed ? `${days} past the cliff` : `${days} to the cliff`;
}

/** The landing's one-line verdict: "23 days of margin" · "366 days past the cliff" */
export function formatMargin(remaining: number): string {
  const { days, crossed } = limitDistance(remaining);
  return crossed
    ? `${days} ${days === 1 ? "day" : "days"} past the cliff`
    : `${days} ${days === 1 ? "day" : "days"} of margin`;
}

/** A capped clock: "20 days remaining" · "12 days over the cap" */
export function formatCapRemaining(remaining: number): string {
  const { days, crossed } = limitDistance(remaining);
  return `${days} ${days === 1 ? "day" : "days"} ${crossed ? "over the cap" : "remaining"}`;
}

/**
 * How an office is NAMED — standalone, Title Case, no leading article.
 *
 * This is the label register: it appears after a colon or a label ("Decided by: Domicile Officer"),
 * where an article would read as a typo. The sentence register — "decided by your DSO", "and the
 * registrar decides on the record as it stands" — is a different thing and lives in
 * `OFFICE_PROSE` in engines/next-steps.ts. The two are deliberately not the same map, because a
 * label and a clause need different grammar and collapsing them breaks one or the other.
 *
 * `state_higher_ed_agency` read "the state higher-education agency" here, lowercase and with an
 * article, which was the odd one out among six Title Case labels and looked like an oversight
 * beside "Domicile Officer".
 */
const DECIDING_OFFICE_LABEL: Record<DecidingOffice, string> = {
  DSO: "Designated School Official",
  registrar: "Registrar",
  domicile_officer: "Domicile Officer",
  financial_aid: "Financial Aid Office",
  USCIS: "USCIS",
  SEVP: "SEVP",
  state_higher_ed_agency: "State Higher-Education Agency",
};

export function formatDecidingOffice(office: DecidingOffice): string {
  return DECIDING_OFFICE_LABEL[office];
}

/**
 * The body that decides, named as specifically as the pack allows.
 *
 * `DecidingOffice` is a closed set shared by every jurisdiction, so its members are ROLES —
 * "Domicile Officer", "Registrar" — and a role is the right answer when the student deals with a
 * role. But one member, `state_higher_ed_agency`, is a role only because the union has nowhere to
 * put fifty different commissions. Rendering Tennessee's finding as "State Higher-Education Agency"
 * threw away the fact that the pack knows exactly which one: the Tennessee Higher Education
 * Commission, in its `agencies` list, added in Phase 1 and until now read only by /coverage.
 *
 * So the generic member — and ONLY the generic member — is resolved against the pack's agencies.
 * That restriction is the important part:
 *
 *   · Virginia's residency finding says `domicile_officer`. Its pack also names SCHEV, and SCHEV
 *     really does set Virginia's criteria — but the domicile officer is who rules on the student's
 *     case, and they are not the same body. Substituting one for the other would be wrong, not
 *     more specific, so a named role is always left exactly as it is.
 *   · Tennessee's says `state_higher_ed_agency`, which names no body at all, so naming one is
 *     strictly more informative and cannot contradict anything.
 *
 * Falls back to the generic label when no pack is available or none of its agencies decides this
 * domain — the honest answer when PathWise does not know which body it is.
 */
export function formatDecidingBody(
  office: DecidingOffice,
  agencies: readonly Agency[] | undefined,
  domain: PackDomain,
): string {
  if (office !== "state_higher_ed_agency") return formatDecidingOffice(office);

  const agency = agencies?.find((a) => a.decides.includes(domain));
  if (!agency) return formatDecidingOffice(office);

  // "Tennessee Higher Education Commission (THEC)" — the body's own name and its own abbreviation.
  // Never one PathWise coins: `short_name` is authored in the pack for exactly this.
  return agency.short_name && agency.short_name !== agency.name
    ? `${agency.name} (${agency.short_name})`
    : agency.name;
}
