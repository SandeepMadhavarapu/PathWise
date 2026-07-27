"use client";

import { useState } from "react";
import { computeCptLedger, SECTION_CITE } from "@/lib/engines/cpt-ledger";
import type {
  Event,
  Finding,
  FindingResult,
  ImmigrationStatus,
  ProgramLevel,
  Student,
} from "@/lib/types";
import { HeroFinding } from "@/components/HeroFinding";
import { DomainCard } from "@/components/DomainCard";
import { LedgerBar } from "@/components/LedgerBar";
import { FindingDetail } from "@/components/FindingDetail";
import { formatDecidingOffice } from "@/lib/format";
import {
  aidFindingFor,
  aidFormFor,
  jurisdictionFor,
  residencyFindingFor,
} from "@/lib/engines/jurisdiction";
import { JURISDICTIONS } from "@/lib/coverage";
import { MODELLED_CODES } from "@/lib/rulepacks";

// The statuses this flow offers (a curated subset of ImmigrationStatus).
const STATUS_OPTIONS: { value: ImmigrationStatus; label: string }[] = [
  { value: "F1", label: "F-1 (student)" },
  { value: "J1", label: "J-1 (exchange visitor)" },
  { value: "M1", label: "M-1 (vocational)" },
  { value: "LPR", label: "Lawful permanent resident" },
  { value: "citizen", label: "U.S. citizen" },
  { value: "other", label: "Other" },
];

// Every jurisdiction in the coverage file, not a curated handful. A student can now pick their own
// state and get a truthful answer about it — which for most states is "PathWise has not modelled
// this", said plainly, with the office that does decide and a link where one has been verified.
const STATE_OPTIONS: { code: string; name: string }[] = JURISDICTIONS.map((j) => ({
  code: j.code,
  name: j.name,
}));

// The form opens on a jurisdiction that has a pack behind it, so the first thing a visitor sees is
// the engine doing real work. Which one that is comes from the registry — "the modelled one", not
// "Virginia". Register a second pack and this keeps meaning what it says.
const DEFAULT_STATE = MODELLED_CODES[0] ?? JURISDICTIONS[0].code;

// finding.result -> a DomainCard band (green | amber | red). DomainCard has no "gray",
// so unable_to_verify collapses to amber for the summary card.
const RESULT_CARD_BAND: Record<FindingResult, "green" | "amber" | "red"> = {
  ineligible: "red",
  potential_risk: "amber",
  review_recommended: "amber",
  unable_to_verify: "amber",
  no_issue: "green",
};

type CptRow = {
  start: string;
  end: string;
  hours: string;
  level: ProgramLevel;
};

function blankRow(): CptRow {
  return { start: "", end: "", hours: "", level: "masters" };
}

