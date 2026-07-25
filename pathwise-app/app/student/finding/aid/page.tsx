import Link from "next/link";
import { computeAidEligibility, resolveAidDeadline } from "@/lib/engines/aid-eligibility";
import { priyaAid } from "@/lib/fixtures/priya";
import { FindingDetail } from "@/components/FindingDetail";
import { AidDeadline } from "@/components/AidDeadline";

export default function AidFindingPage() {
  // Same input the /student dashboard reads — the finding shown here IS the finding shown there.
  const finding = computeAidEligibility(priyaAid);
  // The Finding carries the deadline as prose in its reasoning; the panel below shows the same
  // arithmetic as structure, so the earliest-of rule is visible and not just asserted.
  const deadline = resolveAidDeadline(priyaAid);

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
          ← Back to dashboard
        </Link>
      </div>

      <FindingDetail finding={finding} />

      <div className="section-h">Three dates, one that counts</div>
      <AidDeadline deadline={deadline} />
    </main>
  );
}
