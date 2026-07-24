import {
  computeOptBudget,
  OPT_BUDGET_RULES as R,
  type OptBudgetInput,
  type OptUsageLine,
} from "@/lib/engines/opt-budget";

function fmtMonths(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function plural(n: number, word: string) {
  return `${fmtMonths(n)} ${n === 1 ? word : word + "s"}`;
}

function formatRange(start: string, end: string) {
  const f = (iso: string) =>
    new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${f(start)} – ${f(end)}`;
}

function lineLabel(l: OptUsageLine) {
  const intensity = l.intensity === "part_time" ? "Part-time" : "Full-time";
  const phase = l.phase === "pre_completion" ? "pre-completion" : "post-completion";
  return `${intensity} ${phase} OPT`;
}

export function OptBudget({
  input,
  voice = "third",
}: {
  input: OptBudgetInput;
  voice?: "second" | "third";
}) {
  const budget = computeOptBudget(input);
  const level = budget.forLevel(input.level);
  if (!level) return null;

  const second = voice === "second";
  const subject = second ? "you" : "she";
  const possessive = second ? "your" : "her";

  const usedPct = Math.min(100, (level.monthsUsed / level.budgetMonths) * 100);
  const amberPct = ((level.budgetMonths - 2) / level.budgetMonths) * 100; // where the amber zone starts

  // The half-rate line is the insight: what the part-time blocks were authorized for vs. what they
  // actually cost. Computed from the engine's lines, never asserted.
  const halfRate = level.lines.filter((l) => l.rate === 0.5);
  const halfAuthorized = halfRate.reduce((s, l) => s + l.authorizedMonths, 0);
  const halfCharged = halfRate.reduce((s, l) => s + l.chargedMonths, 0);

  return (
    <div className="optbudget">
      <div className="head">
        <span className="title">
          OPT budget — {level.level} · {fmtMonths(level.monthsUsed)} of {level.budgetMonths} months used
        </span>
        <span className={`sub ${level.band}`}>
          {level.overByMonths > 0
            ? `${plural(level.overByMonths, "month")} over the cap`
            : `${plural(level.monthsRemaining, "month")} remaining`}
        </span>
      </div>

      <div className="track-wrap">
        <div className="track">
          <div className="zone green" style={{ width: `${amberPct}%` }} />
          <div className="zone amber" style={{ left: `${amberPct}%`, right: 0 }} />
          <div className={`fill ${level.band}`} style={{ width: `${usedPct}%` }} />
        </div>
        {/* Outside the track: the track clips its fill, and would clip this label with it. */}
        <div className="cap-mark">
          <span className="lbl">{level.budgetMonths}-month cap</span>
        </div>
      </div>

      <ul className="opt-lines">
        {level.lines.map((l, i) => (
          <li key={l.id ?? i} className="opt-line">
            <span className="ol-what">
              {lineLabel(l)}
              {l.employer ? ` · ${l.employer}` : ""}
            </span>
            <span className="ol-when">{formatRange(l.start, l.end)}</span>
            <span className="ol-cost">
              {plural(l.authorizedMonths, "month")} authorized
              {l.rate === 0.5 ? " × ½" : ""} → <strong>{fmtMonths(l.chargedMonths)}</strong> charged
            </span>
          </li>
        ))}
        {level.lines.length === 0 ? (
          <li className="opt-line">
            <span className="ol-what">No OPT authorized at this level yet</span>
            <span className="ol-cost">
              full <strong>{level.budgetMonths}</strong> months available
            </span>
          </li>
        ) : null}
      </ul>

      <div className="note">
        {halfRate.length > 0 ? (
          <>
            <strong>Part-time pre-completion OPT is deducted at half rate</strong> —{" "}
            {plural(halfAuthorized, "authorized month")} cost {possessive} budget only{" "}
            {plural(halfCharged, "month")} — and usage runs on the{" "}
            <strong>authorized period, not hours actually worked</strong>: overtime spends no extra
            budget, and an idle week refunds none. That is why {possessive} post-completion grant is{" "}
            {plural(level.budgetMonths - halfCharged, "month")}, not {level.budgetMonths}.
          </>
        ) : (
          <>
            <strong>Part-time pre-completion OPT is deducted at half rate</strong> (part-time being{" "}
            {R.partTimeThresholdHours} hrs/week or fewer), and usage runs on the{" "}
            <strong>authorized period, not hours actually worked</strong> — overtime spends no extra
            budget, and an idle week refunds none.
          </>
        )}
      </div>

      <div className={`consequence ${level.band}`}>
        {level.monthsRemaining <= 0 ? (
          <>
            Every one of the {level.budgetMonths} months at this level is committed — {subject}{" "}
            {second ? "have" : "has"} no OPT left to fall back on here. The budget resets only at the
            next education level.
          </>
        ) : (
          <>
            {plural(level.monthsRemaining, "month")} of the {level.budgetMonths}-month budget{" "}
            {level.monthsRemaining === 1 ? "remains" : "remain"} at this level. The budget is per
            education level — it resets at the next degree, and never carries backward.
          </>
        )}{" "}
        <span className="cite">{R.cite} · USCIS Policy Manual</span>
      </div>
    </div>
  );
}
