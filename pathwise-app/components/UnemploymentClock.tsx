import {
  computeUnemploymentClock,
  QUALIFYING_MIN_HOURS_PER_WEEK,
  STEM_ADDITIONAL_DAYS,
  TERMINATION_CITE,
  type UnemploymentClockInput,
} from "@/lib/engines/unemployment-clock";
import { formatCapRemaining } from "@/lib/format";
import { statusFromBand } from "@/lib/tokens";
import { SegmentedProgress } from "./SegmentedProgress";

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
  const status = statusFromBand(clock.band);

  const capLine = clock.stemApplies
    ? `STEM extension in effect — cap is ${clock.cap} days.`
    : // The days the STEM extension would add are the pack's number, not a retyped one: while the
      // extension is dormant `clock.cap` is still the base allowance, so it cannot be read off there.
      `No qualifying employment reported, so the cap is ${clock.cap} days — the STEM +${
        input.stem ? STEM_ADDITIONAL_DAYS : 0
      } only unlocks once ${subject} report${second ? "" : "s"} a job.`;

  return (
    <div className="uclock gauge-card surface">
      <div className="gauge-head">
        <span className="gauge-title t-card-title">
          Unemployment clock — Day {clock.daysUsed} of {clock.cap}
        </span>
        <span className={`gauge-sub ${status}`}>
          {clock.isPaused
            ? "clock paused — qualifying job active"
            : formatCapRemaining(clock.daysRemaining)}
        </span>
      </div>

      <div className="gauge-track-wrap">
        <SegmentedProgress
          ariaLabel="Unemployment clock"
          total={clock.cap}
          segments={[
            { key: "used", status, value: clock.daysUsed },
            { key: "remaining", status: "idle", value: Math.max(0, clock.cap - clock.daysUsed) },
          ]}
        />
        <div className="gauge-marker" style={{ left: "100%" }}>
          <span className="lbl">{clock.cap}-day cap</span>
        </div>
      </div>

      <div className="gauge-cap-note">{capLine}</div>

      {clock.isPaused ? (
        <div className="gauge-note">
          <strong>Right now the clock is paused.</strong> A qualifying job (
          {QUALIFYING_MIN_HOURS_PER_WEEK}+ hrs/week) is active as of {formatDate(input.asOf)}, so no
          unemployment days are accruing today. It resumes the moment that job ends.
        </div>
      ) : (
        <div className="gauge-note">
          <strong>If the current gap continues,</strong> {possessive} SEVIS record auto-terminates on{" "}
          <strong>{formatDate(clock.projectedTerminationDate as string)}</strong>. Days are counted
          cumulatively — every gap while job-hunting adds up, not just the longest one.
        </div>
      )}

      <div className={`gauge-consequence ${status}`}>
        On day {clock.cap + 1} {subject} fall{second ? "" : "s"} out of status — no grace period, no
        reinstatement. <span className="cite">{TERMINATION_CITE}</span>
      </div>
    </div>
  );
}
