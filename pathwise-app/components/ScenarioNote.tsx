// ScenarioNote — the label that keeps a frozen demo honest.
//
// The example student's record is pinned to a single "today" (see lib/fixtures/priya.ts, `asOf`).
// That freeze is deliberate: a demo whose numbers move underneath it is not reproducible, and the
// golden test could not lock the ledger to 342 days if the clock drifted.
//
// But the screens that read it render live-LOOKING countdowns — "Day 70 of 90", "auto-terminates on
// 14 August 2026", "10 days of margin". Opened a month later, with nothing on screen naming the
// day those were computed from, an honest freeze reads as a stale counter. This says the day out
// loud, once, wherever such a countdown appears.
//
// Deliberately distinct from the sidebar's "Rules verified" date: that one is about when the
// REGULATIONS were last checked against their primary source, and the two answer different
// questions. They happen to be the same date today; they are not the same fact.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatScenarioDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function ScenarioNote({
  asOf,
  /** What the reader should understand is computed from that day. */
  what = "Every date and countdown below is computed from that day",
}: {
  asOf: string;
  what?: string;
}) {
  return (
    <p className="scenario-note">
      <span className="scenario-k">Example student</span>
      <span className="scenario-sep" aria-hidden="true">
        ·
      </span>
      scenario as of <strong>{formatScenarioDate(asOf)}</strong>. {what}.
    </p>
  );
}
