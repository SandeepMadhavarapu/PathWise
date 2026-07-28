import type { ReactNode } from "react";
import type { Event, Finding, FindingResult } from "@/lib/types";
import { statusFromFindingResult, type StatusKey } from "@/lib/tokens";
import { formatDecidingBody } from "@/lib/format";
import type { Agency } from "@/lib/rulepacks/schema";
import { describeEvent, describeEvidence } from "@/lib/labels";
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

/**
 * Volatility is a property of a RULE, and a finding's pack may carry a note about a rule that is
 * not the one on screen. This panel used to open "This rule is {status}: …", which asserted that
 * the note described the finding above it — and on the domicile gate it flatly did not: the pack's
 * note was about the tuition-equity provision, which that pack does not even model.
 *
 * The note is self-describing (the aid engine names the provision it belongs to), so the fix is to
 * stop putting a claim in front of it. What sits here now is a neutral micro-label that says what
 * kind of information this is, and the note itself says what it is about.
 */
const VOLATILITY_LABEL = "What could still change";

const VOLATILITY_STATUS: Record<NonNullable<Finding["volatility"]>["status"], string> = {
  stable: "Stable",
  under_litigation: "Under litigation",
  recently_changed: "Recently changed",
};

export function FindingDetail({
  finding,
  analysis,
  events = [],
  agencies,
}: {
  finding: Finding;
  /**
   * The worked analysis behind the reasoning steps, where an engine has one to show — the tables,
   * weights and arithmetic the numbered claims above are read off. It sits inside the finding
   * rather than beside it, because it is the same answer at a lower altitude, not a second one.
   */
  analysis?: ReactNode;
  /**
   * The record the reasoning steps point into. A step cites events by id; with the events in hand
   * this component can say what each one IS instead of printing the key it is filed under.
   * Optional, and an unrecognised id degrades to a humanised form rather than disappearing —
   * dropping a source silently would be worse than naming it awkwardly.
   */
  events?: readonly Event[];
  /**
   * The deciding jurisdiction's agencies, where a pack names them. Used only to resolve the generic
   * `state_higher_ed_agency` office to the body that actually decides — a named role such as
   * "Domicile Officer" is never substituted. See formatDecidingBody.
   */
  agencies?: readonly Agency[];
}) {
  const status: StatusKey = statusFromFindingResult(finding.result);

  const reasoningNodes: ReasoningTreeNode[] = finding.reasoning_steps.map((step, i) => ({
    id: `step-${i}`,
    status: "done",
    title: step.claim,
    tags: [
      ...step.from_events.map((id) => describeEvent(id, events)),
      ...step.from_evidence.map((id) => describeEvidence(id)),
    ],
    // The sources sit behind a disclosure. They are the proof that a claim is derived rather than
    // written, and they should stay one click away — but expanded by default they put a row of
    // internal keys between the reader and the next sentence of the argument.
    defaultOpen: false,
  }));

  return (
    <article className="finding surface">
      <div className="finding-head">
        <div className="finding-headline-row">
          <StatusGlyph status={status} />
          <h2 className="finding-headline">{finding.headline}</h2>
        </div>
        <Capsule variant="tinted" status={status === "idle" ? undefined : status}>
          {RESULT_LABEL[finding.result]}
        </Capsule>
      </div>

      <div className="section-head">How PathWise reasoned</div>
      <ReasoningTree nodes={reasoningNodes} />

      {analysis}

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
        Decided by: {formatDecidingBody(finding.deciding_office, agencies, finding.domain === 'aid' ? 'aid' : 'residency')} — PathWise
        advises, the office decides.
      </p>

      {/* A stable rule needs no warning — the citation block above already carries the date it was
          verified on, which is the useful half of "stable". */}
      {finding.volatility && finding.volatility.status !== "stable" ? (
        <div className="volatility">
          <span className="volatility-k">
            {VOLATILITY_LABEL}
            <span className="volatility-sep" aria-hidden="true">
              ·
            </span>
            {VOLATILITY_STATUS[finding.volatility.status]}
          </span>
          <span className="volatility-v">{finding.volatility.note}</span>
        </div>
      ) : null}
    </article>
  );
}
