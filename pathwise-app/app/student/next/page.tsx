import Link from "next/link";
import type { DecidingOffice, Finding } from "@/lib/types";
import { computeCptLedger } from "@/lib/engines/cpt-ledger";
import { computeUnemploymentClock } from "@/lib/engines/unemployment-clock";
import { computeOptBudget } from "@/lib/engines/opt-budget";
import { runDomicileGate } from "@/lib/engines/domicile-gate";
import { computeAidEligibility, resolveAidDeadline } from "@/lib/engines/aid-eligibility";
import { computeNextSteps, formatStepDate } from "@/lib/engines/next-steps";
import type { NextStep, StepStatus, StepTier } from "@/lib/engines/next-steps";
import {
  priyaStudent,
  priyaEvents,
  priyaOpt,
  priyaOptBudget,
  priyaAid,
} from "@/lib/fixtures/priya";

// The app's one status vocabulary — icon + word + colour, never colour alone.
const STATUS: Record<StepStatus, { icon: string; word: string }> = {
  verified: { icon: "✓", word: "On track" },
  attention: { icon: "◐", word: "Attention" },
  blocked: { icon: "●", word: "Blocked" },
  unknown: { icon: "?", word: "Unable to verify" },
};

const DOMAIN_LABEL: Record<Finding["domain"], string> = {
  immigration: "Immigration (F-1)",
  residency: "Residency (Virginia)",
  aid: "Financial aid (Virginia)",
};

const OFFICE_LABEL: Record<DecidingOffice, string> = {
  DSO: "your DSO",
  registrar: "the registrar",
  domicile_officer: "the domicile officer",
  financial_aid: "the financial aid office",
  USCIS: "USCIS",
  SEVP: "SEVP",
};

// Why the plan is in this order. The headings are the ordering rule, said out loud.
const TIERS: { key: StepTier; heading: string }[] = [
  { key: "cliff", heading: "First — the cliffs, because crossing one cannot be undone" },
  { key: "deadline", heading: "Then — real deadlines, ordered by the date you have to act" },
  { key: "unknown", heading: "Then — the open questions nobody can act around" },
  { key: "standing", heading: "Standing — settled findings that still shape your choices" },
];

function StatusChip({ status }: { status: StepStatus }) {
  const s = STATUS[status];
  return (
    <span className={`statuschip ${status}`}>
      <span className="ic" aria-hidden="true">
        {s.icon}
      </span>
      {s.word}
    </span>
  );
}

// Never a bare date: the margin rides along with it, and the consequence sits underneath.
function marginPhrase(days: number): string {
  if (days < 0) return `${Math.abs(days)} days past the point where the lead time still fits`;
  if (days === 0) return "no margin left — this is the last day it fits";
  return `${days} ${days === 1 ? "day" : "days"} of margin`;
}

function StepCard({ step }: { step: NextStep }) {
  return (
    <li className="nsitem">
      <span className={`nsnum ${step.status}`} aria-hidden="true">
        {step.order}
      </span>
      <article className="nscard">
        <div className="nshead">
          <span className="nsdomain">{DOMAIN_LABEL[step.domain]}</span>
          <StatusChip status={step.status} />
        </div>

        <h2 className="nstitle">
          <span className="sr-only">Step {step.order}: </span>
          {step.title}
        </h2>
        <p className="nswhy">{step.why}</p>

        {step.effectiveDeadline && step.deadline ? (
          <div className={`nsdl ${step.status}`}>
            <div className="nsdl-do">
              Do this before {formatStepDate(step.effectiveDeadline)} —{" "}
              {marginPhrase(step.daysOfMargin ?? 0)}
            </div>
            <div className="nsdl-hard">
              The {step.deadlineLabel} is {formatStepDate(step.deadline)} · {step.leadTimeDays} days
              of lead time: {step.leadTimeReason}
            </div>
            <div className="nsdl-miss">
              <span className="nsdl-k">If it slips</span> {step.consequenceOfMissing}
            </div>
          </div>
        ) : (
          <div className={`nsdl ${step.status}`}>
            <div className="nsdl-do">
              No date is set by the office — allow about {step.leadTimeDays} days
            </div>
            <div className="nsdl-hard">{step.leadTimeReason}</div>
            <div className="nsdl-miss">
              <span className="nsdl-k">If it slips</span> {step.consequenceOfMissing}
            </div>
          </div>
        )}

        {step.howToResolve ? (
          <div className="nsresolve">
            <span className="nsdl-k">How to resolve</span> {step.howToResolve}
          </div>
        ) : null}

        <div className="nsfoot">
          <span className="cite">{step.cite}</span> Decided by {OFFICE_LABEL[step.office]} — PathWise
          advises, the office decides.
        </div>
      </article>
    </li>
  );
}

export default function NextStepsPage() {
  // ---- every number below comes from the same engines the rest of the app reads ----
  const asOf = priyaOpt.asOf;

  const ledger = computeCptLedger(priyaEvents);
  const clock = computeUnemploymentClock(priyaOpt);
  const optBudget = computeOptBudget(priyaOptBudget);
  const domicile = runDomicileGate({
    student: priyaStudent,
    events: priyaEvents,
    intentFactors: [],
    allegedEntitlementDate: "2026-08-24",
  });
  const aid = computeAidEligibility(priyaAid);
  const aidDeadline = resolveAidDeadline(priyaAid);

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
  const openQuestions = steps.filter((s) => s.tier === "unknown").length;

  return (
    <main className="wrap">
      <div className="topbar">
        <div className="brand">
          <Link href="/" className="logo" style={{ textDecoration: "none" }}>
            Path<span className="dot">Wise</span>
          </Link>
          <span className="tag">what to do, in order</span>
        </div>
        <Link href="/student" className="pill" style={{ textDecoration: "none" }}>
          ← Back to dashboard
        </Link>
      </div>

      <div className="jintro">
        <div className="jintro-eyebrow">Next steps</div>
        <h1>Priya has {steps.length} things to do. This is the order they matter in.</h1>
        <p>
          Every step below is read out of the same engines as the rest of the record — the CPT
          ledger, the unemployment clock, the OPT budget, the domicile gate and the aid finding.
          PathWise adds the two things a correct finding still leaves out: how long the action
          actually takes to arrange, and therefore the date she has to work to rather than the one
          the office prints.
        </p>
        <div className="jstats">
          <span className="jstat">
            <strong>{steps.length}</strong> steps
          </span>
          <span className="jstat">
            <strong>{dated.length}</strong> with a real deadline
          </span>
          <span className="jstat">
            <strong>{openQuestions}</strong> open questions
          </span>
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
            <div className="section-h">{heading}</div>
            <ol className="nslist">
              {group.map((step) => (
                <StepCard key={step.id} step={step} />
              ))}
            </ol>
          </section>
        );
      })}

      <div className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · The plan is
        recomputed from the record every time it is opened, so a new document or a signed offer
        reorders it on the spot. PathWise advises; the office decides.
      </div>
    </main>
  );
}
