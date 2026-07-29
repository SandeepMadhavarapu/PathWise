import Link from "next/link";
import { computeCptLedger, SECTION_CITE } from "@/lib/engines/cpt-ledger";
import { computeUnemploymentClock } from "@/lib/engines/unemployment-clock";
import { computeOptBudget, OPT_BUDGET_RULES } from "@/lib/engines/opt-budget";
import {
  aidDeadlineFor,
  aidFindingFor,
  aidFormFor,
  jurisdictionFor,
  residencyFindingFor,
} from "@/lib/engines/jurisdiction";
import { computeNextSteps, formatStepDate } from "@/lib/engines/next-steps";
import type { StepStatus } from "@/lib/engines/next-steps";
import { applyLifeEvent } from "@/lib/engines/consequence-engine";
import {
  priyaStudent,
  priyaEvents,
  priyaOpt,
  priyaOptBudget,
  priyaAid,
  priyaJobOffer,
} from "@/lib/fixtures/priya";
import { formatDecidingOffice, formatImmigrationStatus } from "@/lib/format";
import { statusFromBand, type StatusKey } from "@/lib/tokens";
import { HeroFinding } from "@/components/HeroFinding";
import { DomainCard } from "@/components/DomainCard";
import { LedgerBar } from "@/components/LedgerBar";
import { UnemploymentClock } from "@/components/UnemploymentClock";
import { OptBudget } from "@/components/OptBudget";
import { DeadlineExport } from "@/components/DeadlineExport";
import { StatusGlyph } from "@/components/StatusGlyph";
import { Callout } from "@/components/Callout";
import { ScenarioNote } from "@/components/ScenarioNote";

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

  // Priya's jurisdiction, resolved from her own record rather than assumed. Every citation this
  // page prints comes from the packs this resolves to, so the screen cannot outlive its own rules.
  const jx = jurisdictionFor(priyaStudent);

  const domicile = residencyFindingFor(jx, {
    student: priyaStudent,
    events: priyaEvents,
    intentFactors: [],
    allegedEntitlementDate: "2026-08-24",
  });

  const isBlocked = domicile.result === "ineligible";

  // The aid card reads the same verdict the /student/finding/aid screen shows, so the two can't drift.
  const aid = aidFindingFor(jx, priyaAid);
  const aidBlocked = aid.result === "ineligible";
  // ...and the same form selection, which is the part this card used to answer on its own. It said
  // "File FAFSA path instead" — advice the engine one click away flatly contradicts, because the
  // block sits inside the form-selection rule and closes the FAFSA route with it.
  const aidForm = aidFormFor(jx, priyaStudent);

  // The plan, from the same engine outputs as everything else on this page. Only the first step is
  // shown here — the whole point of /student/next is that the order is computed, not editorial.
  const steps = computeNextSteps({
    level: "masters",
    ledger,
    clock: computeUnemploymentClock(priyaOpt),
    optBudget: computeOptBudget(priyaOptBudget),
    domicile,
    aid,
    aidDeadline: aidDeadlineFor(jx, priyaAid),
    asOf: priyaOpt.asOf,
  });
  const firstStep = steps[0];
  const actionableSteps = steps.filter((s) => !s.informational).length;

  // The life-event card below quotes these; both are counted, never typed.
  const jobConsequences = applyLifeEvent(priyaStudent, priyaJobOffer, jx);
  const jobOffices = new Set(jobConsequences.map((c) => c.domain)).size;

  return (
    <>
      <ScenarioNote asOf={priyaOpt.asOf} />

      <Callout title="How to read this" dismissible>
        Every card below is a live finding, not a summary — the status, the citation, and the
        micro-label under each row are computed from the same events shown in{" "}
        <Link href="/student/journey">Priya&apos;s journey</Link>. Nothing here is asserted without
        a regulation attached to it.
      </Callout>

      <HeroFinding
        studentName="Priya"
        statusLabel={priyaStudent.immigration.status}
        jurisdictionName={jx.name}
        residencyText={domicile.rule_citation.text}
        residencyCite={jx.display?.residencyCite ?? ""}
        residencyOffice={formatDecidingOffice(domicile.deciding_office)}
        aidCite={jx.display?.aidCite ?? ""}
        aidOffice={formatDecidingOffice(aid.deciding_office)}
      />

      {firstStep ? (
        <Link href="/student/next" className="nextcard surface">
          <div>
            {/* The actionable count, not the raw step count — the plan itself now separates the
                two, and a dashboard promising ten things next to a plan offering seven is the
                dashboard being wrong. */}
            {/* Third person, because this is Priya's plan. It read "Your next steps" while the
                rail item pointing at the very same screen now reads "Her next steps" — and of the
                two, the possessive was the one making a claim about whose record this is. */}
            <div className="nc-k">
              Her next steps · {actionableSteps} to act on, in order, first one first
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
          <span className="nc-go">Her next steps →</span>
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
          domain={`Residency (${jx.name})`}
          decidingOffice={formatDecidingOffice(domicile.deciding_office)}
          status={isBlocked ? "Blocked by status" : "Under review"}
          band={isBlocked ? "red" : "amber"}
          // The reason is the pack's, carried on the finding. This card used to assert the rule
          // itself, which made it true only for as long as Virginia was the only pack.
          detail={`Not an error — a reasoned finding. ${domicile.rule_citation.text}`}
          cite={jx.display?.residencyCite}
          detailHref="/student/finding/residency"
          detailLabel="See full reasoning →"
        />
        <DomainCard
          domain={`Financial aid (${jx.name})`}
          decidingOffice={formatDecidingOffice(aid.deciding_office)}
          status={aidBlocked ? "Blocked by status" : "Under review"}
          band={aidBlocked ? "red" : "amber"}
          // "The same fact" is the hero's cross-domain framing and belongs to the screen. What
          // follows it does not: the form verdict and the route it leaves open are the engine's
          // words, so the card and the full reasoning can no longer say opposite things.
          detail={[
            aidBlocked
              ? `The same ${formatImmigrationStatus(
                  priyaStudent.immigration.status,
                )} fact closes this door too.`
              : aid.headline + ".",
            aidForm ? `${aidForm.label}.` : "",
            aidForm?.remains ?? "",
          ]
            .filter(Boolean)
            .join(" ")}
          cite={jx.display?.aidCite}
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
          weight, and the {jx.display?.durationDays}-day clock.
        </span>
        <span className="ms-go">See the full determination →</span>
      </Link>

      {masters ? (
        <>
          <div className="section-head">The computation a chatbot can&apos;t do</div>
          <LedgerBar ledger={masters} />
          {/* The loudest secondary action on this page, deliberately: it is the route to the one
              screen where PathWise is seen refusing to guess, which is the thing worth remembering
              about it. It was a quiet strip indistinguishable from three others. */}
          <Link href="/student/changed" className="cta">
            <div>
              <div className="cta-k">One missing document decides this count</div>
              <div className="cta-v">
                Watch the same engine reach two answers over these same authorizations — on opposite
                sides of the cliff — and refuse to pick one
              </div>
            </div>
            <span className="cta-arrow">→</span>
          </Link>
        </>
      ) : null}

      {/* Two clocks, and they are the same KIND of object: a budget and a countdown, each measured
          against a cap the student did not choose. On a wide screen they sit side by side so they
          can be compared; below 1280 they stack, and each keeps its own heading either way. */}
      <div className="section-head">Immigration — the two clocks already running</div>
      <div className="gauge-pair">
        <div>
          <div className="gauge-pair-head">
            The {OPT_BUDGET_RULES.budgetMonths} months she didn&apos;t know she was spending
          </div>
          <OptBudget input={priyaOptBudget} />
        </div>
        <div>
          <div className="gauge-pair-head">The clock that runs while she waits</div>
          <UnemploymentClock input={priyaOpt} />
        </div>
      </div>

      {/* Both numbers below are counted off the engine's own output. This card used to promise that
          one event rippled "across all three" offices and that "four things change" — the second
          was right by luck and the first was simply not true: signing an offer reaches immigration
          and residency rules, and nothing in the map touches aid. A card that oversells the engine
          is worse than one that undersells it, because the engine is the thing being judged. */}
      <Link href="/moment" className="memorystrip surface">
        <span>
          <span className="ms-k">One event, re-read across the whole record.</span> Priya signs a job
          offer → {jobConsequences.length} consequences in {jobOffices} of her three offices, one of
          which is a reasoned &ldquo;this changes nothing&rdquo;.
        </span>
        <span className="ms-go">See the consequences →</span>
      </Link>

      <div className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · PathWise reasons on
        your device. Every finding shows its regulation and the office that decides it. PathWise advises;
        the office decides.
      </div>
    </>
  );
}
