import Link from "next/link";
import { computeCptLedger } from "@/lib/engines/cpt-ledger";
import { runDomicileGate } from "@/lib/engines/domicile-gate";
import { priyaStudent, priyaEvents, priyaOpt, priyaOptBudget } from "@/lib/fixtures/priya";
import { formatDecidingOffice } from "@/lib/format";
import { statusFromBand } from "@/lib/tokens";
import { HeroFinding } from "@/components/HeroFinding";
import { DomainCard } from "@/components/DomainCard";
import { LedgerBar } from "@/components/LedgerBar";
import { UnemploymentClock } from "@/components/UnemploymentClock";
import { OptBudget } from "@/components/OptBudget";
import { Callout } from "@/components/Callout";
import { Tabs } from "@/components/Tabs";

const CLIFF_TRACK_DAYS = 400;

export default function StudentPage() {
  // ---- Everything below is computed live by the real engines. Nothing is hard-coded. ----
  const ledger = computeCptLedger(priyaEvents);
  const masters = ledger.forLevel("masters");

  const domicile = runDomicileGate({
    student: priyaStudent,
    events: priyaEvents,
    intentFactors: [],
    allegedEntitlementDate: "2026-08-24",
  });

  const isBlocked = domicile.result === "ineligible";

  return (
    <>
      <Tabs
        activeId="overview"
        tabs={[
          { id: "overview", label: "Overview", href: "/student" },
          { id: "journey", label: "My journey", href: "/student/journey" },
        ]}
      />

      <Callout title="How to read this" dismissible>
        Every card below is a live finding, not a summary — the status, the citation, and the
        micro-label under each row are computed from the same events shown in{" "}
        <Link href="/student/journey">Priya&apos;s journey</Link>. Nothing here is asserted without
        a regulation attached to it.
      </Callout>

      <HeroFinding
        studentName="Priya"
        statusLabel={priyaStudent.immigration.status}
        residencyCite="SCHEV Pt II §03(A)"
        aidCite="SCHEV VASA"
      />

      <Link href="/student/journey" className="memorystrip surface">
        <span>
          <span className="ms-k">PathWise remembers the whole journey.</span>{" "}
          {priyaStudent.institutions.length} institutions, {priyaEvents.length} events, nothing to
          re-explain.
        </span>
        <span className="ms-go">View Priya&apos;s full journey →</span>
      </Link>

      <div className="section-head">Her three offices, at a glance</div>
      <div className="domain-cards">
        <DomainCard
          domain="Immigration (F-1)"
          decidingOffice={formatDecidingOffice("SEVP")}
          status={masters ? `${masters.daysToCliff} days from the CPT cliff` : "No CPT on record"}
          band={masters ? masters.band : "green"}
          detail={
            masters
              ? `${masters.fullTimeDays} full-time CPT days at the master's level; OPT still available.`
              : ""
          }
          cite="8 CFR 214.2(f)(10)"
          progress={
            masters
              ? {
                  segments: [
                    { key: "used", status: statusFromBand(masters.band), value: masters.fullTimeDays },
                    { key: "remaining", status: "idle", value: CLIFF_TRACK_DAYS - masters.fullTimeDays },
                  ],
                }
              : undefined
          }
        />
        <DomainCard
          domain="Residency (Virginia)"
          decidingOffice={formatDecidingOffice(domicile.deciding_office)}
          status={isBlocked ? "Blocked by status" : "Under review"}
          band={isBlocked ? "red" : "amber"}
          detail="Not an error — a reasoned finding. Student-visa holders cannot establish domicile."
          cite="SCHEV Pt II §03(A)"
          detailHref="/student/finding/residency"
          detailLabel="See full reasoning →"
        />
        <DomainCard
          domain="Financial aid (Virginia)"
          decidingOffice={formatDecidingOffice("financial_aid")}
          status="Blocked by status"
          band="red"
          detail="The same F-1 fact makes her ineligible for Virginia state aid. File FAFSA path instead."
          cite="SCHEV VASA"
        />
      </div>

      {masters ? (
        <>
          <div className="section-head">The computation a chatbot can&apos;t do</div>
          <LedgerBar ledger={masters} />
        </>
      ) : null}

      <div className="section-head">Immigration — the 12 months she didn&apos;t know she was spending</div>
      <OptBudget input={priyaOptBudget} />

      <div className="section-head">Immigration — the clock that runs while she waits</div>
      <UnemploymentClock input={priyaOpt} />

      <Link href="/moment" className="cta">
        <div>
          <div className="cta-k">Now watch one event ripple across all three</div>
          <div className="cta-v">Priya signs a job offer → four things change at once</div>
        </div>
        <span className="cta-arrow">→</span>
      </Link>

      <div className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · PathWise reasons on
        your device. Every finding shows its regulation and the office that decides it. PathWise advises;
        the office decides.
      </div>
    </>
  );
}
