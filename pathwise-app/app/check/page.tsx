"use client";

import { useEffect, useRef, useState } from "react";
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
import { ResultOutlook } from "@/components/ResultOutlook";
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
import { FULLY_MODELLED_NAMES, PARTIALLY_MODELLED_COUNT } from "@/lib/jurisdiction-coverage";
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

/** The pack's own volatility status, written for a reader. Matches FindingDetail's wording. */
const VOLATILITY_LABEL: Record<NonNullable<Finding["volatility"]>["status"], string> = {
  stable: "Stable",
  under_litigation: "Under litigation",
  recently_changed: "Recently changed",
};

/**
 * Each verdict in one or two words, for the spoken summary only.
 *
 * Short on purpose. The announcement exists to tell a reader that their submission was processed
 * and roughly how it came out — not to read them the finding, which is on the screen in full with
 * its citation, its office and its open questions. A live region that recites all of that is one
 * a screen-reader user learns to dread.
 */
const RESULT_WORD: Record<FindingResult, string> = {
  ineligible: "blocked",
  potential_risk: "at risk",
  review_recommended: "needs review",
  unable_to_verify: "unable to verify",
  no_issue: "no issue found",
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
  /**
   * Counts submissions rather than recording that one happened.
   *
   * `submitted` latches true and stays there, so an effect keyed on it fires once and never again —
   * and a reader who changes their state and presses the button a second time would get a silently
   * rewritten page with no movement, no focus change and nothing announced, which is the exact
   * failure this step exists to fix, surviving in the resubmit case. Keyed on a count, every
   * submission moves the reader.
   */
  const [submitCount, setSubmitCount] = useState(0);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

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
    setSubmitCount((n) => n + 1);
  }

  /**
   * Move the reader to the answer.
   *
   * Measured before this existed: pressing "Check my status" moved the viewport 0px, left focus on
   * the button, grew the page by ~1,600px on a phone, and announced nothing — there were no live
   * regions on the page at all. The result rendered below the fold and the app gave no sign it had
   * done anything. For a screen-reader user there was no signal whatsoever.
   *
   * Focusing the result heading does three jobs at once and is why it is preferred over a bare
   * `scrollIntoView`: it scrolls the heading into view, it moves the keyboard position into the
   * result so the next Tab continues there rather than back at the top of the form, and it makes
   * a screen reader read the heading. The heading carries `tabIndex={-1}` so it can receive focus
   * programmatically without ever becoming a Tab stop.
   */
  useEffect(() => {
    if (submitCount === 0) return;
    const heading = resultHeadingRef.current;
    if (!heading) return;

    // Focus and scroll are separated on purpose. `focus()` scrolls only when the element is not
    // already in the viewport, and "in the viewport" includes clinging to the bottom edge: measured
    // at 1440x900, the heading landed at top=801px — visible by that definition, and useless by any
    // other, because the answer began one line above the fold and the reader saw the form they had
    // just submitted. So focus moves the keyboard and the screen reader, and the scroll is asked
    // for explicitly and unconditionally.
    heading.focus({ preventScroll: true });
    // Instant, not smooth: a scroll animation is motion, and this must behave identically under
    // prefers-reduced-motion rather than needing a second code path to switch it off.
    heading.scrollIntoView({ block: "start", behavior: "auto" });
  }, [submitCount]);

  /** Back to the form, focus and all — the exact inverse of what submitting does. */
  function backToForm() {
    const first = document.getElementById("status");
    if (!first) return;
    first.focus({ preventScroll: true });
    (document.querySelector(".check-form") ?? first).scrollIntoView({
      block: "start",
      behavior: "auto",
    });
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
  /**
   * "partial READING", not "partial rules".
   *
   * The old wording was the one piece of terminology on this screen with a real risk in it. A
   * capsule reading "partial rules" beside a jurisdiction's name says the JURISDICTION's rules are
   * partial — that its law is half-written — when what is actually partial is PathWise's reading of
   * it. That is a claim about a state's legal system, made by accident, in two words, on the card
   * that names the state.
   *
   * The capability level it is derived from is unchanged; only the sentence a reader forms from it.
   */
  const qualifierFor = (domain: "residency" | "aid"): string | undefined =>
    levelFor(domain) === "partial" ? "partial reading" : undefined;

  // Not knowing is not a warning. A finding PathWise could not settle is shown neutral rather than
  // amber, so the colour does not claim more than the finding does.
  const toneFor = (f: Finding): StatusKey | undefined =>
    f.result === "unable_to_verify" ? "idle" : undefined;

  // The official source for each domain, from the pack that decides it. Only ever a source PathWise
  // has actually recorded: a registered jurisdiction links its pack's, an unmodelled one links the
  // index entry's where a verified one exists, and neither is invented to fill a gap.
  const residencySource = jx.packs?.domicile.source_url ?? unmodelled?.source_url;
  const aidSource = jx.packs?.aid?.source_url ?? unmodelled?.source_url;

  /**
   * A registered pack that states no status gate at all.
   *
   * The engines now carry this as an open question on the finding itself, but this card renders
   * `headline` and `rule_citation`, not `unknowns` — so without this the honest answer existed in
   * the object and never reached the screen. That gap is the one this project keeps rediscovering,
   * and it is worth stating plainly here: a correct engine is not a correct product.
   *
   * Read off pack STRUCTURE rather than matched against the unknown's wording, so rephrasing that
   * sentence cannot silently switch this off. Empty for Virginia, which states a gate.
   */
  const statusGateUnmodelled = Boolean(jx.packs && jx.packs.domicile.gates.length === 0);


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

  /**
   * What a screen reader is told when the answer arrives — and deliberately nothing more.
   *
   * Three verdicts and a pointer to where the detail is. It names no citation, no deciding office
   * and none of the open questions, because all of those are on the screen in full and a live
   * region that recites them turns every submission into a minute of unskippable speech. The job
   * here is only: your submission was processed, and here is roughly how it came out.
   *
   * Built from the same findings the cards render, so the spoken summary cannot claim something
   * the page does not show.
   */
  const resultSummary = submitted
    ? `Result ready for ${stateName}. ` +
      `Immigration: ${
        closestLevel
          ? `${closestLevel.daysToCliff} days from the CPT cliff`
          : "no CPT authorization on record"
      }. ` +
      `Residency: ${RESULT_WORD[finding.result]}. ` +
      `State financial aid: ${RESULT_WORD[aidFinding.result]}. ` +
      `The full findings, their citations and the offices that decide them are below.`
    : "";

  // ---- The onward path. Assembled here, rendered by <ResultOutlook>. ----
  //
  // Every value below is read off a finding or off a flag this page already computed. Nothing is
  // composed about anyone's law: the two places a sentence is written rather than copied are the
  // coverage gaps, which say only what PathWise has NOT read, and the office rows, which are
  // labels this page already prints on the cards above.

  const outlookOffices = [
    {
      domain: "Immigration (F-1)",
      body: formatDecidingOffice("SEVP"),
      cite: SECTION_CITE,
    },
    {
      domain: `In-state residency (${stateName})`,
      body: formatDecidingBody(finding.deciding_office, jx.packs?.domicile.agencies, "residency"),
      cite: jx.display?.residencyCite,
      sourceUrl: residencySource,
      sourceLabel: residencySource ? `Official ${stateName} source` : undefined,
    },
    {
      domain: `Financial aid (${stateName})`,
      body: formatDecidingBody(aidFinding.deciding_office, jx.packs?.aid?.agencies, "aid"),
      cite: jx.display?.aidCite,
      sourceUrl: aidSource,
      sourceLabel: aidSource ? `Official ${stateName} aid source` : undefined,
    },
  ];

  /**
   * BOTH findings, and that is the whole reason this exists rather than a residency-only list.
   *
   * A jurisdiction modelled in both domains reaches its residency answer at the status gate, which
   * stops the analysis and returns NO unknowns — while its aid finding carries one per missing
   * required item, each with a resolution the aid engine wrote. Wiring only the residency finding
   * would leave the most complete jurisdiction in the product showing an empty section, which is
   * the opposite of the truth about it.
   *
   * Residency first, then aid, matching the card order above so the eye tracks. Deduplicated on
   * `what` in case the two ever raise the same question, first occurrence winning.
   */
  const outlookQuestions = (() => {
    const seen = new Set<string>();
    return [...finding.unknowns, ...aidFinding.unknowns].filter((u) => {
      if (seen.has(u.what)) return false;
      seen.add(u.what);
      return true;
    });
  })();

  // Only where a pack says the rule is moving. A `stable` note is not news, and printing it would
  // train readers to skip the ones that are.
  const outlookVolatility = [
    { label: "Residency rule", v: finding.volatility },
    { label: "State aid rule", v: aidFinding.volatility },
  ]
    .filter((x) => x.v && x.v.status !== "stable")
    .map((x) => ({ label: `${x.label} — ${VOLATILITY_LABEL[x.v!.status]}`, note: x.v!.note }));

  // What this reading did not reach. Every line is about PathWise's coverage, never about the
  // jurisdiction's law — and each is derived from a flag, so a state cannot appear here because
  // someone typed it.
  const outlookNotChecked = [
    unmodelled
      ? `${stateName}'s residency rules — PathWise has not read them.${
          unmodelled.authority ? ` ${unmodelled.authority} decides this.` : ""
        }`
      : "",
    unmodelled?.unverifiable ?? "",
    statusGateUnmodelled
      ? `Whether immigration status affects domicile in ${stateName} — PathWise has not read a status rule for this jurisdiction.`
      : "",
    !aidModelled ? `${stateName}'s state financial aid rules — PathWise has not read them.` : "",
  ].filter(Boolean);

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
          {/* "Residency" is qualified here for a reason particular to this audience: to an
              international student the word already means something else, and an unqualified
              "residency" finding beside an immigration one invites exactly the wrong reading.
              "Domicile" is glossed rather than replaced — it is the term the rules use and the
              term the officer will use, so a reader who meets it here should recognise it there. */}
          <li>
            A finding for each of the three domains — immigration, in-state residency for tuition
            (the rules call it <em>domicile</em>: which state counts as your legal home) and state
            financial aid
          </li>
          <li>The rule behind each one, quoted, with the date PathWise last verified it</li>
          <li>The office that decides it, which is never PathWise</li>
          <li>
            An explicit <strong>&ldquo;not yet read&rdquo;</strong> or{" "}
            <strong>&ldquo;unable to verify&rdquo;</strong> wherever the rules or your record cannot
            settle the question —{" "}
            {FULLY_MODELLED_NAMES.length === 1 ? FULLY_MODELLED_NAMES[0] : "some states"}{" "}
            {FULLY_MODELLED_NAMES.length === 1 ? "is" : "are"} modelled in full
            {PARTIALLY_MODELLED_COUNT > 0
              ? `, ${PARTIALLY_MODELLED_COUNT} more partially`
              : ""}
            , and for the rest this will say so plainly and link the office that does decide rather
            than guess
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
        {/* Four blank date fields with no explanation is a question a reader cannot tell whether
            they are required to answer. Most people arriving here have no CPT at all, and the
            immigration finding is the one that suffers in silence for it: with nothing entered the
            ledger has nothing to count, which is correct and looks identical to the form being
            broken. Saying both things — optional, and what it buys — costs one line. */}
        <p className="field-note">
          Optional. CPT is work authorization tied to your programme; full-time CPT is what counts
          against the 365-day cliff that ends OPT eligibility. Leave this blank if you have had
          none — PathWise will say it has no CPT on record rather than assume you have none.
        </p>
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

      {/* Rendered on every pass, empty until there is something to say.
          A live region that is added to the page at the same moment its text appears is a region
          assistive tech was not yet watching, and the announcement is missed. This one is always
          present and only its contents change, which is the form that reliably speaks. It is
          `sr-only` because the summary it carries is a spoken restatement of what is already on
          screen; showing it too would be saying everything twice. */}
      <p className="sr-only" role="status" aria-live="polite">
        {resultSummary}
      </p>

      {submitted ? (
        <>
          {/* The focus target, and the top of the answer. Before this the result began with a
              status card and no heading at all, so there was nothing for a heading-navigation
              user to jump to and nothing for focus to land on. `tabIndex={-1}` lets it receive
              focus programmatically without becoming a Tab stop for everyone else. */}
          {/* The way back to the form. Once a result rendered there was no route to revising it:
              the form was still on the page, above a result that had just scrolled the reader past
              it, and nothing said so. A reader who picked the wrong state had to work out for
              themselves that scrolling up was the answer.
              It focuses the first field rather than only scrolling, so the keyboard goes back to
              the form too — the mirror of what submitting does. */}
          <div className="check-result-head-row">
            <h2 className="check-result-head" tabIndex={-1} ref={resultHeadingRef}>
              Your result — {stateName}
            </h2>
            <button type="button" className="btn-link check-again" onClick={backToForm}>
              Change my answers
            </button>
          </div>

          {/* HOW THIS WAS ROUTED — the one piece of PathWise's architecture that decides whether any
              citation on this page is attributable, and it had no representation anywhere in the
              product.
              The resolver runs before a single rule is read: it takes the state off the student's
              own record and either returns that jurisdiction's packs or returns nothing. A state
              with no pack cannot reach an engine, which is what stops one state's arithmetic
              printing under another state's heading. That guarantee was stated in code comments and
              in the coverage map's prose; here it is stated where it actually applies — above the
              answer it produced, naming the files that produced it.
              Every value is read off the resolved context. Nothing is composed about anyone's law. */}
          <div className="routing" aria-label="How this reading was routed">
            <span className="routing-k">Routed</span>
            <span className="routing-v">
              <strong>{stateName}</strong>
              {jx.packs ? (
                <>
                  {" — "}
                  {jx.packs.aid ? "two rule packs" : "one rule pack"} loaded
                  {": "}
                  <span className="cite">{jx.packs.domicile.pack_id}</span>
                  {jx.packs.aid ? (
                    <>
                      {" "}
                      <span className="cite">{jx.packs.aid.pack_id}</span>
                    </>
                  ) : null}
                  . Verified {jx.packs.domicile.verified_on}.
                  {!jx.packs.aid
                    ? ` No aid pack is registered for ${stateName}, so no state-aid rule was read.`
                    : ""}
                </>
              ) : (
                <>
                  {" — no rule pack is registered, so PathWise ran no "}
                  {stateName} engine and reached no {stateName} verdict.
                  {unmodelled?.authority ? ` ${unmodelled.authority} decides this.` : ""}
                </>
              )}
            </span>
          </div>

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
          {/* `check-cards` scopes the arrival stagger to THIS screen. The dashboard renders the same
              component and must not animate: there the cards are simply the state of a record the
              reader navigated to, where here they are the output of a computation they just asked
              for, and the stagger is what says so. */}
          <div className="domain-cards check-cards">
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
              domain={`In-state residency (${stateName})`}
              decidingOffice={formatDecidingBody(finding.deciding_office, jx.packs?.domicile.agencies, 'residency')}
              status={
                // "Not modelled" is how the packs and the coverage map talk about themselves, and
                // it is the right word there. On a card a student is reading about their own state
                // it is developer vocabulary: "modelled" invites "modelled how?", where "read"
                // says plainly what has and has not happened.
                unmodelled
                  ? "Not yet read by PathWise"
                  : isBlocked
                    ? "Blocked by status"
                    : finding.headline
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
                    : statusGateUnmodelled
                      ? // Says what this reading did NOT check. Without it, a gateless jurisdiction
                        // tells an F-1 student "duration appears satisfied" and says nothing at all
                        // about visa status — while a gated one, on the same fact and the same
                        // screen, says "blocked". The silence then reads as "status doesn't matter
                        // here", a legal claim PathWise has never made and has no source for.
                        `${finding.headline}. PathWise has not modelled whether immigration status ` +
                        `affects domicile in ${stateName}, so this answers the durational and intent ` +
                        `questions only — not whether your status itself bars it.`
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
            /* BOTH findings, not one.
               This rendered the residency finding alone. The aid finding was computed on the very
               same pass — its reasoning chain, its citation, its deciding office — and thrown away,
               while its `unknowns` were correctly carried into the outlook below. So a reader who
               asked to see the reasoning behind "the same status fact closes this door too" was
               shown the reasoning for the OTHER door and no indication that anything was missing.
               Each is labelled, because two findings under one heading with no divider is how the
               residency rule and the aid rule get read as one argument. */
            <div className="stack-gap">
              <div>
                <h3 className="reasoning-sub">In-state residency — {stateName}</h3>
                <FindingDetail
                  finding={finding}
                  events={events}
                  agencies={jx.packs?.domicile.agencies}
                  packId={jx.packs?.domicile.pack_id}
                />
              </div>
              <div>
                <h3 className="reasoning-sub">State financial aid — {stateName}</h3>
                <FindingDetail
                  finding={aidFinding}
                  events={events}
                  agencies={jx.packs?.aid?.agencies}
                  packId={jx.packs?.aid?.pack_id}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="domain-card-more btn-link"
              onClick={() => setShowReasoning(true)}
            >
              See full reasoning for both →
            </button>
          )}

          {/* Last on the page, and deliberately not the focus target — focus goes to the result
              heading above, and this is where a reader arrives after reading the answer. */}
          <ResultOutlook
            offices={outlookOffices}
            openQuestions={outlookQuestions}
            volatility={outlookVolatility}
            notChecked={outlookNotChecked}
            exampleHref="/student"
          />
        </>
      ) : null}

      <footer className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · PathWise reasons on
        your device. Every finding shows its regulation and the office that decides it. PathWise advises;
        the office decides.
      </footer>
    </>
  );
}
