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
// ineligible is a hard gate (blocked); no_issue needs no action (done); potential_risk means
// "look at this" (warn); review_recommended is an open task the office still has to act on
// (active); unable_to_verify is not a verdict at all (idle).
//
// That last one was returning `warn` — the same amber as "you are approaching a limit" — which is a
// claim PathWise has not made. Not knowing is not a warning: it says nothing about the student's
// situation, only about what the record and the packs can settle. The product decided this once
// already and applied it as a per-page override on /check (see DomainCard's `tone` prop), so the
// SAME finding rendered grey on the dashboard card and amber in the reasoning panel below it. It is
// fixed here instead, where every caller gets it, because the four-state vocabulary is only worth
// anything if one state cannot mean two things on one screen.
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
      return "warn";
    case "unable_to_verify":
      return "idle";
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
