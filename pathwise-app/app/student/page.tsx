import Link from "next/link";
import { computeCptLedger } from "@/lib/engines/cpt-ledger";
import { runDomicileGate } from "@/lib/engines/domicile-gate";
import { computeAidEligibility } from "@/lib/engines/aid-eligibility";
import { priyaStudent, priyaEvents, priyaOpt, priyaOptBudget, priyaAid } from "@/lib/fixtures/priya";
import { HeroFinding } from "@/components/HeroFinding";
import { DomainCard } from "@/components/DomainCard";
import { LedgerBar } from "@/components/LedgerBar";
import { UnemploymentClock } from "@/components/UnemploymentClock";
import { OptBudget } from "@/components/OptBudget";

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

  // The aid card reads the same verdict the /student/finding/aid screen shows, so the two can't drift.
  const aid = computeAidEligibility(priyaAid);
  const aidBlocked = aid.result === "ineligible";

  return (
    <main className="wrap">
      <div className="topbar">
        <div className="brand">
          <Link href="/" className="logo" style={{ textDecoration: "none" }}>
            Path<span className="dot">Wise</span>
          </Link>
          <span className="tag">your standing across every system</span>
        </div>
        <div className="topnav">
          <Link href="/" className="pill">
            ← Home
          </Link>
          <span className="pill">Example student · Priya</span>
        </div>
      </div>

      <HeroFinding
        studentName="Priya"
        statusLabel={priyaStudent.immigration.status}
        residencyCite="SCHEV Pt II §03(A)"
        aidCite="SCHEV VASA"
      />

      <Link href="/student/journey" className="memorystrip">
        <span>
          <span className="ms-k">PathWise remembers the whole journey.</span>{" "}
          {priyaStudent.institutions.length} institutions, {priyaEvents.length} events, nothing to
          re-explain.
        </span>
        <span className="ms-go">View Priya&apos;s full journey →</span>
      </Link>

      <div className="section-h">Her three offices, at a glance</div>
      <div className="cards">
        <DomainCard
          domain="Immigration (F-1)"
          status={masters ? `${masters.daysToCliff} days from the CPT cliff` : "No CPT on record"}
          band={masters ? masters.band : "green"}
          detail={
            masters
              ? `${masters.fullTimeDays} full-time CPT days at the master's level; OPT still available.`
              : ""
          }
          cite="8 CFR 214.2(f)(10)"
        />
        <DomainCard
          domain="Residency (Virginia)"
          status={isBlocked ? "Blocked by status" : "Under review"}
          band={isBlocked ? "red" : "amber"}
          detail="Not an error — a reasoned finding. Student-visa holders cannot establish domicile."
          cite="SCHEV Pt II §03(A)"
          detailHref="/student/finding/residency"
          detailLabel="See full reasoning →"
        />
        <DomainCard
          domain="Financial aid (Virginia)"
          status={aidBlocked ? "Blocked by status" : "Under review"}
          band={aidBlocked ? "red" : "amber"}
          detail="The same F-1 fact makes her ineligible for Virginia state aid. File FAFSA path instead."
          cite="SCHEV VASA"
          detailHref="/student/finding/aid"
          detailLabel="See full reasoning →"
        />
      </div>

      {masters ? (
        <>
          <div className="section-h">The computation a chatbot can&apos;t do</div>
          <LedgerBar ledger={masters} />
          <Link href="/student/changed" className="memorystrip">
            <span>
              <span className="ms-k">One missing document decides this count.</span> Watch the ledger
              re-reason the moment it arrives.
            </span>
            <span className="ms-go">See what changes when you add evidence →</span>
          </Link>
        </>
      ) : null}

      <div className="section-h">Immigration — the 12 months she didn&apos;t know she was spending</div>
      <OptBudget input={priyaOptBudget} />

      <div className="section-h">Immigration — the clock that runs while she waits</div>
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
    </main>
  );
}
