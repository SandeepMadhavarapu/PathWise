"use client";

import Link from "next/link";
import { useState } from "react";
import { computeCptLedger, SECTION_CITE } from "@/lib/engines/cpt-ledger";
import { runDomicileGate } from "@/lib/engines/domicile-gate";
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

// The statuses this flow offers (a curated subset of ImmigrationStatus).
const STATUS_OPTIONS: { value: ImmigrationStatus; label: string }[] = [
  { value: "F1", label: "F-1 (student)" },
  { value: "J1", label: "J-1 (exchange visitor)" },
  { value: "M1", label: "M-1 (vocational)" },
  { value: "LPR", label: "Lawful permanent resident" },
  { value: "citizen", label: "U.S. citizen" },
  { value: "other", label: "Other" },
];

// A handful of states; Virginia is the default because the domicile gate is VA-specific.
const STATE_OPTIONS: { code: string; name: string }[] = [
  { code: "VA", name: "Virginia" },
  { code: "MD", name: "Maryland" },
  { code: "DC", name: "District of Columbia" },
  { code: "NC", name: "North Carolina" },
  { code: "CA", name: "California" },
  { code: "NY", name: "New York" },
  { code: "TX", name: "Texas" },
];

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
  const [state, setState] = useState<string>("VA");
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

  const ledger = computeCptLedger(events);
  const finding: Finding = runDomicileGate({
    student,
    events,
    intentFactors: [],
    allegedEntitlementDate: today,
  });
  const isBlocked = finding.result === "ineligible";

  // Immigration summary: the level closest to the 365-day cliff.
  const closestLevel = ledger.byLevel.length
    ? ledger.byLevel.reduce((a, b) => (b.daysToCliff < a.daysToCliff ? b : a))
    : undefined;

  const stateName = STATE_OPTIONS.find((s) => s.code === state)?.name ?? state;

  return (
    <main className="wrap">
      <div className="topbar">
        <div className="brand">
          <Link href="/" className="logo" style={{ textDecoration: "none" }}>
            Path<span className="dot">Wise</span>
          </Link>
          <span className="tag">check your own status</span>
        </div>
        <Link href="/" className="pill">
          ← Home
        </Link>
      </div>

      <form className="check-form" onSubmit={onSubmit}>
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

        <div className="section-h">Your CPT authorizations</div>
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
          {isBlocked ? (
            <HeroFinding
              studentName="You"
              statusLabel={status}
              residencyCite="SCHEV Pt II §03(A)"
              aidCite="SCHEV VASA"
              voice="second"
            />
          ) : null}

          <div className="section-h">Your three offices, at a glance</div>
          <div className="cards">
            <DomainCard
              domain="Immigration (F-1)"
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
              status={isBlocked ? "Blocked by status" : finding.headline}
              band={RESULT_CARD_BAND[finding.result]}
              detail={
                isBlocked
                  ? "Not an error — a reasoned finding. Student-visa holders cannot establish domicile."
                  : finding.headline
              }
              cite="SCHEV Pt II §03(A)"
            />
            <DomainCard
              domain={`Financial aid (${stateName})`}
              status={isBlocked ? "Blocked by status" : "Not blocked by your status"}
              band={isBlocked ? "red" : "green"}
              detail={
                isBlocked
                  ? "The same status fact makes you ineligible for Virginia state aid. File the FAFSA path instead."
                  : "Your status does not block state aid — other eligibility rules still apply."
              }
              cite="SCHEV VASA"
            />
          </div>

          {ledger.byLevel.length > 0 ? (
            <>
              <div className="section-h">Your CPT ledger, computed live</div>
              {ledger.byLevel.map((l) => (
                <div key={l.level} style={{ marginBottom: 14 }}>
                  <LedgerBar ledger={l} voice="second" />
                </div>
              ))}
            </>
          ) : null}

          <div className="section-h">The full reasoning</div>
          {showReasoning ? (
            <FindingDetail finding={finding} />
          ) : (
            <button
              type="button"
              className="card-more"
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
    </main>
  );
}
