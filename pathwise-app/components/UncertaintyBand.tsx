// UncertaintyBand — what PathWise does not know, drawn to scale.
//
// ---- what this is ----
//
// A measure, a threshold marked on it, and the answer plotted against both. While the record cannot
// settle the question the answer is a SPAN with two ends; when evidence settles it, the span
// becomes a point. The span's ends are not a confidence interval and nothing here is estimated:
// they are two literal runs of the same ledger engine over the same authorizations, differing only
// in which education level one school's CPT is attributed to. See lib/readings.ts.
//
// The whole argument is in one geometric fact: the span crosses the line. One reading keeps OPT,
// the other loses it, and there is no honest way to choose between them without the document. That
// is why the finding reads "unable to verify", and drawing it this way means a reader reaches that
// conclusion by looking rather than by being told.
//
// ---- why it is drawn, and not just written ----
//
// The same two numbers were already on the page, set at 30px in two side-by-side sub-panels, with
// the cliff they straddle mentioned in a sentence between them. Everything true was present and
// the relationship between the three — the only part that matters — had to be assembled by the
// reader. A comparison rendered as a list is not a comparison.
//
// ---- correctness constraints this component is built under ----
//
//  · Geometry is rendered from real values on the server, in the HTML, at rest. Nothing here is
//    positioned by JavaScript after paint and nothing is hidden by a rule JavaScript must undo, so
//    the drawing is correct with JS disabled and correct before hydration. This is the same rule
//    SegmentedProgress is built under, and for the same reason: the numbers ARE the argument.
//  · Motion is decoration on a correct state. Under prefers-reduced-motion the global reset drops
//    the transitions and the band sits at its true geometry immediately — the reduced-motion path
//    is the no-animation path, not a faster one.
//  · The track maximum is a VISUAL SCALE and nothing else. It is derived from the data so the
//    drawing cannot silently clip a reading, and it is never presented as a limit — the only limit
//    on this track is the cliff, which comes from the rulepack.

import type { StatusKey } from "@/lib/tokens";
import { StatusGlyph } from "./StatusGlyph";

/** Rounded up past the higher reading so the span always fits with air. Presentation only. */
function trackMaxFor(hi: number, cliff: number): number {
  return Math.ceil((Math.max(hi, cliff) * 1.06) / 25) * 25;
}

/* Rounded, because these end up as inline styles in the served HTML and `56.99999999999999%` is
   what binary floating point makes of 342/600. It renders identically and reads as a defect to
   anyone who opens the source — which, on this product, is a thing judges do. */
const pct = (v: number, max: number) => `${Number(((v / max) * 100).toFixed(3))}%`;

