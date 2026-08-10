import type { Metadata } from "next";

import Link from "next/link";
import { aidDeadlineFor, aidFindingFor, jurisdictionFor } from "@/lib/engines/jurisdiction";
import { priyaAid, priyaEvents, priyaStudent } from "@/lib/fixtures/priya";
import { FindingDetail } from "@/components/FindingDetail";
import { AidDeadline } from "@/components/AidDeadline";

// Tab title only. The string is the one this route's topbar already renders, so the
// browser tab and the page heading cannot disagree. Nothing visible changes.
export const metadata: Metadata = { alternates: { canonical: "/student/finding/aid" }, description:
  "Why a student visa can close state financial aid, with the rule quoted, the office that decides it, and the questions this reading could not settle.",
  title: "Why state aid is blocked" };

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
          <h2 className="section-head">Three dates, one that counts</h2>
          <AidDeadline deadline={deadline} />
        </>
      ) : null}

      {/* The closing footer every other route carries. These two finding pages were the only
          screens in the product that ended without it — so the privacy line and the pointer to the
          rule pack were missing from exactly the two screens that deliver a "Blocked" verdict.
          ("PathWise advises, the office decides" was never missing: FindingDetail renders it on
          every finding. What was missing is the footer landmark, the privacy sentence and the
          coverage link.) */}
      <footer className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · Every provision,
        deadline and citation on this page is read from the {jx.name} state aid rules, printed in
        full on the <Link href="/coverage">coverage page</Link>. PathWise advises; the office
        decides.
      </footer>
    </>
  );
}
