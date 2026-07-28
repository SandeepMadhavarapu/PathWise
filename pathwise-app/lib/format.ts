import type { DecidingOffice } from "./types";

// Display-format the visa status code (display text only): F1 -> F-1, J1 -> J-1, M1 -> M-1.
export function formatImmigrationStatus(statusLabel: string): string {
  const map: Record<string, string> = { F1: "F-1", J1: "J-1", M1: "M-1" };
  return map[statusLabel] ?? statusLabel;
}

const DECIDING_OFFICE_LABEL: Record<DecidingOffice, string> = {
  DSO: "Designated School Official",
  registrar: "Registrar",
  domicile_officer: "Domicile Officer",
  financial_aid: "Financial Aid Office",
  USCIS: "USCIS",
  SEVP: "SEVP",
  state_higher_ed_agency: "the state higher-education agency",
};

export function formatDecidingOffice(office: DecidingOffice): string {
  return DECIDING_OFFICE_LABEL[office];
}
