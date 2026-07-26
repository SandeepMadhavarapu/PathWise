import {
  CLIFF_DAYS,
  FULL_TIME_HOURS_THRESHOLD,
  SECTION_CITE,
  levelLabel,
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
  // Which other level's days the partition is keeping out, in the record's own terms — empty string
  // when this record has no other level, so the sentence below never invents one.
  const partitioned = ledger.otherLevelsWithDays.map(levelLabel).join(" and ");
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
        {/* The count of overlapping authorizations is the ledger's own — on /check a student can
            enter three or more, and the demo student's two is only ever right for her. With no
            overlap days there is nothing to count, so the swatch is not drawn at all. */}
        {ledger.overlapDays > 0 ? (
          <span>
            {/* The ledger carries days, not hours, so the only honest number here is the pack's own
                threshold — what a summed week has to exceed for the day to count as full-time. */}
            <span className="sw overlap" /> {ledger.overlapDays} days from{" "}
            {ledger.overlapConcurrentAuths} part-time internship
            {ledger.overlapConcurrentAuths === 1 ? "" : "s"} that overlapped (over{" "}
            {FULL_TIME_HOURS_THRESHOLD} hrs/wk combined → full-time)
          </span>
        ) : null}
      </div>

      <div className="note">
        <strong>Why this matters:</strong> at {ledger.fullTimeDays} days {second ? "you are" : "she is"}{" "}
        <strong>{ledger.daysToCliff} days</strong> from {CLIFF_DAYS} — cross it and {second ? "you lose" : "she loses"}{" "}
        OPT eligibility for this level entirely.{" "}
        {ledger.overlapDays > 0 ? (
          <>
            The {ledger.overlapDays} overlap days are ones{" "}
            {second ? "you would never see yourself" : "she would never see herself"}
            {partitioned ? ", and " : ". "}
          </>
        ) : null}
        {/* Only claim a partition the record actually contains: on /check a student may have entered
            one level only, and there is then no other level's CPT being kept out of this count. */}
        {partitioned ? (
          <>
            {ledger.overlapDays > 0
              ? `${second ? "your" : "her"} ${partitioned} CPT is`
              : `${second ? "Your" : "Her"} ${partitioned} CPT is`}{" "}
            partitioned out because the cap resets by level.{" "}
          </>
        ) : (
          <>
            The cap is counted per education level, so nothing at another level is folded into this
            number.{" "}
          </>
        )}
        <span className="cite">{SECTION_CITE}</span>
      </div>
    </div>
  );
}
