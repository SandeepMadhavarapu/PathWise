import {
  computeUnemploymentClock,
  QUALIFYING_MIN_HOURS_PER_WEEK,
  STEM_ADDITIONAL_DAYS,
  type UnemploymentClockInput,
} from "@/lib/engines/unemployment-clock";

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function UnemploymentClock({
  input,
  voice = "third",
}: {
  input: UnemploymentClockInput;
  voice?: "second" | "third";
}) {
  const clock = computeUnemploymentClock(input);
  const second = voice === "second";
  const subject = second ? "you" : "she";
  const possessive = second ? "your" : "her";

  const fillPct = Math.min(100, (clock.daysUsed / clock.cap) * 100);
  const capLine = clock.stemApplies
    ? `STEM extension in effect — cap is ${clock.cap} days.`
    : // The days the STEM extension would add are the pack's number, not a retyped one: while the
      // extension is dormant `clock.cap` is still the base allowance, so it cannot be read off there.
      `No qualifying employment reported, so the cap is ${clock.cap} days — the STEM +${
        input.stem ? STEM_ADDITIONAL_DAYS : 0
      } only unlocks once ${subject} report${second ? "" : "s"} a job.`;

  return (
    <div className="uclock">
      <div className="head">
        <span className="title">
          Unemployment clock — Day {clock.daysUsed} of {clock.cap}
        </span>
        <span className={`sub ${clock.band}`}>
          {clock.isPaused
            ? "clock paused — qualifying job active"
            : `${clock.daysRemaining} days remaining`}
        </span>
      </div>

      <div className="track-wrap">
        <div className="track">
          <div className={`fill ${clock.band}`} style={{ width: `${fillPct}%` }} />
        </div>
        {/* Outside the track: the track clips its fill, and would clip this label with it. */}
        <div className="cap-mark">
          <span className="lbl">
            {clock.cap}-day cap
          </span>
        </div>
      </div>

      <div className="legend">
        <span>{capLine}</span>
      </div>

      {clock.isPaused ? (
        <div className="note">
          <strong>Right now the clock is paused.</strong> A qualifying job (
          {QUALIFYING_MIN_HOURS_PER_WEEK}+ hrs/week) is active as of {formatDate(input.asOf)}, so no
          unemployment days are accruing today. It resumes the moment that job ends.
        </div>
      ) : (
        <div className="note">
          <strong>If the current gap continues,</strong> {possessive} SEVIS record auto-terminates on{" "}
          <strong>{formatDate(clock.projectedTerminationDate as string)}</strong>. Days are counted
          cumulatively — every gap while job-hunting adds up, not just the longest one.
        </div>
      )}

      <div className={`consequence ${clock.band}`}>
        On day {clock.cap + 1} {subject} fall{second ? "" : "s"} out of status — no grace period, no
        reinstatement. <span className="cite">8 CFR 214.2(f) · SEVP</span>
      </div>
    </div>
  );
}
