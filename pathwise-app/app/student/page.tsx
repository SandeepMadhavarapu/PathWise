import Link from "next/link";
import { computeCptLedger, SECTION_CITE } from "@/lib/engines/cpt-ledger";
import { computeUnemploymentClock } from "@/lib/engines/unemployment-clock";
import { computeOptBudget, OPT_BUDGET_RULES } from "@/lib/engines/opt-budget";
import { runDomicileGate } from "@/lib/engines/domicile-gate";
import { computeAidEligibility, resolveAidDeadline } from "@/lib/engines/aid-eligibility";
import { computeNextSteps, formatStepDate } from "@/lib/engines/next-steps";
import { priyaStudent, priyaEvents, priyaOpt, priyaOptBudget, priyaAid } from "@/lib/fixtures/priya";
import { formatStatusCode } from "@/lib/status-display";
import { STATE_COUNT } from "@/lib/coverage";
import { HeroFinding } from "@/components/HeroFinding";
import { DomainCard } from "@/components/DomainCard";
import { LedgerBar } from "@/components/LedgerBar";
import { UnemploymentClock } from "@/components/UnemploymentClock";
import { OptBudget } from "@/components/OptBudget";
import { DeadlineExport } from "@/components/DeadlineExport";

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

  // The plan, from the same engine outputs as everything else on this page. Only the first step is
  // shown here — the whole point of /student/next is that the order is computed, not editorial.
  const steps = computeNextSteps({
    level: "masters",
    ledger,
    clock: computeUnemploymentClock(priyaOpt),
    optBudget: computeOptBudget(priyaOptBudget),
    domicile,
    aid,
    aidDeadline: resolveAidDeadline(priyaAid),
    asOf: priyaOpt.asOf,
  });
  const firstStep = steps[0];
  const stepWord: Record<string, string> = {
    verified: "On track",
    attention: "Attention",
    blocked: "Blocked",
    unknown: "Unable to verify",
  };
  const stepIcon: Record<string, string> = {
    verified: "✓",
    attention: "◐",
    blocked: "●",
    unknown: "?",
  };

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

      {firstStep ? (
        <Link href="/student/next" className="nextcard">
          <div>
            <div className="nc-k">
              Your next steps · {steps.length} in order, first one first
            </div>
            <div className="nc-v">{firstStep.title}</div>
            <div className="nc-when">
              <span className={`statuschip ${firstStep.status}`}>
                <span className="ic" aria-hidden="true">{stepIcon[firstStep.status]}</span>
                {stepWord[firstStep.status]}
              </span>
              <span>
                {firstStep.effectiveDeadline && firstStep.daysOfMargin !== undefined
                  ? `Before ${formatStepDate(firstStep.effectiveDeadline)} — ${firstStep.daysOfMargin} days of margin`
                  : firstStep.why}
              </span>
            </div>
          </div>
          <span className="nc-go">Your next steps →</span>
        </Link>
      ) : null}

      <DeadlineExport steps={steps} asOf={priyaOpt.asOf} variant="inline" />

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
          cite={SECTION_CITE}
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
          detail={`The same ${formatStatusCode(
            priyaStudent.immigration.status,
          )} fact makes her ineligible for Virginia state aid. File FAFSA path instead.`}
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

      <div className="section-h">
        Immigration — the {OPT_BUDGET_RULES.budgetMonths} months she didn&apos;t know she was spending
      </div>
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

      <Link href="/coverage" className="memorystrip">
        <span>
          <span className="ms-k">Priya&apos;s residency rules are a file, not a special case.</span>{" "}
          See how far the rule packs reach, and where they honestly don&apos;t yet.
        </span>
        <span className="ms-go">Coverage: {STATE_COUNT} states + DC →</span>
      </Link>

      <div className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · PathWise reasons on
        your device. Every finding shows its regulation and the office that decides it. PathWise advises;
        the office decides.
      </div>
    </main>
  );
}
