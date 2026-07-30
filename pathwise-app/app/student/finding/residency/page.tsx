import Link from "next/link";
import { jurisdictionFor, residencyFindingFor } from "@/lib/engines/jurisdiction";
import { priyaStudent, priyaEvents } from "@/lib/fixtures/priya";
import { FindingDetail } from "@/components/FindingDetail";

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
      <FindingDetail
        finding={domicile}
        events={priyaEvents}
        packId={jx.packs?.domicile.pack_id}
        packLabel={`${jx.name} residency rules`}
      />

      {/* The gate stops this analysis, which is the honest answer — and it is not the only answer the
          engine has. The sibling route runs the rest of Engine B on a student it lets through. */}
      {/* Names the student it leads to. This link crosses from Priya's record into Marcus's, and
          said nothing about it — so a reader followed "see the full analysis" expecting more of
          the finding they were reading and arrived at someone else's case. */}
      <Link href="/student/finding/domicile" className="memorystrip surface">
        <span>
          <span className="ms-k">This is where the analysis stops, not where the engine does.</span>{" "}
          Past the gate there are nine more sections of it — dependency, the intent factors and their
          weights, the clock. They are shown on Marcus, a second example student the same gate lets
          through.
        </span>
        <span className="ms-go">See Marcus&apos;s full analysis →</span>
      </Link>
    </>
  );
}