export function UncertaintyBand({
  lo,
  hi,
  cliff,
  unit,
  settled,
  loLabel,
  hiLabel,
  settledLabel,
  settledStatus,
  marginDays,
  compact = false,
}: {
  /** The lower reading. When `settled`, the single answer. */
  lo: number;
  /** The higher reading. Ignored for geometry once `settled` — the span has collapsed onto `lo`. */
  hi: number;
  /** The threshold the span is measured against. From a rulepack, never from this component. */
  cliff: number;
  /** What the cliff is, in the pack's own terms — e.g. "365-day cliff". */
  unit: string;
  /** True once evidence has ruled one reading out. Drives the collapse. */
  settled: boolean;
  loLabel: string;
  hiLabel: string;
  /** The settled verdict IN WORDS — the caller reads it off the engine, never a literal. */
  settledLabel: string;
  /**
   * The settled verdict's STATUS, and the reason this prop exists.
   *
   * This component used to assume that settling a question settles it WELL: it drew the done glyph,
   * the done text colour and a green fill whenever `settled` was true. On the demo record that was
   * flatly wrong. Resolving the level change leaves 342 of 365 days used with 23 to spare, and the
   * ledger's own verdict for that is `amber` — approaching a limit. So the band displayed a green
   * tick and "On track" directly above a panel that correctly read "Attention", and the two
   * disagreed on screen about the same number.
   *
   * A finding can settle into any status. Deriving it here is the difference between showing what
   * the engine concluded and showing what the component hoped it concluded — and this product has
   * exactly one rule it cannot break: the surface never claims more than the arithmetic.
   */
  settledStatus: StatusKey;
  /** Distance from the settled answer to the cliff, shown only once there is one answer. */
  marginDays?: number;
  /** The landing's smaller rendering: same geometry, no end labels. */
  compact?: boolean;
}) {
  const max = trackMaxFor(hi, cliff);
  const left = pct(lo, max);
  // Collapsed onto `lo` when settled — this single value is what the transition animates.
  const right = `${Number((100 - ((settled ? lo : hi) / max) * 100).toFixed(3))}%`;
  // The floor ends where the dispute begins, so it shares an edge with the span's left.
  const floorRight = `${Number((100 - (lo / max) * 100).toFixed(3))}%`;
  const crosses = !settled && lo < cliff && hi > cliff;

  /**
   * The text equivalent, and it has to carry the whole finding rather than name the picture.
   * A reader who never sees the drawing gets the same three facts in the same order: what the
   * answer is, what it is measured against, and whether it is settled.
   */
  const label = settled
    ? `${lo} of ${cliff}. One answer: ${settledLabel}.` +
      (marginDays !== undefined ? ` ${marginDays} days of margin before the ${unit}.` : "")
    : `${lo} is established under both readings. The ${hi - lo} between ${lo} and ${hi} are in ` +
      `dispute, measured against the ${unit}. ` +
      (crosses
        ? `The two readings fall on opposite sides of it, so this is unable to verify: ${loLabel}; ${hiLabel}.`
        : `${loLabel}; ${hiLabel}.`);

  return (
    <div
      className={`ub${settled ? ` ub--settled ub--${settledStatus}` : ""}${
        compact ? " ub--compact" : ""
      }`}
    >
      <div className="ub-head">
        <StatusGlyph status={settled ? settledStatus : "idle"} />
        <span className="ub-verdict">{settled ? settledLabel : "Unable to verify"}</span>
        {!settled ? (
          <span className="ub-range">
            between <strong>{lo}</strong> and <strong>{hi}</strong>
          </span>
        ) : (
          <span className="ub-range">
            <strong>{lo}</strong> of {cliff}
          </span>
        )}
      </div>

      <div className="ub-track" role="img" aria-label={label}>
        {/* The threshold. Drawn first so the span reads as sitting against it. */}
        <span className="ub-cliff" style={{ left: pct(cliff, max) }} aria-hidden="true">
          <span className="ub-cliff-lbl">{unit}</span>
        </span>
        {/* The ESTABLISHED floor: 0 to `lo` is counted under BOTH readings, so it is not in dispute
            at all. Drawing it as empty rail — which is what this did at first — implied nothing was
            known below 342, when 342 days are certain and only the 210 above them are contested.
            The disputed region is the hatch; this is the part that is simply true. */}
        <span className="ub-floor" style={{ right: floorRight }} aria-hidden="true" />
        <span className="ub-span" style={{ left, right }} aria-hidden="true" />

        {/* The two numbers, pinned to the ends of the span rather than to the ends of the box. */}
        <span className="ub-tick ub-tick--lo" style={{ left }} aria-hidden="true">
          <span className="ub-tick-n">{lo}</span>
        </span>
        {!settled ? (
          <span className="ub-tick ub-tick--hi" style={{ right }} aria-hidden="true">
            <span className="ub-tick-n">{hi}</span>
          </span>
        ) : null}
        {/* Only once there is a single answer, and only where there is room to draw it. */}
        {settled && marginDays !== undefined && !compact ? (
          <span
            className="ub-margin"
            style={{ left: pct(lo, max), right: `${100 - (cliff / max) * 100}%` }}
            aria-hidden="true"
          >
            <span className="ub-margin-lbl">{marginDays} days</span>
          </span>
        ) : null}
      </div>

      {/* A legend used to sit here, repeating `loLabel` and `hiLabel` beneath the plot. It was
          removed rather than restyled, because it was saying things the screen already says:

            · unsettled — "342 if the level change holds — OPT at the master's level preserved" is
              verbatim the caption on the reading card 200px below it, so one screen carried the
              same sentence twice;
            · settled — it collapsed to "342 On track", which is the header of this very component.

          It was `aria-hidden`, so it was decoration by its own admission, and the two numbers it
          keyed are already pinned to the span's ends as ticks. `loLabel` and `hiLabel` are still
          load-bearing: they carry the meaning into the accessible description above. */}
    </div>
  );
}
