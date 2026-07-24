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
    <main className="wrap">
      <div className="topbar">
        <div className="brand">
          <Link href="/" className="logo" style={{ textDecoration: "none" }}>
            Path<span className="dot">Wise</span>
          </Link>
          <span className="tag">the full reasoning behind one finding</span>
        </div>
        <Link href="/student" className="pill" style={{ textDecoration: "none" }}>
          ← Back
        </Link>
      </div>

      <FindingDetail finding={domicile} />
    </main>
  );
}
