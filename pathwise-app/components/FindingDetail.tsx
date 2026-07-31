import Link from "next/link";
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
  packId,
  packLabel,
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
  /**
   * The rule pack this finding was decided by, where the caller knows it.
   *
   * The citation block already quotes the regulation, names the authority and prints the date it
   * was verified — and then stops, at exactly the point a sceptic wants to keep going. Meanwhile
   * /coverage prints the actual file the engine read, in full, with its source URL and declared
   * capabilities. The two have never been connected, so "here is the rule" and "here is the file
   * that rule lives in" were two unrelated screens.
   *
   * Optional, and absent renders nothing: a jurisdiction with no registered pack has no file to
   * point at, and inventing one would be the exact failure the resolver exists to prevent.
   */
  packId?: string;
  /** How to NAME that pack to a reader — e.g. "Virginia residency rules". Never its file id. */
  packLabel?: string;
}) {
  const status: StatusKey = statusFromFindingResult(finding.result);

  const reasoningNodes: ReasoningTreeNode[] = finding.reasoning_steps.map((step, i) => {
    const sources = [
      ...step.from_events.map((id) => describeEvent(id, events)),
      ...step.from_evidence.map((id) => describeEvidence(id)),
    ];
    return {
      id: `step-${i}`,
      // Kept for the type; the ordinal below is what renders. See ReasoningTree.
      status: "done",
      ordinal: i + 1,
      title: step.claim,
      tags: sources,
      /**
       * The first source, shown ON the row rather than behind the disclosure.
       *
       * Measured against the real findings before this was written: of the two steps in the
       * Virginia gate finding, zero cite anything — the gate fires on a Student field, not on an
       * event — while Marcus's full determination cites events on three of its nine steps. So the
       * useful distinction is not "how many sources", it is "is this step derived from the record
       * at all", and with every source collapsed behind an identical chevron that distinction was
       * invisible on both screens.
       *
       * One source inline answers it at a glance; the rest stay one click away, which is where a
       * run of internal keys belongs. A step with no source shows nothing — the absence is the
       * honest signal, and filling it would be inventing provenance.
       */
      lead: sources[0],
      leadMore: sources.length > 1 ? sources.length - 1 : undefined,
      // Expanded by default would put a row of internal keys between the reader and the next
      // sentence of the argument.
      defaultOpen: false,
    };
  });

  return (
    <article className="finding surface">
      <div className="finding-head">
        <div className="finding-headline-row">
          <StatusGlyph status={status} />
          <h2 className="finding-headline">{finding.headline}</h2>
        </div>
        {/* Passed straight through, including `idle`. This used to strip the idle case out, which
            handed the capsule its `active` fallback and printed "Unable to verify" in the amber
            reserved for a limit being approached — beside a glyph already drawing it as unknown. */}
        <Capsule variant="tinted" status={status}>
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
        {/* Verdict → regulation → the file the engine actually read. A hash rather than a query
            string on purpose: it needs no Next.js search-param API, so /coverage stays statically
            prerendered, and the tab button already carries this exact id — so even with JavaScript
            off the browser scrolls the reader to the right pack. */}
        {packId ? (
          <div className="citation-meta">
            {/* Named for the reader, keyed for the link. The label used to print the file id
                (`va-aid.json`) in the sentence itself; the id now lives only in the href, where it
                belongs, and the visible text says which rules are being opened. */}
            <Link className="citation-pack" href={`/coverage#rp-tab-${packId}`}>
              Open the {packLabel ?? "rule pack"} this finding was decided by →
            </Link>
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
