"use client";

// DeadlineExport — outbound reminders without an outbox.
//
// PathWise has no account and no server, so it cannot email or notify anyone itself. The honest
// version of "remind me" is therefore not a notification service: it is handing the finished dates
// to two tools the student already owns — their calendar, and their mail client. Both actions below
// run entirely in the browser. Nothing is uploaded, and nothing is stored.

import { useState } from "react";
import type { NextStep } from "@/lib/engines/next-steps";
import { formatStepDate } from "@/lib/engines/next-steps";
import {
  buildIcs,
  calendarSteps,
  DEFAULT_ALARM_OFFSETS_DAYS,
  EVENTS_PER_DATED_STEP,
} from "@/lib/ics";
import { buildMailtoHref } from "@/lib/reminder-text";

const FILENAME = "pathwise-deadlines.ics";

/** Read off the offsets the file actually carries, so the file and the sentence cannot drift apart. */
const ALARM_OFFSETS_COPY = `at ${listPhrase(
  DEFAULT_ALARM_OFFSETS_DAYS.map((d) => `${d} ${d === 1 ? "day" : "days"}`),
)} out`;

/** ["a", "b", "c"] → "a, b and c". */
function listPhrase(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function DeadlineExport({
  steps,
  asOf,
  variant = "panel",
}: {
  steps: NextStep[];
  asOf: string;
  /** "panel" is the full action + explainer on Next steps; "inline" is the quiet dashboard version. */
  variant?: "panel" | "inline";
}) {
  const [saved, setSaved] = useState<string | null>(null);
  const dated = calendarSteps(steps);

  function download() {
    // Built at click time, in the browser, from the steps this page already computed.
    const ics = buildIcs(steps, { asOf });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = FILENAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Released on the next tick — Firefox needs the object URL to outlive the click.
    setTimeout(() => URL.revokeObjectURL(url), 0);

    setSaved(
      `${FILENAME} saved — ${dated.length * EVENTS_PER_DATED_STEP} events across ${dated.length} ${
        dated.length === 1 ? "deadline" : "deadlines"
      }. Open it to add them to your calendar.`,
    );
  }

  // Nothing has a date behind it: a calendar is the wrong place to assert a day nobody set.
  if (dated.length === 0) return null;

  const firstDate = formatStepDate(dated[0].effectiveDeadline);

  if (variant === "inline") {
    return (
      <div className="rem-inline">
        <button type="button" className="btn ghost sm" onClick={download}>
          Add to calendar
        </button>
        <span className="rem-hint">
          {dated.length * EVENTS_PER_DATED_STEP} events, the first on {firstDate} — a file your
          calendar reads, not an account it has to sign into.
        </span>
        <span className="rem-said" role="status">
          {saved}
        </span>
      </div>
    );
  }

  return (
    <section className="rem">
      <div className="rem-k">Reminders you will actually get</div>
      <h2 className="rem-v">
        Put these {dated.length} {dated.length === 1 ? "deadline" : "deadlines"} somewhere that will
        speak up on {firstDate}, whether or not this page is open.
      </h2>

      <div className="rem-actions">
        <button type="button" className="btn" onClick={download}>
          Add to calendar
        </button>
        <a className="btn ghost" href={buildMailtoHref(steps, { asOf })}>
          Email this to myself
        </a>
        <span className="rem-said" role="status">
          {saved}
        </span>
      </div>

      <div className="rem-note">
        <p>
          <strong>PathWise cannot email you, and will not pretend otherwise.</strong> There is no
          account and no server here, so there is nothing holding your address and nothing running
          once you close this tab.
        </p>
        <p>
          What it can do is hand the dates to a calendar you already own — and that calendar will
          remind you whether or not PathWise is open.
        </p>
        <p>
          The second button opens your own mail client with the plan already written: addressed to
          nobody until you address it, sent from your outbox, never seen by us.
        </p>
        <p>
          <strong>Each reminder fires before the deadline, not on it.</strong> Every event sits on
          the date <em>you</em> have to act — the office&apos;s deadline less the lead time that
          action actually needs, {leadRange(dated)} in this plan.
        </p>
        <p>
          The office&apos;s own date is added as a second event, so both are visible and neither is
          mistaken for the other.
        </p>
        <p>
          Some calendars quietly ignore the alarms inside an imported file, so nothing here depends
          on them.
        </p>
        <p>
          The urgency is written into the event title, and the event sits on your act-by date,
          which means even a calendar&apos;s own default notification arrives at the right moment.
        </p>
        <p>
          The alarms are in the file too — {ALARM_OFFSETS_COPY} — for the clients that honour them.
        </p>
      </div>
    </section>
  );
}

/** The honest spread of lead times in this plan, so the explainer quotes real numbers. */
function leadRange(dated: NextStep[]): string {
  const values = Array.from(new Set(dated.map((s) => s.leadTimeDays))).sort((a, b) => a - b);
  const low = values[0];
  const high = values[values.length - 1];
  return low === high ? `${low} days for every step` : `anywhere from ${low} to ${high} days`;
}
