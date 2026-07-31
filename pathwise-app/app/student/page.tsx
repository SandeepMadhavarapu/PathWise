import type { Metadata } from "next";

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
import { formatCliffDistance, formatDecidingOffice, formatImmigrationStatus } from "@/lib/format";
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

// Tab title only. The string is the one this route's topbar already renders, so the
// browser tab and the page heading cannot disagree. Nothing visible changes.
export const metadata: Metadata = { title: "Priya's standing" };

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

      {/* The hero leads. "How to read this" used to sit here, between the scenario note and the
          finding, pushing the one thing this page exists to say below itself on a laptop — and it
          is an explanation of the CARDS, so it has moved down to sit immediately above them. Ten
          seconds on this page should buy the thesis and the deadline, not the reading instructions
          for a section still two screens away. */}
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

      {/* The trust claim that used to sit in a dismissible "How to read this" panel above these
          cards. The panel is gone; the sentence is not. It said the one thing worth saying here —
          that these are computed findings rather than a summary — and it said it in an instruction
          box that a reader had to get past before reaching the thing being explained.
          As a subtitle it is read WITH the cards instead of in front of them, and it cannot be
          dismissed, so the claim is now made to every reader rather than to the ones who leave
          callouts open. Wording preserved apart from the join. */}
      <div className="section-head">Her three offices, at a glance</div>
      <p className="section-note">
        Every card is a live finding, not a summary — the status, the citation and the micro-label
        under each row are computed from the same events shown in{" "}
        <Link href="/student/journey">Priya&apos;s timeline</Link>. Nothing here is asserted without
        a regulation attached to it.
      </p>
      <div className="domain-cards">
        <DomainCard
          domain="Immigration (F-1)"
          decidingOffice={formatDecidingOffice("SEVP")}
          status={masters ? formatCliffDistance(masters.daysToCliff) : "No CPT on record"}
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
          domain={`In-state residency (${jx.name})`}
          decidingOffice={formatDecidingOffice(domicile.deciding_office)}
          status={isBlocked ? "Blocked by status" : "Under review"}
          band={isBlocked ? "red" : "amber"}
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

      {/* The plan follows the findings it is derived from. It used to sit between the hero and the
          cards, so the dashboard offered an action before it had shown the situation the action
          answers to. */}
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

      {/* Three routes onward, in one group, at one weight.
          They used to be three full-width promotional strips scattered between the sections —
          after the deadline export, after the domain cards, and after the gauges — each styled
          like every other card on the page. With the next-step card and the evidence CTA that made
          five things asking to be clicked, all shouting equally, so a reader arriving for ten
          seconds had no way to tell which one mattered. The page now has ONE primary action (the
          next-step card, straight after the finding) and ONE contextual action (the evidence CTA,
          which earns its place by sitting under the count it is about). Everything else is here,
          quieter, and labelled as what it is: more of this example, for a reader who wants it.

          Every number below is still counted off the engines, not typed. */}
      <div className="section-head">More of this example</div>
      <div className="explore">
        <Link href="/student/journey" className="explore-row">
          <span className="explore-k">Her timeline</span>
          <span className="explore-v">
            {priyaStudent.institutions.length} institutions, {priyaEvents.length} events, nothing to
            re-explain — every finding on every screen is read from them.
          </span>
          <span className="explore-go" aria-hidden="true">
            →
          </span>
        </Link>

        {/* The one row on this page that leads to a DIFFERENT student, so it says so before it is
            clicked rather than after. "On a student the gate lets through" was true and told the
            reader nothing about crossing from Priya's record into someone else's. */}
        <Link href="/student/finding/domicile" className="explore-row">
          <span className="explore-k">
            The full determination
            <span className="explore-who">a second example student</span>
          </span>
          <span className="explore-v">
            A refusal is only half of an engine. Marcus is on the same visa Priya holds until he
            becomes a permanent resident — the gate lets him through, and residency then runs all of
            it: dependency, every intent factor and its weight, the {jx.display?.durationDays}-day
            clock.
          </span>
          <span className="explore-go" aria-hidden="true">
            →
          </span>
        </Link>

        <Link href="/moment" className="explore-row">
          <span className="explore-k">One event, many effects</span>
          <span className="explore-v">
            Priya signs a job offer → {jobConsequences.length} consequences in {jobOffices} of her
            three offices, one of which is a reasoned &ldquo;this changes nothing&rdquo;.
          </span>
          <span className="explore-go" aria-hidden="true">
            →
          </span>
        </Link>
      </div>

      <footer className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · PathWise reasons on
        your device. Every finding shows its regulation and the office that decides it. PathWise advises;
        the office decides.
      </footer>
    </>
  );
}
