import Link from "next/link";
import { jurisdictionFor, residencyFindingFor } from "@/lib/engines/jurisdiction";
import { priyaStudent, priyaEvents } from "@/lib/fixtures/priya";
import { FindingDetail } from "@/components/FindingDetail";

export default function ResidencyFindingPage() {
  // Same inputs as the /student dashboard — the finding shown here IS the finding shown there.
  const domicile = residencyFindingFor(jurisdictionFor(priyaStudent), {
    student: priyaStudent,
    events: priyaEvents,
    intentFactors: [],
    allegedEntitlementDate: "2026-08-24",
  });

  return (
    <>
      <Link href="/student" className="back-link">
        ← Back to overview
      </Link>

      <FindingDetail finding={domicile} />

      {/* The gate stops this analysis, which is the honest answer — and it is not the only answer the
          engine has. The sibling route runs the rest of Engine B on a student it lets through. */}
      <Link href="/student/finding/domicile" className="memorystrip surface">
        <span>
          <span className="ms-k">This is where the analysis stops, not where the engine does.</span>{" "}
          Past the gate there are nine more sections of it — dependency, the intent factors and their
          weights, the clock.
        </span>
        <span className="ms-go">See the full domicile analysis →</span>
      </Link>
    </>
  );
}
