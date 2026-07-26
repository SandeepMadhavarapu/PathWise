import type { LevelLedger } from "@/lib/engines/cpt-ledger";
import { SegmentedProgress } from "./SegmentedProgress";

const TRACK_MAX_DAYS = 400; // visual scale; cliff at 365 sits near the right
const CLIFF_DAYS = 365;

export function LedgerBar({
  ledger,
  voice = "third",
}: {
  ledger: LevelLedger;
  voice?: "second" | "third";
}) {
  const second = voice === "second";
  const solidFull = ledger.fullTimeDays - ledger.overlapDays; // single-authorization full-time days
  const cliffPct = (CLIFF_DAYS / TRACK_MAX_DAYS) * 100;

  return (
    <div className="ledger gauge-card surface">
      <div className="gauge-head">
        <span className="gauge-title t-card-title">CPT ledger — {ledger.level}</span>
        <span className="t-meta">
          {ledger.fullTimeDays} full-time days · {ledger.daysToCliff} to the cliff
        </span>
      </div>

      <div className="gauge-track-wrap">
        <SegmentedProgress
          ariaLabel={`CPT ledger, ${ledger.level} level`}
          total={TRACK_MAX_DAYS}
          segments={[
            { key: "full", status: "active", value: solidFull },
            { key: "overlap", status: "warn", value: ledger.overlapDays },
            { key: "remaining", status: "idle", value: TRACK_MAX_DAYS - ledger.fullTimeDays },
          ]}
          legend={[
            { status: "active", label: "full-time CPT days", value: solidFull },
            { status: "warn", label: "days from overlap (24 hrs/wk → full-time)", value: ledger.overlapDays },
          ]}
        />
        <div className="gauge-marker" style={{ left: `${cliffPct}%` }}>
          <span className="lbl">365-day cliff</span>
        </div>
      </div>

      <div className="gauge-note">
        <strong>Why this matters:</strong> at {ledger.fullTimeDays} days {second ? "you are" : "she is"}{" "}
        <strong>{ledger.daysToCliff} days</strong> from 365 — cross it and {second ? "you lose" : "she loses"}{" "}
        OPT eligibility for this level entirely. The {ledger.overlapDays} overlap days are ones{" "}
        {second ? "you would never see yourself" : "she would never see herself"}, and{" "}
        {second ? "your" : "her"} bachelor&apos;s CPT is partitioned out because the cap resets by level.{" "}
        <span className="cite">8 CFR 214.2(f)(10)</span>
      </div>
    </div>
  );
}
