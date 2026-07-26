"use client";

// What Changed? — the signature demo beat: PathWise visibly re-reasoning when evidence lands.
//
// The scenario is a real ambiguity inside Priya's own record, not an invented one. Her 210
// full-time CPT days at School X only stay OUT of her master's count if the level change from
// School X (bachelor's) to School Y (master's) is established. The document that records it is
// missing, so the partition can't be relied on.
//
// Nothing on this screen is authored. The SAME engine (computeCptLedger) is run twice over the
// SAME authorizations, and only the evidence differs:
//
//   reading A — level change established: School X's days sit at the bachelor's level
//   reading B — level change unproven:    they can't be partitioned out of the level under review
//
// The two readings land on opposite sides of the 365-day cliff — one keeps OPT, one loses it — so
// while the document is missing the finding is honestly "unable to verify". That gray state is
// DERIVED from the disagreement between the two engine runs; it is not hard-coded. Add the
// document and reading B falls away, so the count becomes determinate and the finding recomputes.

import Link from "next/link";
import { useState } from "react";
import { computeCptLedger, CLIFF_DAYS, type LedgerBand } from "@/lib/engines/cpt-ledger";
import { priyaEvents } from "@/lib/fixtures/priya";
import type { Event } from "@/lib/types";

type StatusKey = "verified" | "attention" | "blocked" | "unknown";

// The one status vocabulary, same as every other screen: icon + word + color, never color alone.
const STATUS: Record<StatusKey, { icon: string; word: string }> = {
  verified: { icon: "✓", word: "On track" },
  attention: { icon: "◐", word: "Attention" },
  blocked: { icon: "●", word: "Blocked" },
  unknown: { icon: "?", word: "Unable to verify" },
};

