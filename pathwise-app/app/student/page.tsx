import Link from "next/link";
import { computeCptLedger, SECTION_CITE } from "@/lib/engines/cpt-ledger";
import { computeUnemploymentClock } from "@/lib/engines/unemployment-clock";
import { computeOptBudget, OPT_BUDGET_RULES } from "@/lib/engines/opt-budget";
import { DOMICILE_DURATION_DAYS, GATE_DISPLAY_CITE, runDomicileGate } from "@/lib/engines/domicile-gate";
import { AID_DISPLAY_CITE, computeAidEligibility, resolveAidDeadline } from "@/lib/engines/aid-eligibility";
import { computeNextSteps, formatStepDate } from "@/lib/engines/next-steps";
import type { StepStatus } from "@/lib/engines/next-steps";
import { priyaStudent, priyaEvents, priyaOpt, priyaOptBudget, priyaAid } from "@/lib/fixtures/priya";
import { formatDecidingOffice, formatImmigrationStatus } from "@/lib/format";
import { statusFromBand, type StatusKey } from "@/lib/tokens";
import { STATE_COUNT } from "@/lib/coverage";
import { HeroFinding } from "@/components/HeroFinding";
import { DomainCard } from "@/components/DomainCard";
import { LedgerBar } from "@/components/LedgerBar";
import { UnemploymentClock } from "@/components/UnemploymentClock";
import { OptBudget } from "@/components/OptBudget";
import { DeadlineExport } from "@/components/DeadlineExport";
import { StatusGlyph } from "@/components/StatusGlyph";
import { Callout } from "@/components/Callout";
import { Tabs } from "@/components/Tabs";

// Visual scale for the immigration card's mini-track only — how much track to draw. The cliff
// itself is the rulepack's, and the ledger reads it; nothing regulatory is set here.
const CLIFF_TRACK_DAYS = 400;

// The app's one status vocabulary, mapped onto the design system's glyphs.
const STEP_STATUS: Record<StepStatus, { glyph: StatusKey; word: string }> = {
  verified: { glyph: "done", word: "On track" },
  attention: { glyph: "warn", word: "Attention" },
  blocked: { glyph: "blocked", word: "Blocked" },
  unknown: { glyph: "idle", word: "Unable to verify" },
};

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
        residencyCite={GATE_DISPLAY_CITE}
        aidCite={AID_DISPLAY_CITE}
      />

      {firstStep ? (
        <Link href="/student/next" className="nextcard surface">
          <div>
            <div className="nc-k">
              Your next steps · {steps.length} in order, first one first
            </div>
            <div className="nc-v t-row-title">{firstStep.title}</div>
            <div className="nc-when">
              <span className="statuschip">
                <StatusGlyph status={STEP_STATUS[firstStep.status].glyph} />
                {STEP_STATUS[firstStep.status].word}
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
          cite={SECTION_CITE}
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
          cite={GATE_DISPLAY_CITE}
          detailHref="/student/finding/residency"
          detailLabel="See full reasoning →"
        />
        <DomainCard
          domain="Financial aid (Virginia)"
          decidingOffice={formatDecidingOffice(aid.deciding_office)}
          status={aidBlocked ? "Blocked by status" : "Under review"}
          band={aidBlocked ? "red" : "amber"}
          detail={`The same ${formatImmigrationStatus(
            priyaStudent.immigration.status,
          )} fact makes her ineligible for Virginia state aid. File FAFSA path instead.`}
          cite={AID_DISPLAY_CITE}
          detailHref="/student/finding/aid"
          detailLabel="See full reasoning →"
        />
      </div>

      {/* The residency card above is a refusal, and a refusal is only half of an engine. This is the
          other half, on a student the same gate lets through. */}
      <Link href="/student/finding/domicile" className="memorystrip surface">
        <span>
          <span className="ms-k">A refusal is not the whole engine.</span> On a student the gate lets
          through, residency runs the full determination — dependency, every intent factor and its
          weight, and the {DOMICILE_DURATION_DAYS}-day clock.
        </span>
        <span className="ms-go">See Engine B do the work →</span>
      </Link>

      {masters ? (
        <>
          <div className="section-head">The computation a chatbot can&apos;t do</div>
          <LedgerBar ledger={masters} />
          <Link href="/student/changed" className="memorystrip surface">
            <span>
              <span className="ms-k">One missing document decides this count.</span> Watch the ledger
              re-reason the moment it arrives.
            </span>
            <span className="ms-go">See what changes when you add evidence →</span>
          </Link>
        </>
      ) : null}

      <div className="section-head">
        Immigration — the {OPT_BUDGET_RULES.budgetMonths} months she didn&apos;t know she was spending
      </div>
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

      <Link href="/coverage" className="memorystrip surface">
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
    </>
  );
}
