import type { Finding, FindingResult } from "@/lib/types";
import { statusFromFindingResult, type StatusKey } from "@/lib/tokens";
import { formatDecidingOffice } from "@/lib/format";
import { StatusGlyph } from "./StatusGlyph";
import { Capsule } from "./Capsule";
import { ReasoningTree, type ReasoningTreeNode } from "./ReasoningTree";

const RESULT_LABEL: Record<FindingResult, string> = {
  ineligible: "Ineligible",
  potential_risk: "Potential risk",
  review_recommended: "Review recommended",
  no_issue: "Clear",
  unable_to_verify: "Unable to verify",
};

const VOLATILITY_LABEL: Record<
  NonNullable<Finding["volatility"]>["status"],
  string
> = {
  stable: "stable",
  under_litigation: "under litigation",
  recently_changed: "recently changed",
};

export function FindingDetail({ finding }: { finding: Finding }) {
  const status: StatusKey = statusFromFindingResult(finding.result);

  const reasoningNodes: ReasoningTreeNode[] = finding.reasoning_steps.map((step, i) => ({
    id: `step-${i}`,
    status: "done",
    title: step.claim,
    tags: [
      ...step.from_events.map((id) => `event · ${id}`),
      ...step.from_evidence.map((id) => `doc · ${id}`),
    ],
  }));

  return (
    <article className="finding surface">
      <div className="finding-head">
        <div className="finding-headline-row">
          <StatusGlyph status={status} />
          <h1 className="finding-headline">{finding.headline}</h1>
        </div>
        <Capsule variant="tinted" status={status === "idle" ? undefined : status}>
          {RESULT_LABEL[finding.result]}
        </Capsule>
      </div>

      <div className="section-head">How PathWise reasoned</div>
      <ReasoningTree nodes={reasoningNodes} />

      <div className="section-head">The regulation itself</div>
      <section className="citation-block">
        <p className="citation-quote">&ldquo;{finding.rule_citation.text}&rdquo;</p>
        <div className="citation-meta">{finding.rule_citation.authority}</div>
        {finding.rule_citation.verified_on ? (
          <div className="citation-meta">
            Verified on {finding.rule_citation.verified_on}
          </div>
        ) : null}
        {finding.rule_citation.source_url ? (
          <div className="citation-meta">
            <a
              href={finding.rule_citation.source_url}
              target="_blank"
              rel="noreferrer"
            >
              Read the source →
            </a>
          </div>
        ) : null}
      </section>

      {finding.unknowns.length > 0 ? (
        <section>
          <div className="section-head">Open questions</div>
          <ul className="unknowns">
            {finding.unknowns.map((u, i) => (
              <li className="unknown-item" key={i}>
                <div className="unknown-what">{u.what}</div>
                <div className="unknown-why">
                  <span className="unknown-label">Why it matters</span>{" "}
                  {u.why_it_matters}
                </div>
                <div className="unknown-how">
                  <span className="unknown-label">How to resolve</span>{" "}
                  {u.how_to_resolve}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="finding-foot">
        Decided by: {formatDecidingOffice(finding.deciding_office)} — PathWise
        advises, the office decides.
      </p>

      {finding.volatility ? (
        <div className="volatility">
          This rule is {VOLATILITY_LABEL[finding.volatility.status]}:{" "}
          {finding.volatility.note}
        </div>
      ) : null}
    </article>
  );
}