export default function CheckPage() {
  const [status, setStatus] = useState<ImmigrationStatus>("F1");
  const [state, setState] = useState<string>(DEFAULT_STATE);
  const [rows, setRows] = useState<CptRow[]>([blankRow()]);
  const [submitted, setSubmitted] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  function updateRow(i: number, patch: Partial<CptRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, blankRow()]);
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowReasoning(false);
    setSubmitted(true);
  }

  // ---- Live client-side computation. Nothing here touches the network. ----
  const today = new Date().toISOString().slice(0, 10);

  const events: Event[] = rows
    .filter((r) => r.start && r.end && r.hours !== "")
    .map((r, i) => ({
      id: `cpt-${i}`,
      type: "cpt_auth",
      date: r.start,
      end_date: r.end,
      program_level: r.level,
      attrs: { hours_per_week: Number(r.hours) },
      evidence_ids: [],
      confidence: "asserted",
    }));

  const student: Student = {
    id: "self",
    immigration: { status, prior_statuses: [] },
    dob: "2000-01-01", // placeholder — the domicile gate reads only immigration.status
    institutions: [],
    jurisdiction_history: [{ state, from: today }],
  };

  // The CPT ledger is federal (8 CFR) and answers in full for every jurisdiction — nothing below
  // gates it on the state.
  const ledger = computeCptLedger(events);

  // JURISDICTION ROUTING — resolved once, from the student, before any reasoning happens.
  //
  // This page used to make the routing decision itself, with a local `if` that chose whether to call
  // the Virginia engines. That guard was correct and it was the only one in the app. It now lives in
  // the router, where every caller gets it: `jurisdictionFor` returns packs or it does not, and the
  // engines cannot run without them. Below, every card reads its state, band and citation off the
  // finding it was given — nothing on this screen asks which jurisdiction was picked.
  const jx = jurisdictionFor(student);
  const unmodelled = jx.unmodelled;

  const finding: Finding = residencyFindingFor(jx, {
    student,
    events,
    intentFactors: [],
    allegedEntitlementDate: today,
  });

  // The aid side of the same question, asked the same way. This used to run only for unmodelled
  // jurisdictions, with hand-written copy standing in for the finding everywhere else — the last
  // place on this page where the screen, not the router, decided whether an engine ran.
  const aidFinding: Finding = aidFindingFor(jx, {
    student,
    deadlines: { asOf: today },
  });

  // Which form to file, from the same pack that decided the finding. The card below used to answer
  // this itself with "File the FAFSA path instead" — wrong for exactly the student it was shown to,
  // since the block that closes state aid sits inside the form-selection rule and closes the FAFSA
  // route with it. Undefined for an unmodelled state, which has no forms for PathWise to recommend.
  const aidForm = aidFormFor(jx, student);

  // The hero's whole claim is that ONE fact closed BOTH doors, so it renders when both findings
  // actually say so — and `ineligible` is a determinate answer only a real pack can reach. That is
  // the condition, rather than a check on which state was picked.
  const isBlocked = finding.result === "ineligible";
  const bothDoorsClosed = isBlocked && aidFinding.result === "ineligible";

  // Immigration summary: the level closest to the 365-day cliff.
  const closestLevel = ledger.byLevel.length
    ? ledger.byLevel.reduce((a, b) => (b.daysToCliff < a.daysToCliff ? b : a))
    : undefined;

  // The resolver already spelled the jurisdiction's name; looking it up a second time from the
  // dropdown list is a second source of truth for the same fact.
  const stateName = jx.name;

  return (
    <>
      <form className="check-form surface" onSubmit={onSubmit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="status">Immigration status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ImmigrationStatus)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="state">State</label>
            <select id="state" value={state} onChange={(e) => setState(e.target.value)}>
              {STATE_OPTIONS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="section-head">Your CPT authorizations</div>
        {rows.map((row, i) => (
          <div className="cpt-row" key={i}>
            <div className="field">
              <label htmlFor={`start-${i}`}>Start date</label>
              <input
                id={`start-${i}`}
                type="date"
                value={row.start}
                onChange={(e) => updateRow(i, { start: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`end-${i}`}>End date</label>
              <input
                id={`end-${i}`}
                type="date"
                value={row.end}
                onChange={(e) => updateRow(i, { end: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`hours-${i}`}>Hours / week</label>
              <input
                id={`hours-${i}`}
                type="number"
                min={0}
                max={168}
                value={row.hours}
                onChange={(e) => updateRow(i, { hours: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`level-${i}`}>Education level</label>
              <select
                id={`level-${i}`}
                value={row.level}
                onChange={(e) => updateRow(i, { level: e.target.value as ProgramLevel })}
              >
                <option value="bachelors">Bachelor&apos;s</option>
                <option value="masters">Master&apos;s</option>
              </select>
            </div>
            {rows.length > 1 ? (
              <button
                type="button"
                className="row-remove"
                onClick={() => removeRow(i)}
                aria-label={`Remove CPT row ${i + 1}`}
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}

        <button type="button" className="row-add" onClick={addRow}>
          + Add another CPT row
        </button>

        <div className="form-actions">
          <button type="submit" className="btn">
            Check my status →
          </button>
          <span className="check-privacy">Nothing you type leaves your device.</span>
        </div>
      </form>

      {submitted ? (
        <>
          {bothDoorsClosed ? (
            <HeroFinding
              studentName="You"
              statusLabel={status}
              jurisdictionName={jx.name}
              residencyText={finding.rule_citation.text}
              residencyCite={jx.display?.residencyCite ?? ""}
              aidCite={jx.display?.aidCite ?? ""}
              voice="second"
            />
          ) : null}

          <div className="section-head">Your three offices, at a glance</div>
          <div className="domain-cards">
            <DomainCard
              domain="Immigration (F-1)"
              decidingOffice={formatDecidingOffice("SEVP")}
              status={
                closestLevel
                  ? `${closestLevel.daysToCliff} days from the CPT cliff`
                  : "No CPT on record"
              }
              band={closestLevel ? closestLevel.band : "green"}
              detail={
                closestLevel
                  ? `${closestLevel.fullTimeDays} full-time CPT days at the ${closestLevel.level} level${
                      closestLevel.optEligible ? "; OPT still available." : "; OPT eligibility lost for this level."
                    }`
                  : "Add a CPT authorization above to see your ledger."
              }
              cite={SECTION_CITE}
            />
            <DomainCard
              domain={`Residency (${stateName})`}
              decidingOffice={formatDecidingOffice(finding.deciding_office)}
              status={
                unmodelled ? "Not modelled by PathWise" : isBlocked ? "Blocked by status" : finding.headline
              }
              band={RESULT_CARD_BAND[finding.result]}
              detail={
                unmodelled
                  ? `PathWise will not run another state's rules under a ${stateName} heading. ${
                      unmodelled.authority
                        ? `${unmodelled.authority} decides this.`
                        : "PathWise has not yet verified an official source to link."
                    }`
                  : isBlocked
                    ? // Not an error — a reasoned finding, in the pack's own words rather than a
                      // rule this page restates on every jurisdiction's behalf.
                      `Not an error — a reasoned finding. ${finding.rule_citation.text}`
                    : finding.headline
              }
              // The citation is the jurisdiction's own or none at all. Never a borrowed one — and
              // now that is the type's doing, not this line's: `display` is absent without a pack.
              cite={jx.display?.residencyCite}
              detailHref={unmodelled?.source_url}
              detailLabel={unmodelled ? `Official ${stateName} source →` : undefined}
            />
            <DomainCard
              domain={`Financial aid (${stateName})`}
              decidingOffice={formatDecidingOffice("financial_aid")}
              status={unmodelled ? "Not modelled by PathWise" : aidFinding.headline}
              band={RESULT_CARD_BAND[aidFinding.result]}
              detail={
                unmodelled
                  ? `State aid usually rides on the state's own residency determination, which PathWise has not modelled for ${stateName}. This says nothing either way about federal aid.`
                  : aidFinding.result === "ineligible"
                    ? // Everything after the cross-domain framing is the engine's, so this card
                      // cannot recommend a form the finding behind it says is closed.
                      [
                        `The same status fact closes this door too.`,
                        aidForm ? `${aidForm.label}.` : "",
                        aidForm?.remains ?? "",
                      ]
                        .filter(Boolean)
                        .join(" ")
                    : `${aidForm?.label ?? "Your status does not block state aid"} — but PathWise has none of your deadlines or evidence on record, so this is not a clearance. See the full reasoning for what is still open.`
              }
              cite={jx.display?.aidCite}
            />
          </div>

          {ledger.byLevel.length > 0 ? (
            <>
              <div className="section-head">Your CPT ledger, computed live</div>
              <div className="stack-gap">
                {ledger.byLevel.map((l) => (
                  <LedgerBar key={l.level} ledger={l} voice="second" />
                ))}
              </div>
            </>
          ) : null}

          <div className="section-head">The full reasoning</div>
          {showReasoning ? (
            <FindingDetail finding={finding} />
          ) : (
            <button
              type="button"
              className="domain-card-more btn-link"
              onClick={() => setShowReasoning(true)}
            >
              See full reasoning →
            </button>
          )}
        </>
      ) : null}

      <div className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · PathWise reasons on
        your device. Every finding shows its regulation and the office that decides it. PathWise advises;
        the office decides.
      </div>
    </>
  );
}
