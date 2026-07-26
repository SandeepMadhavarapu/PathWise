import {
  CLIFF_DAYS,
  FULL_TIME_HOURS_THRESHOLD,
  SECTION_CITE,
  type LevelLedger,
} from "@/lib/engines/cpt-ledger";

// Purely a visual scale (how much track to draw), not a regulatory number — safe to hardcode.
// The cliff itself comes from the rulepack via CLIFF_DAYS above.
const TRACK_MAX_DAYS = 400;

export function LedgerBar({
  ledger,
  voice = "third",
}: {
  ledger: LevelLedger;
  voice?: "second" | "third";
}) {
  const second = voice === "second";
  const solidFull = ledger.fullTimeDays - ledger.overlapDays; // single-authorization full-time days
  const fullPct = (solidFull / TRACK_MAX_DAYS) * 100;
  const overlapPct = (ledger.overlapDays / TRACK_MAX_DAYS) * 100;
  const cliffPct = (CLIFF_DAYS / TRACK_MAX_DAYS) * 100;

  return (
    <div className="ledger">
      <div className="head">
        <span className="title">CPT ledger — {ledger.level}</span>
        <span className="sub">
          {ledger.fullTimeDays} full-time days · {ledger.daysToCliff} to the cliff
        </span>
      </div>

      <div className="track-wrap">
        <div className="track">
          <div className="fill">
            <div className="seg full" style={{ width: `${fullPct}%` }} />
            <div className="seg overlap" style={{ width: `${overlapPct}%` }} />
          </div>
        </div>
        {/* Outside the track: the track clips its fill, and would clip this label with it. */}
        <div className="cliff" style={{ left: `${cliffPct}%` }}>
          <span className="lbl">{CLIFF_DAYS}-day cliff</span>
        </div>
      </div>

      <div className="legend">
        <span>
          <span className="sw full" /> {solidFull} full-time CPT days
        </span>
        <span>
          {/* The ledger carries days, not hours, so the only honest number here is the pack's own
              threshold — what a summed week has to exceed for the day to count as full-time. */}
          <span className="sw overlap" /> {ledger.overlapDays} days from two part-time internships that
          overlapped (over {FULL_TIME_HOURS_THRESHOLD} hrs/wk combined → full-time)
        </span>
      </div>

      <div className="note">
        <strong>Why this matters:</strong> at {ledger.fullTimeDays} days {second ? "you are" : "she is"}{" "}
        <strong>{ledger.daysToCliff} days</strong> from {CLIFF_DAYS} — cross it and {second ? "you lose" : "she loses"}{" "}
        OPT eligibility for this level entirely. The {ledger.overlapDays} overlap days are ones{" "}
        {second ? "you would never see yourself" : "she would never see herself"}, and{" "}
        {second ? "your" : "her"} bachelor&apos;s CPT is partitioned out because the cap resets by level.{" "}
        <span className="cite">{SECTION_CITE}</span>
      </div>
    </div>
  );
}
