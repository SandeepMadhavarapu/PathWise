import {
  CLIFF_DAYS,
  FULL_TIME_HOURS_THRESHOLD,
  SECTION_CITE,
  levelLabel,
  type LevelLedger,
} from "@/lib/engines/cpt-ledger";
import { SegmentedProgress, type ProgressLegendItem } from "./SegmentedProgress";

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
  const cliffPct = (CLIFF_DAYS / TRACK_MAX_DAYS) * 100;

  const legend: ProgressLegendItem[] = [
    { status: "active", label: "full-time CPT days", value: solidFull },
  ];
  // The count of overlapping authorizations is the ledger's own — on /check a student can enter
  // three or more, and the demo student's two is only ever right for her. With no overlap days
  // there is nothing to count, so the swatch is not drawn at all. The ledger carries days, not
  // hours, so the only honest number in the label is the pack's own threshold: what a summed week
  // has to exceed for the day to count as full-time.
  if (ledger.overlapDays > 0) {
    legend.push({
      status: "warn",
      label: `days from ${ledger.overlapConcurrentAuths} part-time internship${
        ledger.overlapConcurrentAuths === 1 ? "" : "s"
      } that overlapped (over ${FULL_TIME_HOURS_THRESHOLD} hrs/wk combined → full-time)`,
      value: ledger.overlapDays,
    });
  }

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
          legend={legend}
        />
        <div className="gauge-marker" style={{ left: `${cliffPct}%` }}>
          <span className="lbl">{CLIFF_DAYS}-day cliff</span>
        </div>
      </div>

      <div className="gauge-note">
        <strong>Why this matters:</strong> at {ledger.fullTimeDays} days {second ? "you are" : "she is"}{" "}
        <strong>{ledger.daysToCliff} days</strong> from {CLIFF_DAYS} — cross it and{" "}
        {second ? "you lose" : "she loses"} OPT eligibility for this level entirely.{" "}
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
