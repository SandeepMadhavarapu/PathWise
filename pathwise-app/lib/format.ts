import type { Agency, PackDomain } from "./rulepacks/schema";
import type { DecidingOffice } from "./types";

// Display-format the visa status code (display text only): F1 -> F-1, J1 -> J-1, M1 -> M-1.
export function formatImmigrationStatus(statusLabel: string): string {
  const map: Record<string, string> = { F1: "F-1", J1: "J-1", M1: "M-1" };
  return map[statusLabel] ?? statusLabel;
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
