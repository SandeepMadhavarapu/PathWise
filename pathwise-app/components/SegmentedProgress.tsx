import type { StatusKey } from "@/lib/tokens";

export interface ProgressSegment {
  status: StatusKey;
  value: number;
  key?: string;
}

export interface ProgressLegendItem {
  status: StatusKey;
  label: string;
  value: number;
}

/**
 * 8px tall, full width, stacked done/active/warn/idle segments.
 *
 * ---- why this is no longer a client component ----
 *
 * It used to render every segment at `width: 0%` and set the real widths in an effect, after a
 * `requestAnimationFrame`, so JavaScript was what made the bars have a size at all. With JS
 * disabled or slow to hydrate, the CPT ledger, the OPT budget and the unemployment clock all
 * rendered as empty tracks — which is to say the product's three most load-bearing numbers were
 * invisible, on the screens they exist to carry. "342 of 365 days" is the argument; an empty grey
 * rail is not.
 *
 * It is exactly the failure the landing hero was deliberately built to avoid: nothing is hidden by
 * a rule that JS must undo. The same technique applies here — the width is rendered SERVER-SIDE and
 * correct, and a CSS animation grows it from zero. So the bar is right in the HTML, the motion is
 * decoration on top of a correct state, and under `prefers-reduced-motion` the global reset drops
 * the animation and leaves the bar at its true width instantly.
 *
 * Dropping "use client" also takes three components off the hydration path.
 */
export function SegmentedProgress({
  segments,
  total,
  legend,
  ariaLabel,
}: {
  segments: ProgressSegment[];
  total?: number;
  legend?: ProgressLegendItem[];
  ariaLabel?: string;
}) {
  const sum = total ?? segments.reduce((s, seg) => s + seg.value, 0);

  return (
    <div className="segprog">
      <div className="segprog-track" role="img" aria-label={ariaLabel}>
        {segments.map((seg, i) => (
          <div
            key={seg.key ?? i}
            className={`segprog-seg ${seg.status}`}
            style={{
              // The real width, in the server-rendered HTML. `--seg-w` is what the grow animation
              // interpolates TO, so the declared width and the animation target cannot disagree.
              width: sum > 0 ? `${(seg.value / sum) * 100}%` : "0%",
              ["--seg-w" as string]: sum > 0 ? `${(seg.value / sum) * 100}%` : "0%",
              animationDelay: `${i * 60}ms`,
            }}
          />
        ))}
      </div>
      {legend && legend.length > 0 ? (
        <div className="segprog-legend">
          {legend.map((item, i) => (
            <span className="segprog-legend-item" key={i}>
              <span className={`segprog-dot ${item.status}`} />
              {item.value} {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
