import type { Metadata } from "next";

import { aidDeadlineFor, aidFindingFor, jurisdictionFor } from "@/lib/engines/jurisdiction";
import { priyaAid, priyaEvents, priyaStudent } from "@/lib/fixtures/priya";
import { FindingDetail } from "@/components/FindingDetail";
import { AidDeadline } from "@/components/AidDeadline";

// Tab title only. The string is the one this route's topbar already renders, so the
// browser tab and the page heading cannot disagree. Nothing visible changes.
export const metadata: Metadata = { title: "Why state aid is blocked" };

export default function AidFindingPage() {
  // Resolved from the student's own record, so this screen answers under the rules of the state she
  // is actually in rather than the one whose pack happened to be imported.
  const jx = jurisdictionFor(priyaStudent);

  // Same input the /student dashboard reads — the finding shown here IS the finding shown there.
  const finding = aidFindingFor(jx, priyaAid);
  // The Finding carries the deadline as prose in its reasoning; the panel below shows the same
  // arithmetic as structure, so the earliest-of rule is visible and not just asserted. An unmodelled
  // jurisdiction has no priority date to compute from, so there is no panel to show.
  const deadline = aidDeadlineFor(jx, priyaAid);

  return (
    <>
      <FindingDetail
        finding={finding}
        events={priyaEvents}
        packId={jx.packs?.aid?.pack_id}
        packLabel={`${jx.name} state aid rules`}
      />

      {deadline ? (
        <>
          <div className="section-head">Three dates, one that counts</div>
          <AidDeadline deadline={deadline} />
        </>
      ) : null}
    </>
  );
}
