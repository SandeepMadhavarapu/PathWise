import type { Metadata } from "next";

import Link from "next/link";
import { jurisdictionFor, residencyFindingFor } from "@/lib/engines/jurisdiction";
import { priyaStudent, priyaEvents } from "@/lib/fixtures/priya";
import { FindingDetail } from "@/components/FindingDetail";

// Tab title only. The string is the one this route's topbar already renders, so the
// browser tab and the page heading cannot disagree. Nothing visible changes.
export const metadata: Metadata = { alternates: { canonical: "/student/finding/residency" }, description:
  "Why a student visa can block in-state domicile, with the clause quoted, the date it was verified, and the deciding office named.",
  title: "Why residency is blocked" };

export default function ResidencyFindingPage() {
  // Same inputs as the /student dashboard — the finding shown here IS the finding shown there.
  const jx = jurisdictionFor(priyaStudent);
  const domicile = residencyFindingFor(jx, {
    student: priyaStudent,
    events: priyaEvents,
    intentFactors: [],
    allegedEntitlementDate: "2026-08-24",
  });

  return (
    <>
      {/* The "← Back to overview" link that used to sit here is now the shell's, from the PARENT
          map in AppShell. It said "overview" while /moment said "Priya's standing" for the very
          same destination; one destination now has one name. */}
      {/* Moved ABOVE the finding. This sat at the foot of the page, and the page is the shortest in
          the product — two reasoning steps and it is over, because the status gate stops the
          analysis before the other nine sections run. A reader met the two steps, concluded "that
          is all it does", and only then reached the sentence explaining that the brevity is the
          finding. Said first, the two steps read as a gate doing its job rather than as a thin
          answer. Nothing about the finding, its wording or its links changed. */}
      <Link href="/student/finding/domicile" className="memorystrip surface">
        <span>
          <span className="ms-k">This is where the analysis stops, not where the engine does.</span>{" "}
          Past the gate there are nine more sections of it — dependency, the intent factors and their
          weights, the clock. They are shown on Marcus, a second example student the same gate lets
          through.
        </span>
        <span className="ms-go">See Marcus&apos;s full analysis →</span>
      </Link>

      <FindingDetail
        finding={domicile}
        events={priyaEvents}
        packId={jx.packs?.domicile.pack_id}
        packLabel={`${jx.name} residency rules`}
      />

      {/* The closing footer every other route carries. These two finding pages were the only
          screens in the product that ended without it — so the privacy line and the pointer to the
          rule pack were missing from exactly the two screens that deliver a "Blocked" verdict.
          ("PathWise advises, the office decides" was never missing: FindingDetail renders it on
          every finding. What was missing is the footer landmark, the privacy sentence and the
          coverage link.) */}
      <footer className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · Every threshold,
        exception and section reference on this page is read from the {jx.name} residency rules,
        printed in full on the <Link href="/coverage">coverage page</Link>. PathWise advises; the
        office decides.
      </footer>
    </>
  );
}
