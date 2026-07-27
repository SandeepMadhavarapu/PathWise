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
    <>
      <FindingDetail finding={finding} />

      <div className="section-head">Three dates, one that counts</div>
      <AidDeadline deadline={deadline} />
    </>
  );
}
