import {
  AMBER_MARGIN_MONTHS,
  computeOptBudget,
  OPT_BUDGET_RULES as R,
  PART_TIME_HALF_RATE,
  type OptBudgetInput,
  type OptUsageLine,
} from "@/lib/engines/opt-budget";
import { levelLabel } from "@/lib/engines/cpt-ledger";
import { statusFromBand } from "@/lib/tokens";
import { SegmentedProgress, type ProgressLegendItem } from "./SegmentedProgress";

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
  const status = statusFromBand(level.band);

  const trackTotal = Math.max(level.budgetMonths, level.monthsUsed);
  const capPct = (level.budgetMonths / trackTotal) * 100;

  // The tail of the track that the engine's own band margin calls amber, drawn as a segment rather
  // than asserted: the zone and the colour of the fill can never disagree about which month the
  // budget starts running short, because both are read off AMBER_MARGIN_MONTHS.
  const remaining = Math.max(0, level.monthsRemaining);
  const amberZone = Math.min(remaining, AMBER_MARGIN_MONTHS);
  const safeRemaining = remaining - amberZone;

  const legend: ProgressLegendItem[] = [
    { status, label: "months used", value: level.monthsUsed },
  ];
  if (level.overByMonths > 0) {
    legend.push({ status: "blocked", label: "months over the cap", value: level.overByMonths });
  } else if (amberZone > 0) {
    legend.push({
      status: "warn",
      label: "months where the budget bands amber",
      value: amberZone,
    });
  }

  // The half-rate line is the insight: what the part-time blocks were authorized for vs. what they
  // actually cost. Computed from the engine's lines, never asserted.
  const halfRate = level.lines.filter((l) => l.rate === PART_TIME_HALF_RATE);
  const halfAuthorized = halfRate.reduce((s, l) => s + l.authorizedMonths, 0);
  const halfCharged = halfRate.reduce((s, l) => s + l.chargedMonths, 0);

  return (
    <div className="optbudget gauge-card surface">
      <div className="gauge-head">
        <span className="gauge-title t-card-title">
          OPT budget — {levelLabel(level.level)} · {fmtMonths(level.monthsUsed)} of{" "}
          {level.budgetMonths} months used
        </span>
        <span className={`gauge-sub ${status}`}>
          {level.overByMonths > 0
            ? `${plural(level.overByMonths, "month")} over the cap`
            : `${plural(level.monthsRemaining, "month")} remaining`}
        </span>
      </div>

      <div className="gauge-track-wrap">
        <SegmentedProgress
          ariaLabel={`OPT budget, ${level.level} level`}
          total={trackTotal}
          segments={[
            { key: "used", status, value: Math.min(level.monthsUsed, level.budgetMonths) },
            { key: "over", status: "blocked", value: level.overByMonths },
            { key: "remaining", status: "idle", value: safeRemaining },
            { key: "amber", status: "warn", value: amberZone },
          ]}
          legend={legend}
        />
        <div className="gauge-marker" style={{ left: `${capPct}%` }}>
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
              {l.rate === PART_TIME_HALF_RATE ? " × ½" : ""} →{" "}
              <strong>{fmtMonths(l.chargedMonths)}</strong> charged
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

      <div className="gauge-note">
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

      <div className={`gauge-consequence ${status}`}>
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
        {/* Plain `.cite`, deliberately. This is the longest citation the app renders (278px), and it
            was given `wrap` to stop it pushing /student sideways at 320px — but `wrap` applies at
            EVERY width, so on a desktop it broke the reference after "8", leaving "CFR 214.2(f)(11)"
            on the next line. A citation split across lines mid-reference is worse than a long one.
            The narrow case is handled where it belongs instead: `.cite` wraps below 400px globally,
            which is the only place nowrap is the wrong answer. */}
        <span className="cite">{R.cite} · USCIS Policy Manual</span>
      </div>
    </div>
  );
}
