"use client";

import { useState } from "react";
import type { StatusKey } from "@/lib/tokens";
import { StatusGlyph } from "./StatusGlyph";
import { Capsule } from "./Capsule";
import { MicroLabel } from "./MicroLabel";
import { ChevronIcon } from "./icons";

export interface ReasoningTreeNode {
  id: string;
  status: StatusKey;
  title: string;
  tags?: string[];
  /** The first source, rendered on the row itself — see FindingDetail for why one and not all. */
  lead?: string;
  /** How many further sources are behind the disclosure, when there are any. */
  leadMore?: number;
  /**
   * The step's position in the argument, shown INSTEAD of a status glyph.
   *
   * A reasoning step is not a verdict. Every step used to render the `done` tick — green, the
   * colour this product spends eleven screens teaching means "on track" — so on "Why residency is
   * blocked" a green check sat beside "Holders of student or temporary visas do not have the
   * capacity to establish domicile in Virginia". The glyph meant "this step is established" and the
   * reader had been taught it means "this is fine", on the one page where it is not.
   *
   * An ordinal cannot be misread as a verdict, and it adds the thing a status never carried: the
   * chain is a sequence, and its order is the argument.
   */
  ordinal?: number;
  micro?: (string | undefined | false | null)[];
  children?: ReasoningTreeNode[];
  defaultOpen?: boolean;
}

function Node({ node }: { node: ReasoningTreeNode }) {
  const sourceCount = node.tags?.length ?? 0;
  const hasDetail = !!(sourceCount || node.children?.length);
  const [open, setOpen] = useState(node.defaultOpen ?? true);

  // "Expand"/"Collapse" told a screen-reader user that something opened, but never what. What is
  // behind this disclosure is always the same thing: the events and documents the claim is derived
  // from, which is the reason to open it.
  const toggleLabel = sourceCount
    ? `${open ? "Hide" : "Show"} the ${sourceCount} ${
        sourceCount === 1 ? "source" : "sources"
      } this step rests on`
    : open
      ? "Hide detail"
      : "Show detail";

  return (
    <li className={`rtree-node${open ? " open" : ""}`}>
      <div className="rtree-row hover-row">
        {hasDetail ? (
          <button
            type="button"
            className="rtree-toggle"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={toggleLabel}
          >
            <ChevronIcon className="icon-14" />
          </button>
        ) : (
          <span className="rtree-toggle-spacer" aria-hidden="true" />
        )}
        {node.ordinal !== undefined ? (
          <span className="rtree-ord" aria-hidden="true">
            {node.ordinal}
          </span>
        ) : (
          <StatusGlyph status={node.status} />
        )}
        <div className="rtree-body">
          <div className="rtree-body-top">
            <span className="t-row-title">{node.title}</span>
            {sourceCount ? (
              <button
                type="button"
                className="rtree-sources"
                onClick={() => setOpen((o) => !o)}
                aria-hidden="true"
                tabIndex={-1}
              >
                {open ? "hide" : `${sourceCount} ${sourceCount === 1 ? "source" : "sources"}`}
              </button>
            ) : null}
            <MicroLabel parts={node.micro ?? []} />
          </div>
          {/* The derivation, on the row. Marked "from" so it reads as provenance rather than as a
              second claim, and set as data. Silent when the step cites nothing. */}
          {node.lead ? (
            <p className="rtree-lead">
              <span className="rtree-lead-k">from</span>
              {node.lead}
              {node.leadMore ? (
                <span className="rtree-lead-more">
                  {" "}
                  +{node.leadMore} more
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      {hasDetail ? (
        <div className="rtree-children">
          <div className="rtree-children-inner">
            {node.tags && node.tags.length > 0 ? (
              <div className="rtree-tags">
                {node.tags.map((tag, i) => (
                  <Capsule key={i}>{tag}</Capsule>
                ))}
              </div>
            ) : null}
            {node.children && node.children.length > 0 ? (
              <ul className="rtree">
                {node.children.map((child) => (
                  <Node key={child.id} node={child} />
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

// The finding-detail hierarchy: indented nodes with elbow connectors, each one a
// StatusGlyph + title + capsules + right-aligned micro-label. Expand/collapse per node.
export function ReasoningTree({ nodes }: { nodes: ReasoningTreeNode[] }) {
  return (
    <ul className="rtree">
      {nodes.map((node) => (
        <Node key={node.id} node={node} />
      ))}
    </ul>
  );
}
