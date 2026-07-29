"use client";

// NextStepCard — one step in the plan, at two altitudes.
//
// The plan is correct and it was unreadable: ten cards, each with six stacked labelled rows, came
// to about 1,800 words on a single screen. A prioritised plan whose first item takes as much room as
// its tenth is not prioritised in any way the reader can use, so what a card shows by default is now
// the four things that decide whether to act today — position, status, what to do, and by when — and
// the reasoning is one click under it.
//
// Nothing is removed. Every sentence the engine produced is still on this page; the difference is
// that the reader chooses when to read it.

import { useState } from "react";
import { formatStepDate } from "@/lib/engines/next-steps";
import type { NextStep, StepStatus } from "@/lib/engines/next-steps";
import type { DecidingOffice, Finding } from "@/lib/types";
import { StatusGlyph } from "./StatusGlyph";
import { Capsule } from "./Capsule";
import { ChevronIcon } from "./icons";
import type { StatusKey } from "@/lib/tokens";

// The app's one status vocabulary — glyph + word + colour, never colour alone. Same mapping the
// dashboard uses, so a step cannot read one way here and another way there.
const STATUS: Record<StepStatus, { glyph: StatusKey; word: string }> = {
  verified: { glyph: "done", word: "On track" },
  attention: { glyph: "warn", word: "Attention" },
  blocked: { glyph: "blocked", word: "Blocked" },
  unknown: { glyph: "idle", word: "Unable to verify" },
};

const OFFICE_LABEL: Record<DecidingOffice, string> = {
  DSO: "your DSO",
  registrar: "the registrar",
  domicile_officer: "the domicile officer",
  financial_aid: "the financial aid office",
  USCIS: "USCIS",
  SEVP: "SEVP",
  state_higher_ed_agency: "the state higher-education agency",
};

// Residency and aid are decided by a state; immigration is federal and is not.
function domainLabel(domain: Finding["domain"], jurisdictionName: string): string {
  if (domain === "immigration") return "Immigration (F-1)";
  return `${domain === "residency" ? "Residency" : "Financial aid"} (${jurisdictionName})`;
}

// Never a bare date: the margin rides along with it, and the consequence sits underneath.
function marginPhrase(days: number): string {
  if (days < 0) return `${Math.abs(days)} days past the point where the lead time still fits`;
  if (days === 0) return "no margin left — this is the last day it fits";
  return `${days} ${days === 1 ? "day" : "days"} of margin`;
}

/** The one line that answers "do I have to care about this today?". */
function whenLine(step: NextStep): string {
  if (step.effectiveDeadline && step.daysOfMargin !== undefined) {
    return `Do this before ${formatStepDate(step.effectiveDeadline)} — ${marginPhrase(step.daysOfMargin)}`;
  }
  if (step.informational) return "No deadline — nothing here is holding a decision up";
  return `No date is set by the office — allow about ${step.leadTimeDays} days`;
}

export function NextStepCard({
  step,
  jurisdictionName,
  totalSteps,
}: {
  step: NextStep;
  jurisdictionName: string;
  /** How many steps the plan has in total, so a step can say which of them it is. */
  totalSteps: number;
}) {
  const [open, setOpen] = useState(false);
  const s = STATUS[step.status];
  const panelId = `step-${step.id.replace(/[^a-zA-Z0-9-]/g, "-")}`;

  return (
    <li className={`nsitem${step.informational ? " informational" : ""}`}>
      <span className={`nsnum ${step.status}`} aria-hidden="true">
        {step.order}
      </span>
      <article className={`nscard surface${open ? " open" : ""}`}>
        <div className="nshead">
          <span className="nsdomain">{domainLabel(step.domain, jurisdictionName)}</span>
          <span className={`statuschip ${step.status}`}>
            <StatusGlyph status={s.glyph} />
            {s.word}
          </span>
          {/* An informational step is not a fifth status — it is a statement about what acting on
              this step can achieve, which is a different axis from how the finding came out. */}
          {step.informational ? <Capsule variant="neutral">For the record only</Capsule> : null}
        </div>

        <h2 className="nstitle">
          {/* "of {totalSteps}" is the half that was missing. The visible number beside this card is
              `aria-hidden`, so this is the only place a screen reader hears which step it is on —
              and hearing "Step 8" after being told the plan has seven things to act on is a
              contradiction with no way to resolve it by listening harder. The total closes it. */}
          <span className="sr-only">
            Step {step.order} of {totalSteps}:{" "}
          </span>
          {step.title}
        </h2>

        <div className={`nswhen ${step.status}`}>{whenLine(step)}</div>

        <button
          type="button"
          className="nsmore"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <ChevronIcon className="icon-14 nsmore-chev" />
          {open ? "Hide the reasoning" : "Why this, why now, and what happens if it slips"}
        </button>

        {open ? (
          <div className="nsdetail" id={panelId}>
            <p className="nswhy">{step.why}</p>

            {step.effectiveDeadline && step.deadline ? (
              <div className={`nsdl ${step.status}`}>
                <div className="nsdl-hard">
                  The {step.deadlineLabel} is {formatStepDate(step.deadline)} · {step.leadTimeDays}{" "}
                  days of lead time: {step.leadTimeReason}
                </div>
                <div className="nsdl-miss">
                  <span className="nsdl-k">If it slips</span> {step.consequenceOfMissing}
                </div>
              </div>
            ) : (
              <div className={`nsdl ${step.status}`}>
                <div className="nsdl-hard">{step.leadTimeReason}</div>
                <div className="nsdl-miss">
                  <span className="nsdl-k">If it slips</span> {step.consequenceOfMissing}
                </div>
              </div>
            )}

            {step.howToResolve ? (
              <div className="nsresolve">
                <span className="nsdl-k">
                  {step.informational ? "What to do with it" : "How to resolve"}
                </span>{" "}
                {step.howToResolve}
              </div>
            ) : null}

            <div className="nsfoot">
              {/* Data-driven: a step can carry a full SCHEV authority line, far past what a nowrap
                  chip can hold on a phone. `wrap` lets those break instead of widening the page. */}
              <span className="cite wrap">{step.cite}</span> Decided by {OFFICE_LABEL[step.office]} —
              PathWise advises, the office decides.
            </div>
          </div>
        ) : null}
      </article>
    </li>
  );
}
