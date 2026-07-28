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
import { formatDecidingBody, formatDecidingOffice } from "@/lib/format";
import {
  aidFindingFor,
  aidFormFor,
  jurisdictionFor,
  residencyFindingFor,
} from "@/lib/engines/jurisdiction";
import type { StatusKey } from "@/lib/tokens";
import type { CapabilityLevel } from "@/lib/rulepacks/schema";
import { JURISDICTIONS } from "@/lib/coverage";
import { MODELLED_NAMES } from "@/lib/jurisdiction-coverage";
import { assertDefaultIsRegistered, DEFAULT_CHECK_JURISDICTION } from "@/lib/rulepacks";

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

// The form opens on the jurisdiction that gives the fullest demonstration, named explicitly in the
// registry rather than picked off the front of a list. This was `MODELLED_CODES[0]`, which is
// coverage-file order — alphabetical — so registering Tennessee and Texas silently moved the default
// from Virginia to Tennessee, and a visitor's first check went from the cross-domain finding to
// "PathWise has not modelled Tennessee state aid rules". See DEFAULT_CHECK_JURISDICTION.
assertDefaultIsRegistered();
const DEFAULT_STATE = DEFAULT_CHECK_JURISDICTION;

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
  // The date continuous presence in the chosen state began. Optional, and empty by default: absent
  // means the durational clock has nothing to start from, which is the honest answer and the one
  // the engines already give. Supplying it is what lets a state whose rule counts continuous
  // presence actually run its clock — see the intentFactors note below.
  const [presenceSince, setPresenceSince] = useState<string>("");
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
    // The one intent fact this form can honestly collect.
    //
    // It was hardcoded to `[]`, which meant no jurisdiction's durational clock could ever start
    // here: a state that counts from continuous presence returned "no qualifying intent factors on
    // record" no matter what the visitor typed, so its rule was unreachable through the UI.
    //
    // `continuous_residence` is the id BOTH registered domicile packs weigh, so this is the pack's
    // own vocabulary rather than a term coined for the form. It stays FAIL-CLOSED: an empty date
    // contributes no factor at all, and a jurisdiction whose pack does not weigh continuous
    // residence gets a factor it does not recognise, which changes nothing. Nothing is inferred and
    // no date is defaulted.
    intentFactors: presenceSince ? [{ id: "continuous_residence", date: presenceSince }] : [],
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

  // Whether PathWise has AID rules for this jurisdiction, as opposed to any rules at all.
  //
  // `jx.unmodelled` is set only when a jurisdiction has NO packs, and every branch on this page used
  // it as though it meant "no aid rules". Phase 6 made `aid` optional per jurisdiction — Tennessee
  // and Texas ship residency rules and no aid rules — and those two fell straight through the gap:
  // the card printed "PathWise has not modelled Tennessee state aid rules" as its status and
  // "Your status does not block state aid" as its detail, on the same card. A negative regulatory
  // claim about a rule PathWise has never read is the worst thing this product can say, and it was
  // saying it with no citation attached.
  const aidModelled = Boolean(jx.packs?.aid);

  // How far each domain has actually been carried here, read off the pack's own declared capability.
  // Nothing below names a state: a jurisdiction that declares `partial` says so on its own card, and
  // one that declares `modelled` says nothing extra.
  const levelFor = (domain: "residency" | "aid"): CapabilityLevel | undefined => {
    const packs = jx.packs;
    if (!packs) return undefined;
    const source = domain === "residency" ? packs.domicile : packs.aid;
    return source?.capabilities.find((c) => c.domain === domain)?.level;
  };
  const qualifierFor = (domain: "residency" | "aid"): string | undefined =>
    levelFor(domain) === "partial" ? "partial rules" : undefined;

  // Not knowing is not a warning. A finding PathWise could not settle is shown neutral rather than
  // amber, so the colour does not claim more than the finding does.
  const toneFor = (f: Finding): StatusKey | undefined =>
    f.result === "unable_to_verify" ? "idle" : undefined;

  // The official source for each domain, from the pack that decides it. Only ever a source PathWise
  // has actually recorded: a registered jurisdiction links its pack's, an unmodelled one links the
  // index entry's where a verified one exists, and neither is invented to fill a gap.
  const residencySource = jx.packs?.domicile.source_url ?? unmodelled?.source_url;
  const aidSource = jx.packs?.aid?.source_url ?? unmodelled?.source_url;

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
      {/* This screen used to open on a bare form: two dropdowns, four date fields, no heading and no
          statement of what came back. A visitor was being asked to type their immigration status
          into something that had not yet said what it would do with it — which, for this population
          in particular, is the point at which a tab gets closed. */}
      <div className="jintro surface">
        <div className="jintro-eyebrow">Check your status</div>
        <h2>Run the same engines over your own facts.</h2>
        <p>
          Enter your status, your state and any CPT you have been authorized for. PathWise reads them
          against the rules it has actually modelled and answers in the same form it answers for the
          example student.
        </p>
        <ul className="check-expect">
          <li>A finding for each of the three domains — immigration, residency and state aid</li>
          <li>The rule behind each one, quoted, with the date PathWise last verified it</li>
          <li>The office that decides it, which is never PathWise</li>
          <li>
            An explicit <strong>&ldquo;not modelled&rdquo;</strong> or{" "}
            <strong>&ldquo;unable to verify&rdquo;</strong> wherever the rules or your record cannot
            settle the question — {MODELLED_NAMES.length === 1 ? MODELLED_NAMES[0] : "some states"}{" "}
            {MODELLED_NAMES.length === 1 ? "is" : "are"} fully modelled, and for the rest this will
            say so plainly and link the office that does decide rather than guess
          </li>
        </ul>
        <p className="check-privacy">
          Nothing you type leaves your device. There is no account, no server and no request — the
          reasoning runs in this tab.
        </p>
      </div>

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
          {/* Optional, and the only intent fact this form can honestly collect. States differ in
              what they count it FROM — one counts from the last act showing intent, another from
              the start of continuous presence — so the same date produces different answers and
              PathWise dispatches on the jurisdiction's own rule rather than a shared one. Leave it
              blank and no durational clock starts, which is the honest result and not a failure. */}
          <div className="field">
            <label htmlFor="presence">Continuous residence began (optional)</label>
            <input
              id="presence"
              type="date"
              value={presenceSince}
              onChange={(e) => setPresenceSince(e.target.value)}
            />
          </div>
        </div>
        <p className="field-note">
          States count a durational requirement from different starting points, so that one date can
          give different answers in different states. Left blank, no clock starts — PathWise reports
          that rather than assuming a date.
        </p>

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
              residencyOffice={formatDecidingBody(finding.deciding_office, jx.packs?.domicile.agencies, 'residency')}
              aidCite={jx.display?.aidCite ?? ""}
              aidOffice={formatDecidingBody(aidFinding.deciding_office, jx.packs?.aid?.agencies, 'aid')}
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
              decidingOffice={formatDecidingBody(finding.deciding_office, jx.packs?.domicile.agencies, 'residency')}
              status={
                unmodelled ? "Not modelled by PathWise" : isBlocked ? "Blocked by status" : finding.headline
              }
              band={RESULT_CARD_BAND[finding.result]}
              tone={toneFor(finding)}
              qualifier={qualifierFor("residency")}
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
              // Linked for every jurisdiction PathWise has a recorded source for, not only the ones
              // it has no rules for. A registered pack carries the source it was authored against,
              // and a reader who wants to check the citation should not have to leave the page to
              // find where it came from.
              detailHref={residencySource}
              detailLabel={residencySource ? `Official ${stateName} source →` : undefined}
            />
            <DomainCard
              domain={`Financial aid (${stateName})`}
              decidingOffice={formatDecidingOffice("financial_aid")}
              // The finding's own headline in every case. It already says the right thing for all
              // three — the block, or that the rules are not modelled, naming the state — so there
              // is no branch here to get wrong.
              status={aidFinding.headline}
              band={RESULT_CARD_BAND[aidFinding.result]}
              tone={toneFor(aidFinding)}
              qualifier={qualifierFor("aid")}
              detail={
                // Three states, because there are three. The middle one is the one that was missing.
                !aidModelled
                  ? [
                      `PathWise has not read ${stateName}'s state-aid rules, so it cannot say whether your status opens or closes that door — in either direction.`,
                      unmodelled
                        ? `State aid usually rides on the state's own residency determination, which PathWise has not modelled for ${stateName}.`
                        : `Residency in ${stateName} is modelled; state aid is not, and the two are decided separately.`,
                      `This says nothing either way about federal aid.`,
                    ].join(" ")
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
                    : // Reachable only with an aid pack behind it, so `aidForm` is always present
                      // here and the old "Your status does not block state aid" fallback — which is
                      // what leaked out for Tennessee and Texas — has nothing left to fall back to.
                      `${aidForm?.label ?? aidFinding.headline} — but PathWise has none of your deadlines or evidence on record, so this is not a clearance. See the full reasoning for what is still open.`
              }
              cite={jx.display?.aidCite}
              detailHref={aidSource}
              detailLabel={aidSource ? `Official ${stateName} aid source →` : undefined}
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
            <FindingDetail finding={finding} events={events} agencies={jx.packs?.domicile.agencies} />
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
