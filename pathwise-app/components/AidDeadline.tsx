import { formatAidDate } from "@/lib/engines/aid-eligibility";
import type { AidDeadline as AidDeadlineModel } from "@/lib/engines/aid-eligibility";

// The earliest-of rule, made visible. Three candidate dates sit side by side; the one that actually
// binds is the only one styled as an answer. Per the microcopy rule, never a bare date — the margin
// rides along with it, and the consequence of missing it sits underneath.
export function AidDeadline({ deadline }: { deadline: AidDeadlineModel }) {
  const { binding, daysOfMargin, marginBand } = deadline;

  const marginLabel =
    daysOfMargin === undefined
      ? "No date on record"
      : daysOfMargin < 0
        ? `Passed ${Math.abs(daysOfMargin)} days ago`
        : `${daysOfMargin} days of margin`;

  return (
    <section className="dl">
      <div className="dl-head">
        <div>
          <div className="dl-k">The deadline that actually binds</div>
          <div className="dl-v">
            {binding?.date ? formatAidDate(binding.date) : "Not yet computable"}{" "}
            <span className="dl-which">
              {binding ? `— the ${binding.label.toLowerCase()}` : ""}
            </span>
          </div>
        </div>
        <span className={`badge ${marginBand}`}>{marginLabel}</span>
      </div>

      <ol className="dl-rows">
        {deadline.candidates.map((c) => (
          <li
            className={`dl-row${c.binding ? " binding" : ""}${c.date ? "" : " unknown"}`}
            key={c.id}
          >
            <span className="dl-date">{c.date ? formatAidDate(c.date) : "Not on record"}</span>
            <span className="dl-label">
              {c.label}
              {c.binding ? <span className="dl-flag">Binds</span> : null}
            </span>
            <span className="dl-note">{c.note}</span>
          </li>
        ))}
      </ol>

      <p className="dl-consequence">{deadline.consequenceOfMissing}</p>
      <div className="dl-foot">
        {deadline.rule} <span className="cite wrap">{deadline.cite}</span>
      </div>
    </section>
  );
}
