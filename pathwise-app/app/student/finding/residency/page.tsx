import Link from "next/link";
import { runDomicileGate } from "@/lib/engines/domicile-gate";
import { priyaStudent, priyaEvents } from "@/lib/fixtures/priya";
import { FindingDetail } from "@/components/FindingDetail";

export default function ResidencyFindingPage() {
  // Same inputs as the /student dashboard — the finding shown here IS the finding shown there.
  const domicile = runDomicileGate({
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
    </>
  );
}
