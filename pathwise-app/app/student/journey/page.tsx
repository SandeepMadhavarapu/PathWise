"use client";

import { computeCptLedger } from "@/lib/engines/cpt-ledger";
import { priyaStudent, priyaEvents } from "@/lib/fixtures/priya";
import { JourneyTimeline } from "@/components/JourneyTimeline";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthYear(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export default function JourneyPage() {
  // Same engine, same inputs as the dashboard — the timeline can't disagree with the ledger.
  const ledger = computeCptLedger(priyaEvents);

  const since = priyaStudent.immigration.status_since;
  const starts = priyaEvents.map((e) => e.date);
  const earliest = [...starts, ...(since ? [since] : [])].sort()[0];
  const latest = priyaEvents.map((e) => e.end_date ?? e.date).sort().slice(-1)[0];

  return (
    <>
      <div className="jintro surface">
        {/* No eyebrow. It read "Her timeline" — the h1 verbatim, one line above it. It was already
            once corrected from "My journey" (the possessive described a different person than the
            sentence beneath it); the correction made it accurate and left it redundant. An eyebrow
            that repeats the heading spends a line to say nothing twice. */}
        <h2>Priya never has to explain her history again.</h2>
        <p>
          Two institutions, two education levels, and every authorization in between — held as one
          record and read by all three offices. Open any event to see the evidence beneath it and the
          finding it feeds.
        </p>
        <div className="jstats">
          <span className="jstat">
            <strong>{priyaStudent.institutions.length}</strong> institutions
          </span>
          <span className="jstat">
            <strong>{priyaEvents.length}</strong> events on record
          </span>
          <span className="jstat">
            <strong>
              {monthYear(earliest)} – {monthYear(latest)}
            </strong>{" "}
            covered
          </span>
        </div>
      </div>

      <h2 className="section-head">Her record, in order</h2>

      <JourneyTimeline student={priyaStudent} events={priyaEvents} ledger={ledger} />

      <footer className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · The timeline is the
        product — every finding on every screen is read from these events. PathWise advises; the office
        decides.
      </footer>
    </>
  );
}
