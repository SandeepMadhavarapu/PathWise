"use client";

import { useEffect, useState } from "react";
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

// 8px tall, full width, stacked done/active/warn/idle segments. Widths animate from 0 on
// first mount only (500ms, staggered 60ms/segment) and never replay on re-render.
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="segprog">
      <div className="segprog-track" role="img" aria-label={ariaLabel}>
        {segments.map((seg, i) => (
          <div
            key={seg.key ?? i}
            className={`segprog-seg ${seg.status}`}
            style={{
              width: mounted && sum > 0 ? `${(seg.value / sum) * 100}%` : "0%",
              transitionDelay: `${i * 60}ms`,
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
