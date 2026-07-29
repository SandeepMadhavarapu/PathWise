import { computeCptLedger } from "@/lib/engines/cpt-ledger";
import { computeUnemploymentClock } from "@/lib/engines/unemployment-clock";
import { computeOptBudget } from "@/lib/engines/opt-budget";
import {
  aidDeadlineFor,
  aidFindingFor,
  jurisdictionFor,
  residencyFindingFor,
} from "@/lib/engines/jurisdiction";
import { computeNextSteps, formatStepDate } from "@/lib/engines/next-steps";
import type { NextStep, StepTier } from "@/lib/engines/next-steps";
import {
  priyaStudent,
  priyaEvents,
  priyaOpt,
  priyaOptBudget,
  priyaAid,
} from "@/lib/fixtures/priya";
import { DeadlineExport } from "@/components/DeadlineExport";
import { NextStepCard } from "@/components/NextStepCard";
import { ScenarioNote } from "@/components/ScenarioNote";

// Why the plan is in this order. The headings are the ordering rule, said out loud.
//
// The `unknown` tier heading names both kinds of thing it now holds. The tier is "nobody can act
// around this" — which covers a question waiting on a document AND a question no document closes,
// because in both cases the answer is not available to be acted on. Saying only the first would
// mislabel the informational steps sitting beside it.
const TIERS: { key: StepTier; heading: string }[] = [
  { key: "cliff", heading: "First — the cliffs, because crossing one cannot be undone" },
  { key: "deadline", heading: "Then — real deadlines, ordered by the date you have to act" },
  {
    key: "unknown",
    heading: "Then — the open questions: what a document would settle, and what one cannot",
  },
  { key: "standing", heading: "Standing — settled findings that still shape your choices" },
];

export default function NextStepsPage() {
  // ---- every number below comes from the same engines the rest of the app reads ----
  const asOf = priyaOpt.asOf;

  const ledger = computeCptLedger(priyaEvents);
  const clock = computeUnemploymentClock(priyaOpt);
  const optBudget = computeOptBudget(priyaOptBudget);
  const jx = jurisdictionFor(priyaStudent);
  const domicile = residencyFindingFor(jx, {
    student: priyaStudent,
    events: priyaEvents,
    intentFactors: [],
    allegedEntitlementDate: "2026-08-24",
  });
  const aid = aidFindingFor(jx, priyaAid);
  const aidDeadline = aidDeadlineFor(jx, priyaAid);

  const steps = computeNextSteps({
    level: "masters",
    ledger,
    clock,
    optBudget,
    domicile,
    aid,
    aidDeadline,
    asOf,
  });

  const dated = steps.filter((s) => s.effectiveDeadline);
  const soonest = dated.reduce<NextStep | undefined>(
    (best, s) => (!best || (s.daysOfMargin ?? 0) < (best.daysOfMargin ?? 0) ? s : best),
    undefined,
  );
  // Counted separately, because they are counted differently: a step you can act on and a step that
  // exists so the record stays complete are not the same kind of obligation, and a headline that
  // added them together was the reason this page looked like ten equal tasks.
  const actionable = steps.filter((s) => !s.informational);
  const forTheRecord = steps.length - actionable.length;
  const openQuestions = steps.filter((s) => s.tier === "unknown" && !s.informational).length;

  return (
    <>
      <ScenarioNote asOf={asOf} what="Every deadline and margin below is counted from that day" />

      <div className="jintro surface">
        <div className="jintro-eyebrow">Next steps</div>
        {/* Both halves, because the page numbers all of them.
            This read "{actionable} things Priya can act on" — 7 — above a list numbered 1 to 10,
            since three of the steps are settled findings no document reopens and the engine orders
            the whole plan as one sequence. Nothing was wrong except the arithmetic a reader was
            left to do: the heading promised seven and the page counted to ten. Saying both numbers
            makes the list match its own headline, and the ordering is untouched — `order` is the
            engine's, and the golden pins it. */}
        <h2>
          {actionable.length} things Priya can act on
          {forTheRecord > 0 ? `, and ${forTheRecord} more worth knowing` : ""}, in the order they
          matter.
        </h2>
        <p>
          {/* The plan is written TO the student — it is the thing she would print, mail herself or
              load into a calendar, and the .ics and mailto exports below carry these exact
              sentences. That is why the steps say "your DSO" on a page that talks about Priya in the
              third person, and saying so once here is cheaper than translating the artifact into a
              voice nobody would ever receive it in. */}
          Below is Priya&apos;s plan as she would receive it, addressed to her. Every step is read out
          of the same engines as the rest of the record — the CPT ledger, the unemployment clock, the
          OPT budget, the domicile gate and the aid finding. PathWise adds the two things a correct
          finding still leaves out: how long the action actually takes to arrange, and therefore the
          date she has to work to rather than the one the office prints.
        </p>
        <div className="jstats">
          <span className="jstat">
            <strong>{actionable.length}</strong> to act on
          </span>
          <span className="jstat">
            <strong>{dated.length}</strong> with a real deadline
          </span>
          {/* Only when there are any. A stat reading "0 open questions" beside a heading that says
              "the open questions" is noise arguing with itself. */}
          {openQuestions > 0 ? (
            <span className="jstat">
              <strong>{openQuestions}</strong> still open
            </span>
          ) : null}
          {forTheRecord > 0 ? (
            <span className="jstat">
              <strong>{forTheRecord}</strong> for the record only — no document reopens them
            </span>
          ) : null}
          {soonest?.effectiveDeadline ? (
            <span className="jstat">
              <strong>{formatStepDate(soonest.effectiveDeadline)}</strong> is the first date that
              matters
            </span>
          ) : null}
        </div>
      </div>

      {TIERS.map(({ key, heading }) => {
        const group = steps.filter((s) => s.tier === key);
        if (group.length === 0) return null;
        return (
          <section key={key}>
            <div className="section-head">{heading}</div>
            <ol className="nslist">
              {group.map((step) => (
                <NextStepCard
                  key={step.id}
                  step={step}
                  jurisdictionName={jx.name}
                  totalSteps={steps.length}
                />
              ))}
            </ol>
          </section>
        );
      })}

      <div className="section-head">Last — put the plan somewhere it will find you</div>
      <DeadlineExport steps={steps} asOf={asOf} />

      <footer className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · The plan is
        recomputed from the record every time it is opened, so a new document or a signed offer
        reorders it on the spot. PathWise advises; the office decides.
      </footer>
    </>
  );
}
