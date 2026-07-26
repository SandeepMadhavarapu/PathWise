// tokens.ts — the JS-side mirror of the CSS custom properties in app/globals.css.
// Presentation only: nothing here computes a value an engine hasn't already produced.
// Use `statusKey(...)` to turn an engine-computed band/result into a status token name —
// the numbers and bands themselves are untouched, only which color class they render with.

export type StatusKey = "done" | "active" | "warn" | "blocked" | "idle";

// The three engines (cpt-ledger, opt-budget, unemployment-clock) all emit this same
// display-only band convention: 'green' | 'amber' | 'red'.
export type EngineBand = "green" | "amber" | "red";

export function statusFromBand(band: EngineBand): StatusKey {
  switch (band) {
    case "green":
      return "done";
    case "amber":
      return "warn";
    case "red":
      return "blocked";
  }
}

// FindingResult -> status token, for domain cards and finding badges.
// ineligible is a hard gate (blocked); no_issue needs no action (done); potential_risk
// and unable_to_verify both mean "look at this" (warn); review_recommended is an open
// task the office still has to act on (active).
export type FindingResultLike =
  | "no_issue"
  | "review_recommended"
  | "potential_risk"
  | "unable_to_verify"
  | "ineligible";

export function statusFromFindingResult(result: FindingResultLike): StatusKey {
  switch (result) {
    case "ineligible":
      return "blocked";
    case "review_recommended":
      return "active";
    case "potential_risk":
    case "unable_to_verify":
      return "warn";
    case "no_issue":
      return "done";
  }
}

export const SPACING = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "24px",
  6: "32px",
  7: "48px",
} as const;

export const RADIUS = {
  input: "6px",
  card: "10px",
  pill: "999px",
} as const;

export const MOTION = {
  ease: "cubic-bezier(0.2, 0, 0, 1)",
  fast: "140ms",
  slow: "220ms",
} as const;
