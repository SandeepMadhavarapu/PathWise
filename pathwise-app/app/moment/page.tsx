import type { Metadata } from "next";

import Link from "next/link";
import { JobMoment } from "@/components/JobMoment";

// Tab title only. The string is the one this route's topbar already renders, so the
// browser tab and the page heading cannot disagree. Nothing visible changes.
export const metadata: Metadata = { alternates: { canonical: "/moment" }, description:
  "One student signs a job offer. Watch a single fact move through immigration, in-state residency and financial aid at once — and see what each office would decide.",
  title: "One event, many effects" };

// The back link that used to sit here is now rendered by the shell from the PARENT map in
// AppShell, so this route's way out cannot say something different from every other route's.
export default function MomentPage() {
  return (
    <>
      <JobMoment />

      {/* This page was a dead end — the most surprising content in the product with nowhere to go
          from it. The natural next question after "one event moved four things" is "what does it do
          when it cannot decide at all", which is the next screen in the argument. */}
      <Link href="/student/changed" className="memorystrip surface">
        <span>
          <span className="ms-k">One event, four consequences — and one it would not reach.</span>{" "}
          The same engine reads her CPT record two ways, lands on opposite sides of the cliff, and
          refuses to pick between them until a document settles it.
        </span>
        <span className="ms-go">See it refuse to guess →</span>
      </Link>

      <footer className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · Every consequence
        shows its derivation and the regulation behind it.
      </footer>
    </>
  );
}
