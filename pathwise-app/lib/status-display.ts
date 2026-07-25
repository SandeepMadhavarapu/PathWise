// status-display.ts — how an immigration status CODE is written for a human to read.
//
// Display only. The codes themselves ('F1', 'J1', 'M1') are what every rule, rulepack condition and
// gate set matches on, and nothing here touches them — this maps a code to the way the UI/UX bible
// requires it be printed (F-1 hyphenated, always), and passes anything unmapped straight through.

const DISPLAY: Record<string, string> = {
  F1: 'F-1',
  J1: 'J-1',
  M1: 'M-1',
};

/** 'F1' → 'F-1'. Any code without a display form is returned unchanged. */
export function formatStatusCode(status: string): string {
  return DISPLAY[status] ?? status;
}
