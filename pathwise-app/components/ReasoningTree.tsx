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
  micro?: (string | undefined | false | null)[];
  children?: ReasoningTreeNode[];
  defaultOpen?: boolean;
}

function Node({ node }: { node: ReasoningTreeNode }) {
  const hasDetail = !!(node.tags?.length || node.children?.length);
  const [open, setOpen] = useState(node.defaultOpen ?? true);

  return (
    <li className={`rtree-node${open ? " open" : ""}`}>
      <div className="rtree-row hover-row">
        {hasDetail ? (
          <button
            type="button"
            className="rtree-toggle"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Collapse" : "Expand"}
          >
            <ChevronIcon className="icon-14" />
          </button>
        ) : (
          <span className="rtree-toggle-spacer" aria-hidden="true" />
        )}
        <StatusGlyph status={node.status} />
        <div className="rtree-body">
          <div className="rtree-body-top">
            <span className="t-row-title">{node.title}</span>
            <MicroLabel parts={node.micro ?? []} />
          </div>
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
