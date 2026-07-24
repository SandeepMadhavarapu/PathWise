import type { LevelLedger } from "@/lib/engines/cpt-ledger";

const TRACK_MAX_DAYS = 400; // visual scale; cliff at 365 sits near the right
const CLIFF_DAYS = 365;

export function LedgerBar({ ledger }: { ledger: LevelLedger }) {
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

      <div className="track">
        <div className="fill">
          <div className="seg full" style={{ width: `${fullPct}%` }} />
          <div className="seg overlap" style={{ width: `${overlapPct}%` }} />
        </div>
        <div className="cliff" style={{ left: `${cliffPct}%` }}>
          <span className="lbl">365-day cliff</span>
        </div>
      </div>

      <div className="legend">
        <span>
          <span className="sw full" /> {solidFull} full-time CPT days
        </span>
        <span>
          <span className="sw overlap" /> {ledger.overlapDays} days from two part-time internships that
          overlapped (24 hrs/wk → full-time)
        </span>
      </div>

      <div className="note">
        <strong>Why this matters:</strong> at {ledger.fullTimeDays} days she is{" "}
        <strong>{ledger.daysToCliff} days</strong> from 365 — cross it and she loses OPT eligibility for
        this level entirely. The {ledger.overlapDays} overlap days are ones she would never see herself,
        and her bachelor&apos;s CPT is partitioned out because the cap resets by level.{" "}
        <span className="cite">8 CFR 214.2(f)(10)</span>
      </div>
    </div>
  );
}
