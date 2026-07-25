import type { DecidingOffice, Finding, FindingResult } from "@/lib/types";

type Band = "green" | "amber" | "red" | "gray";

const RESULT_BAND: Record<FindingResult, Band> = {
  ineligible: "red",
  potential_risk: "amber",
  review_recommended: "amber",
  no_issue: "green",
  unable_to_verify: "gray",
};

const RESULT_LABEL: Record<FindingResult, string> = {
  ineligible: "Ineligible",
  potential_risk: "Potential risk",
  review_recommended: "Review recommended",
  no_issue: "Clear",
  unable_to_verify: "Unable to verify",
};

// Display only — the DecidingOffice codes stay exactly as the engines emit them. The article
// carries its own "the", so each label reads inside the footer sentence.
const OFFICE_LABEL: Record<DecidingOffice, string> = {
  DSO: "your DSO",
  registrar: "the registrar",
  domicile_officer: "the domicile officer",
  financial_aid: "the financial aid office",
  USCIS: "USCIS",
  SEVP: "SEVP",
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
  const band = RESULT_BAND[finding.result];

  return (
    <article className="finding">
      <div className="finding-head">
        <h1 className="finding-headline">{finding.headline}</h1>
        <span className={`badge ${band}`}>{RESULT_LABEL[finding.result]}</span>
      </div>

      <div className="section-h">How PathWise reasoned</div>
      <ol className="reason-list">
        {finding.reasoning_steps.map((step, i) => (
          <li className="reason-step" key={i}>
            <span className="reason-num">{i + 1}</span>
            <div className="reason-body">
              <div className="reason-claim">{step.claim}</div>
              {step.from_events.length > 0 || step.from_evidence.length > 0 ? (
                <div className="reason-tags">
                  {step.from_events.map((id) => (
                    <span className="reason-tag" key={`e-${id}`}>
                      event · {id}
                    </span>
                  ))}
                  {step.from_evidence.map((id) => (
                    <span className="reason-tag" key={`d-${id}`}>
                      doc · {id}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="section-h">The regulation itself</div>
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
          <div className="section-h">Open questions</div>
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
        Decided by {OFFICE_LABEL[finding.deciding_office]} — PathWise advises,
        the office decides.
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