const BAND_STATUS: Record<LedgerBand, StatusKey> = {
  green: "verified",
  amber: "attention",
  red: "blocked",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

// ---- the missing evidence, and the timeline event it establishes ----

const MISSING_DOC = {
  label: "Form I-20 recording the level change",
  detail: "School X (bachelor's) → School Y (master's), issued for the master's program",
};

const LEVEL_CHANGE: Event = {
  id: "level-change-x-to-y",
  type: "level_change",
  date: "2024-01-16", // the master's program start at School Y
  institution_id: "schoolY",
  program_level: "masters",
  attrs: { from_level: "bachelors", from_institution: "schoolX" },
  evidence_ids: ["i20-level-change"],
  confidence: "confirmed",
};

// ---- the two readings, both computed by the real engine ----

// Reading A — the level change is established, so the record stands as written: School X's
// authorizations are counted at the bachelor's level and kept out of the master's ledger.
const settledEvents: Event[] = [...priyaEvents, LEVEL_CHANGE];

// Reading B — nothing on file establishes that School X's program sat at a different education
// level, so its authorizations can't be partitioned out of the level under review. Same events,
// same engine, same authorized periods; only the level attribution differs.
const pooledEvents: Event[] = priyaEvents.map((e) =>
  e.type === "cpt_auth" ? { ...e, program_level: "masters" as const } : e
);

const settled = computeCptLedger(settledEvents).forLevel("masters")!;
const pooled = computeCptLedger(pooledEvents).forLevel("masters")!;
const bachelors = computeCptLedger(settledEvents).forLevel("bachelors")!;

// The readings disagree about the outcome that actually matters. THIS is why the before-state is
// gray: the evidence on record cannot settle which answer is true.
const readingsDisagree = settled.optEligible !== pooled.optEligible || settled.band !== pooled.band;

const beforeStatus: StatusKey = readingsDisagree ? "unknown" : BAND_STATUS[settled.band];
const afterStatus: StatusKey = BAND_STATUS[settled.band];

const beforeLine = readingsDisagree
  ? `Between ${settled.fullTimeDays} and ${pooled.fullTimeDays} full-time CPT days count at the master's level — and the ${CLIFF_DAYS}-day cliff sits between the two answers.`
  : `${settled.fullTimeDays} of ${CLIFF_DAYS} full-time CPT days count at the master's level.`;

const afterLine = `${settled.fullTimeDays} of ${CLIFF_DAYS} full-time CPT days count at the master's level — ${settled.daysToCliff} days of margin, and OPT at this level is still available.`;

const cptCount = priyaEvents.filter((e) => e.type === "cpt_auth").length;

// Every line below is read off the two ledger runs above — including the counts and the state names.
const CHANGES: { k: string; v: string }[] = [
  {
    k: "Timeline updated",
    v: `Level change added on ${fmtDate(LEVEL_CHANGE.date)}: School X (bachelor's) → School Y (master's). Her record goes from ${priyaEvents.length} events to ${settledEvents.length}.`,
  },
  {
    k: "CPT ledger updated",
    v: `${bachelors.fullTimeDays} bachelor's-level days move out of the master's count: ${pooled.fullTimeDays} → ${settled.fullTimeDays} full-time days, of which ${settled.overlapDays} still come from two part-time authorizations that overlapped.`,
  },
  {
    k: "Evidence linked",
    v: `One document now sits under the level change — and through it, under all ${cptCount} CPT authorizations whose level it settles.`,
  },
  {
    k: "Analysis recalculated",
    v: `The finding moves from "${STATUS[beforeStatus].word}" to "${STATUS[afterStatus].word}": one answer with ${settled.daysToCliff} days of margin, instead of two answers on opposite sides of the cliff.`,
  },
];

function Chip({ status }: { status: StatusKey }) {
  return (
    <span className={`statuschip ${status}`}>
      <span className="ic" aria-hidden="true">
        {STATUS[status].icon}
      </span>
      {STATUS[status].word}
    </span>
  );
}

export default function ChangedPage() {
  const [added, setAdded] = useState(false);

  return (
    <main className="wrap">
      <div className="topbar">
        <div className="brand">
          <Link href="/" className="logo" style={{ textDecoration: "none" }}>
            Path<span className="dot">Wise</span>
          </Link>
          <span className="tag">what changed, and why</span>
        </div>
        <Link href="/student" className="pill" style={{ textDecoration: "none" }}>
          ← Back to dashboard
        </Link>
      </div>

      <div className="jintro">
        <div className="jintro-eyebrow">What changed?</div>
        <h1>One document arrives. Watch PathWise re-reason.</h1>
        <p>
          Priya&apos;s bachelor&apos;s CPT at School X only stays out of her master&apos;s count if the
          level change between the two schools is established. The document that records it is
          missing — so PathWise runs the count both ways, finds that the two answers fall on opposite
          sides of the {CLIFF_DAYS}-day cliff, and says so rather than guessing.
        </p>
        <div className="jstats">
          <span className="jstat">
            <strong>1</strong> finding affected
          </span>
          <span className="jstat">
            <strong>{cptCount}</strong> authorizations re-counted
          </span>
          <span className="jstat">
            <strong>{pooled.fullTimeDays - settled.fullTimeDays}</strong> days in dispute
          </span>
        </div>
      </div>

      <div className={`wc-gap${added ? " done" : ""}`}>
        <div className="wc-gap-head">
          <div>
            <Chip status={added ? "verified" : "unknown"} />
            <h2 className="wc-gap-title">
              {added
                ? "The level change is on the record."
                : "We couldn't verify this yet — and we won't guess."}
            </h2>
          </div>
          {!added ? (
            <button className="btn" onClick={() => setAdded(true)}>
              Add the missing document
            </button>
          ) : (
            <button className="wc-undo" onClick={() => setAdded(false)}>
              Take the document back out
            </button>
          )}
        </div>

        <div className="wc-gap-rows">
          <div className="wc-gap-k">{added ? "Added" : "What's missing"}</div>
          <div className="wc-gap-v">
            {MISSING_DOC.label} — {MISSING_DOC.detail}.
          </div>

          <div className="wc-gap-k">Why it matters</div>
          <div className="wc-gap-v">
            The CPT cap is counted per education level, so this one fact decides whether{" "}
            {bachelors.fullTimeDays} days from School X land in her master&apos;s ledger or stay out of
            it. <span className="cite">8 CFR 214.2(f)(10)</span>
          </div>

          <div className="wc-gap-k">{added ? "What happened" : "What she can do"}</div>
          <div className="wc-gap-v">
            {added
              ? "The document was read on this device, linked to the level change, and every finding that rests on it was recomputed."
              : "Upload the master's I-20, or ask her DSO to confirm the level change in SEVIS."}
          </div>
        </div>
      </div>

      <div className="section-h">Before → after</div>

      <div className="wc-grid">
        <div className="wc-panel">
          <div className="wc-when">Before</div>
          <div className="wc-panel-head">
            <Chip status={beforeStatus} />
            <span className="wc-sub">CPT count · master&apos;s level</span>
          </div>
          <div className="wc-result">{beforeLine}</div>

          <div className="wc-readings">
            <div className="wc-reading">
              <div className="wc-reading-k">
                If the level change holds
                <Chip status={BAND_STATUS[settled.band]} />
              </div>
              <div className="wc-reading-v">
                {settled.fullTimeDays} / {CLIFF_DAYS} days · OPT at the master&apos;s level preserved
              </div>
            </div>
            <div className="wc-reading">
              <div className="wc-reading-k">
                If it can&apos;t be shown
                <Chip status={BAND_STATUS[pooled.band]} />
              </div>
              <div className="wc-reading-v">
                {pooled.fullTimeDays} / {CLIFF_DAYS} days · OPT at this level would be gone
              </div>
            </div>
          </div>

          <div className="wc-sub" style={{ marginTop: 12 }}>
            Both numbers come from the same engine, run over the same authorizations. PathWise can&apos;t
            choose between them without the document.
          </div>
        </div>

        <div className="wc-arrow" aria-hidden="true">
          →
        </div>

        {added ? (
          <div className="wc-panel wc-fade">
            <div className="wc-when">After</div>
            <div className="wc-panel-head">
              <Chip status={afterStatus} />
              <span className="wc-sub">CPT count · master&apos;s level</span>
            </div>
            <div className="wc-result">{afterLine}</div>

            <ul className="wc-facts">
              <li className="wc-fact">
                <span>Counted at the master&apos;s level</span>
                <strong>{settled.fullTimeDays} days</strong>
              </li>
              <li className="wc-fact">
                <span>Of those, days created by overlapping part-time CPT</span>
                <strong>{settled.overlapDays} days</strong>
              </li>
              <li className="wc-fact">
                <span>Kept out — School X, bachelor&apos;s level</span>
                <strong>{bachelors.fullTimeDays} days</strong>
              </li>
              <li className="wc-fact">
                <span>Margin before the {CLIFF_DAYS}-day cliff</span>
                <strong>{settled.daysToCliff} days</strong>
              </li>
              <li className="wc-fact">
                <span>OPT at the master&apos;s level</span>
                <strong>{settled.optEligible ? "Still available" : "Gone"}</strong>
              </li>
            </ul>

            <div className="wc-sub" style={{ marginTop: 12 }}>
              One reading survives, so the count is determinate. She is still close to the cliff — that
              part is a finding, not a gap. <span className="cite">8 CFR 214.2(f)(10)(i)</span>
            </div>
          </div>
        ) : (
          <div className="wc-panel pending">
            <div className="wc-when">After</div>
            <div className="wc-pending-note">
              Nothing to recompute yet. The count stays open until the evidence lands — PathWise holds
              the question rather than picking an answer.
            </div>
          </div>
        )}
      </div>

      {added ? (
        <div className="wc-fade">
          <div className="section-h">What changed</div>
          <ul className="wc-changes">
            {CHANGES.map((c) => (
              <li className="wc-change" key={c.k}>
                <span className="wc-check" aria-hidden="true">
                  ✓
                </span>
                <span>
                  <span className="wc-change-k">{c.k}</span>
                  <span className="wc-change-v">{c.v}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="wc-why">
            <div className="wc-why-k">Why did this change?</div>
            <div className="wc-why-v">
              The rule didn&apos;t change. The {CLIFF_DAYS}-day cliff and the per-level partition are
              the same rule, cited the same way, before and after{" "}
              <span className="cite">8 CFR 214.2(f)(10)</span>. What changed is the evidence: the new
              document establishes the level change, so School X&apos;s{" "}
              {bachelors.fullTimeDays} bachelor&apos;s-level days can be attributed to a different
              level and kept out of the master&apos;s count. One of the two readings is now ruled out,
              so the analysis has one answer where it had two.
            </div>
            <div className="wc-why-v">
              Both states on this page are computed by the same ledger engine over the same authorized
              periods — {settled.fullTimeDays} days with the level change established,{" "}
              {pooled.fullTimeDays} without. Nothing here is a stored result, and the recomputation
              happened on this device. PathWise advises; the DSO decides.
            </div>
          </div>

          <Link href="/student" className="memorystrip" style={{ marginTop: 18 }}>
            <span>
              <span className="ms-k">Her dashboard now reads the settled count.</span> Same record,
              same engines, one fewer open question.
            </span>
            <span className="ms-go">Back to Priya&apos;s standing →</span>
          </Link>
        </div>
      ) : null}

      <div className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · The document is
        never uploaded anywhere — the re-computation runs on this device. Every finding shows its
        regulation and the office that decides it.
      </div>
    </main>
  );
}
