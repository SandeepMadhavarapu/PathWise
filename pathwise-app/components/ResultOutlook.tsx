import Link from "next/link";

/**
 * Where a /check result leaves the reader — assembled entirely from what the findings already say.
 *
 * ---- why this component exists ----
 *
 * /check answered and then stopped. It rendered a verdict per domain and offered nothing to do
 * with it: no summary of who to approach, no statement of what was still unsettled, no route
 * onward. Every one of those things was already computed and thrown away. The findings carry
 * `unknowns`, each with a `how_to_resolve` written by the engine that raised it, and the screen
 * rendered `headline` and `rule_citation` only. For a fully-modelled jurisdiction that meant six
 * open questions and an under-litigation warning existed in the object and never reached the page.
 *
 * ---- why it takes strings and nothing else ----
 *
 * The risk in a section called "what happens next" is that it starts giving advice. This component
 * cannot: it imports no pack, no engine and no jurisdiction data, so there is no source from which
 * it could compose a legal claim even by accident. Everything it renders arrives as a prop, and
 * every prop is either a verbatim field off a Finding or a value the page already computed. The
 * only sentences authored here are structural labels — headings, a count, a disclosure summary —
 * and none of them says anything about anyone's law.
 *
 * That constraint is the design, not a comment asking a future reader to be careful.
 *
 * ---- why it is not called "next steps" ----
 *
 * Because for a blocked reader the engine's own resolution is "Nothing needs to be produced for
 * this finding." Framing that as a step turns a correct non-action into an implied action, and
 * sends someone to chase a document that cannot change their answer. "Where this leaves you"
 * accommodates both a thing to do and nothing to do, and asserts neither.
 */

export interface OutlookOffice {
  /** The domain, as the cards above name it. */
  domain: string;
  /** The body that decides it, already resolved to the most specific name the pack allows. */
  body: string;
  cite?: string;
  sourceUrl?: string;
  sourceLabel?: string;
}

/** A Finding's `unknowns` entry, passed through untouched. */
export interface OutlookQuestion {
  what: string;
  why_it_matters: string;
  how_to_resolve: string;
}

/** A Finding's `volatility`, where it is something other than stable. */
export interface OutlookVolatility {
  label: string;
  note: string;
}

export function ResultOutlook({
  offices,
  openQuestions,
  volatility = [],
  notChecked = [],
  exampleHref,
}: {
  offices: OutlookOffice[];
  openQuestions: OutlookQuestion[];
  volatility?: OutlookVolatility[];
  notChecked?: string[];
  exampleHref?: string;
}) {
  const n = openQuestions.length;

  return (
    <section className="outlook" aria-labelledby="outlook-head">
      <h2 className="outlook-head" id="outlook-head">
        Where this leaves you
      </h2>

      {offices.length > 0 ? (
        <div className="outlook-block">
          <h3 className="section-head">The offices that decide this</h3>
          <ul className="outlook-offices">
            {offices.map((o) => (
              <li className="oo" key={o.domain}>
                <span className="oo-domain">{o.domain}</span>
                <span className="oo-body">{o.body}</span>
                {o.cite ? <span className="cite">{o.cite}</span> : null}
                {o.sourceUrl ? (
                  <a
                    className="oo-src"
                    href={o.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {o.sourceLabel ?? "Read the source"} →
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          {/* The product's standing line, unchanged from the one it closes every other screen
              with. It is the whole point of naming the offices here. */}
          <p className="outlook-foot">PathWise advises; these offices decide.</p>
        </div>
      ) : null}

      {volatility.map((v, i) => (
        <p className="volatility" key={i}>
          <span className="volatility-k">{v.label}</span>
          <span className="volatility-sep" aria-hidden="true">
            ·
          </span>
          <span className="volatility-v">{v.note}</span>
        </p>
      ))}

      {n > 0 ? (
        <div className="outlook-block">
          <h3 className="section-head">
            Still open — {n} {n === 1 ? "question" : "questions"} this reading could not settle
          </h3>
          <ul className="outlook-questions">
            {openQuestions.map((q, i) => (
              <li className="oq" key={i}>
                <p className="oq-what">{q.what}</p>
                {/* The arrow is the action slot, and it is decoration for a screen reader — the
                    sentence after it stands on its own. */}
                <p className="oq-do">
                  <span className="oq-arrow" aria-hidden="true">
                    →
                  </span>
                  {q.how_to_resolve}
                </p>
                {/* Collapsed, not cut. `why_it_matters` is the longest field on an unknown and
                    inlining several of them buries the resolutions above; it stays one click away
                    and complete, because traceability is the thing this product does not trade. */}
                <details className="oq-why">
                  <summary>Why this matters</summary>
                  <p>{q.why_it_matters}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {notChecked.length > 0 ? (
        <div className="outlook-block">
          <h3 className="section-head">What PathWise did not check here</h3>
          <ul className="outlook-gaps">
            {notChecked.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {exampleHref ? (
        <Link className="outlook-more" href={exampleHref}>
          See this reasoning worked through in full →
        </Link>
      ) : null}
    </section>
  );
}
