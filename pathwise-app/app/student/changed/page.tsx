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
//
// The evidence is real. A file the student picks is read in this tab — its bytes counted and
// fingerprinted — and a real Evidence record is built from that read. What PathWise cannot do is
// read the WORDS in the document, so it does not pretend to: the level change is attested by the
// student, and the event it produces is marked `asserted` rather than `confirmed`.

import Link from "next/link";
import { useRef, useState } from "react";
import {
  CLIFF_CITE,
  CLIFF_DAYS,
  SECTION_CITE,
  type LedgerBand,
} from "@/lib/engines/cpt-ledger";
import { cptLevelChangeReadings } from "@/lib/readings";
import { priyaEvents } from "@/lib/fixtures/priya";
import { UncertaintyBand } from "@/components/UncertaintyBand";
import type { Event, Evidence, LocalFileRead } from "@/lib/types";
import {
  LEVEL_CHANGE_DOC_TYPE,
  describeRead,
  evidenceFromLocalRead,
  formatBytes,
  levelChangeEventFromEvidence,
  shortHash,
} from "@/lib/evidence";
import { makeSampleDocument, readLocalFile } from "@/lib/evidence-read";
import { StatusGlyph } from "@/components/StatusGlyph";
import type { StatusKey as GlyphStatus } from "@/lib/tokens";

type StatusKey = "verified" | "attention" | "blocked" | "unknown";

// The one status vocabulary, same as every other screen: glyph + word + color, never color alone.
const STATUS: Record<StatusKey, { glyph: GlyphStatus; word: string }> = {
  verified: { glyph: "done", word: "On track" },
  attention: { glyph: "warn", word: "Attention" },
  blocked: { glyph: "blocked", word: "Blocked" },
  unknown: { glyph: "idle", word: "Unable to verify" },
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

// ---- the missing evidence ----

const MISSING_DOC = {
  label: "Form I-20 recording the level change",
  detail: "School X (bachelor's) → School Y (master's), issued for the master's program",
};

// What the student is asked to attest, spelled out so the assertion is never implied. Kept in the
// page's third-person voice for the example student — the microcopy rule is second person only for
// the reader's own data.
const ATTESTATION =
  "This document records the level change from bachelor's at School X to master's at School Y.";

// ---- the two readings, both computed by the real engine ----

// The two readings, derived in lib/readings.ts so the landing hero and this screen cannot disagree
// about the one finding PathWise refuses to make. Both call the same function; neither computes it.
//
// Worth being exact about what the evidence does here. The ledger reads `cpt_auth` events only, so
// attaching the level-change event does not move a single day of arithmetic — reading A is the
// record as written either way. What the document settles is WHICH READING APPLIES: without it both
// survive and the finding is honestly indeterminate; with it reading B is ruled out and one answer
// is left. That is why the numbers below are identical before and after, and why the finding still
// changes.
//
// `readingsDisagree` is why the before-state is gray: the evidence on record cannot settle which
// answer is true. It is derived, not declared.
const { settled, pooled, bachelors, disagree: readingsDisagree } = cptLevelChangeReadings();

const beforeStatus: StatusKey = readingsDisagree ? "unknown" : BAND_STATUS[settled.band];
const afterStatus: StatusKey = BAND_STATUS[settled.band];

const beforeLine = readingsDisagree
  ? `Between ${settled.fullTimeDays} and ${pooled.fullTimeDays} full-time CPT days count at the master's level — and the ${CLIFF_DAYS}-day cliff sits between the two answers.`
  : `${settled.fullTimeDays} of ${CLIFF_DAYS} full-time CPT days count at the master's level.`;

const afterLine = `${settled.fullTimeDays} of ${CLIFF_DAYS} full-time CPT days count at the master's level — ${settled.daysToCliff} days of margin, and OPT at this level is still available.`;

const cptCount = priyaEvents.filter((e) => e.type === "cpt_auth").length;

/**
 * The change list, built from the two ledger runs AND from the evidence that was actually read —
 * so every line names a real file, a real id and real counts rather than a description of them.
 */
function buildChanges(
  evidence: Evidence,
  levelChange: Event,
  settledEventCount: number,
): { k: string; v: string }[] {
  const read = evidence.local;
  return [
    {
      k: "Timeline updated",
      v: `Level change added on ${fmtDate(levelChange.date)}: School X (bachelor's) → School Y (master's). Her record goes from ${priyaEvents.length} events to ${settledEventCount}.`,
    },
    {
      k: "CPT ledger updated",
      v: `${bachelors.fullTimeDays} bachelor's-level days stay out of the master's count: the reading that pooled them at ${pooled.fullTimeDays} days is ruled out, leaving ${settled.fullTimeDays} full-time days — of which ${settled.overlapDays} still come from ${settled.overlapConcurrentAuths} part-time authorizations that overlapped.`,
    },
    {
      k: "Evidence linked",
      // The file is described by what it IS — type, name, size, fingerprint — not by the internal
      // id it was filed under, which told a reader nothing they could use.
      v: read
        ? `${evidence.doc_type} · ${evidence.file_ref} (${formatBytes(read.sizeBytes)}${
            shortHash(read) ? `, SHA-256 ${shortHash(read)}…` : ""
          }) is on record, and sits under the level change — and through it, under all ${cptCount} CPT authorizations whose level it settles.`
        : `The document sits under the level change, and through it under all ${cptCount} CPT authorizations whose level it settles.`,
    },
    {
      k: "Analysis recalculated",
      v: `The finding moves from "${STATUS[beforeStatus].word}" to "${STATUS[afterStatus].word}": one answer with ${settled.daysToCliff} days of margin, instead of two answers on opposite sides of the cliff.`,
    },
  ];
}

function Chip({ status }: { status: StatusKey }) {
  return (
    <span className={`statuschip ${status}`}>
      <StatusGlyph status={STATUS[status].glyph} />
      {STATUS[status].word}
    </span>
  );
}

/** The facts that came back from the read — every one of them measured, none of them described. */
function ReadFacts({ read }: { read: LocalFileRead }) {
  const hash = shortHash(read);
  return (
    <div className="wc-ev-read">
      <div className="wc-ev-file">
        <span className="wc-ev-name">{read.fileName}</span>
        {read.origin === "sample" ? (
          <span className="wc-ev-sample">Sample document — generated in your browser</span>
        ) : null}
      </div>
      <dl className="wc-ev-facts">
        <div>
          <dt>Bytes read</dt>
          <dd>{formatBytes(read.sizeBytes)}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{read.mimeType}</dd>
        </div>
        {read.lastModified ? (
          <div>
            <dt>Last modified</dt>
            <dd>{fmtDate(read.lastModified)}</dd>
          </div>
        ) : null}
        <div className="wc-ev-hash">
          <dt>SHA-256</dt>
          <dd>{hash ? `${hash}…` : "not available on an insecure origin — not fabricated"}</dd>
        </div>
      </dl>
      <p className="wc-ev-note">
        PathWise read the file, not the words inside it. There is no text extraction here and nothing
        left the tab — the bytes were counted, fingerprinted, and released.
      </p>
    </div>
  );
}

export default function ChangedPage() {
  const [read, setRead] = useState<LocalFileRead | null>(null);
  const [attestChecked, setAttestChecked] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // A real Evidence record, built from a real read. Null until a file has actually been read.
  const evidence = read ? evidenceFromLocalRead(read, { docType: LEVEL_CHANGE_DOC_TYPE }) : null;
  const levelChange = evidence ? levelChangeEventFromEvidence(evidence) : null;
  const settledEvents: Event[] = levelChange ? [...priyaEvents, levelChange] : priyaEvents;

  // The finding only moves once BOTH have happened: the file was read, and the student committed to
  // what it records. Reading a file PathWise cannot interpret is not, by itself, evidence of
  // anything — so ticking the box arms the action, and the action is a separate, deliberate click.
  const added = evidence !== null && committed;

  async function ingest(file: File, origin: LocalFileRead["origin"]) {
    setBusy(true);
    setError(null);
    try {
      setRead(await readLocalFile(file, origin));
      setAttestChecked(false);
      setCommitted(false);
    } catch {
      setError("That file could not be read in this browser. Try another one.");
      setRead(null);
    } finally {
      setBusy(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Cleared so picking the same file twice still fires a change event.
    e.target.value = "";
    if (file) void ingest(file, "picked");
  }

  function reset() {
    setRead(null);
    setAttestChecked(false);
    setCommitted(false);
    setError(null);
  }

  const gapTitle = added
    ? "The level change is on the record."
    : read
      ? "One file read. Now tell PathWise what it is."
      : "We couldn't verify this yet — and we won't guess.";

  return (
    <>
      <div className="jintro surface">
        {/* Matches the rail label and this page's own heading. It was left reading "When evidence
            lands" when both of those were renamed — the same miss as the timeline page's eyebrow,
            and the reason the terminology pass is swept for rather than trusted. */}
        <div className="jintro-eyebrow">When a document arrives</div>
        <h2>One document arrives. Watch PathWise re-reason.</h2>
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

      {/* THE FINDING, FIRST.
          This sat below the block that explains it — so the page described a refusal, at length,
          before the reader had seen the thing being refused. The band IS the climax of this screen
          and of the product: two readings of one record, drawn to scale, straddling the line that
          decides the outcome. Showing it before explaining it is the whole point; a reader now
          reaches the conclusion by looking, and everything beneath is the account of why.
          Nothing about the band's inputs, logic or wording changed — only where it sits. */}
      <div className="section-head">The finding, against the cliff it turns on</div>
      {/* The settled verdict is read off the ledger's own band, exactly as the After panel below
          does — `afterStatus` is `BAND_STATUS[settled.band]`. */}
      <UncertaintyBand
        lo={settled.fullTimeDays}
        hi={pooled.fullTimeDays}
        cliff={CLIFF_DAYS}
        unit={`${CLIFF_DAYS}-day cliff`}
        settled={added}
        loLabel="if the level change holds — OPT at the master's level preserved"
        hiLabel="if it can't be shown — OPT at this level would be gone"
        settledLabel={STATUS[afterStatus].word}
        settledStatus={STATUS[afterStatus].glyph}
        marginDays={settled.daysToCliff}
      />

      <div className={`wc-gap surface${added ? " done" : ""}`}>
        <div className="wc-gap-head">
          <div>
            <Chip status={added ? "verified" : "unknown"} />
            <h2 className="wc-gap-title">{gapTitle}</h2>
          </div>
          {added ? (
            <button className="wc-undo" onClick={reset}>
              Take the document back out
            </button>
          ) : null}
        </div>

        <div className="wc-gap-rows">
          <div className="wc-gap-k">{read ? "Read on this device" : "What's missing"}</div>
          <div className="wc-gap-v">
            {read ? (
              <ReadFacts read={read} />
            ) : (
              <>
                {MISSING_DOC.label} — {MISSING_DOC.detail}.
              </>
            )}
          </div>

          <div className="wc-gap-k">Why it matters</div>
          <div className="wc-gap-v">
            The CPT cap is counted per education level, so this one fact decides whether{" "}
            {bachelors.fullTimeDays} days from School X land in her master&apos;s ledger or stay out of
            it. <span className="cite">{SECTION_CITE}</span>
          </div>

          <div className="wc-gap-k">{added ? "What happened" : "What she can do"}</div>
          <div className="wc-gap-v">
            {added && read ? (
              <>
                {describeRead(read)} The level change is on the record because she attested it, and
                every finding that rests on it was recomputed here.
              </>
            ) : read ? (
              <>
                PathWise cannot tell what this document says, so it will not decide that for her. She
                confirms what it records, and the count recomputes.
              </>
            ) : (
              <>
                Produce the master&apos;s I-20, or ask her DSO to confirm the level change in SEVIS.
                Below, either read a sample document or pick a real file — PathWise treats them
                identically.
              </>
            )}
          </div>
        </div>

        {!added ? (
          <div className="wc-ev-actions">
            <input
              ref={fileInput}
              type="file"
              className="sr-only"
              onChange={onPick}
              aria-label="Choose the document recording the level change"
            />

            {!read ? (
              /* Two ways in, at equal weight. The sample leads because it is the one a visitor can
                 take without hunting through their own filesystem — and because "Choose the
                 document…" as the sole primary action meant the only route through the best screen
                 in the product ran through a native OS file dialog. Neither path skips anything:
                 both read real bytes, both fingerprint them, and both still require the attestation
                 below before a single number moves. */
              <>
                <div className="wc-ev-choose">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() => void ingest(makeSampleDocument(), "sample")}
                  >
                    {busy ? "Reading…" : "Use a sample document →"}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={busy}
                    onClick={() => fileInput.current?.click()}
                  >
                    Choose a file from this device
                  </button>
                </div>
                <p className="wc-ev-note">
                  Both do the same thing. The sample is generated in your browser, not downloaded;
                  either way PathWise counts and fingerprints the bytes in this tab, nothing is
                  uploaded, and the count below does not move until you say what the document
                  records.
                </p>
              </>
            ) : (
              <div className="wc-ev-attest">
                <label className="wc-ev-check">
                  <input
                    type="checkbox"
                    checked={attestChecked}
                    onChange={(e) => setAttestChecked(e.target.checked)}
                  />
                  <span>{ATTESTATION}</span>
                </label>
                <div className="wc-ev-attest-row">
                  <button
                    type="button"
                    className="btn"
                    disabled={!attestChecked}
                    onClick={() => setCommitted(true)}
                  >
                    Add to my record
                  </button>
                  <button type="button" className="wc-undo" onClick={reset}>
                    Choose a different file
                  </button>
                </div>
                <p className="wc-ev-note">
                  Ticking this records the level change at <strong>asserted</strong> confidence —
                  attested, with a document attached — not <strong>extracted</strong>, which would
                  mean PathWise had read what the document says. The DSO decides.
                </p>
              </div>
            )}

            {error ? (
              <p className="wc-ev-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="section-head">Before → after</div>

      <div className="wc-grid">
        <div className="wc-panel surface">
          <div className="wc-when">Before</div>
          <div className="wc-panel-head">
            <Chip status={beforeStatus} />
            <span className="wc-sub">CPT count · master&apos;s level</span>
          </div>
          <div className="wc-result">{beforeLine}</div>

          {/* The two readings are the whole argument, so they are set side by side and the number
              is given the size to carry it. Same engine, same authorizations, opposite sides of
              the cliff — that has to be legible in one look, not assembled from prose. */}
          <div className="wc-readings">
            <div className={`wc-reading ${BAND_STATUS[settled.band]}`}>
              <div className="wc-reading-k">
                If the level change holds
                <Chip status={BAND_STATUS[settled.band]} />
              </div>
              <div className="wc-reading-n">
                {settled.fullTimeDays}
                <span className="wc-reading-of"> / {CLIFF_DAYS} days</span>
              </div>
              <div className="wc-reading-v">OPT at the master&apos;s level preserved</div>
            </div>
            <div className={`wc-reading ${BAND_STATUS[pooled.band]}`}>
              <div className="wc-reading-k">
                If it can&apos;t be shown
                <Chip status={BAND_STATUS[pooled.band]} />
              </div>
              <div className="wc-reading-n">
                {pooled.fullTimeDays}
                <span className="wc-reading-of"> / {CLIFF_DAYS} days</span>
              </div>
              <div className="wc-reading-v">OPT at this level would be gone</div>
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

        {added && evidence && read ? (
          <div className="wc-panel surface wc-fade">
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
              {/* Named, not keyed. This printed the internal record id and the raw confidence rung
                  — "ev-f7aff64da265 · asserted" — as the answer to "what is this resting on?". */}
              <li className="wc-fact">
                <span>Resting on</span>
                <strong>The document you attested, at your word</strong>
              </li>
            </ul>

            <div className="wc-sub" style={{ marginTop: 12 }}>
              One reading survives, so the count is determinate. She is still close to the cliff — that
              part is a finding, not a gap. <span className="cite">{CLIFF_CITE}</span>
            </div>
          </div>
        ) : (
          <div className="wc-panel surface pending">
            <div className="wc-when">After</div>
            <div className="wc-pending-note">
              {read
                ? "The file is read, but nothing has been decided yet. PathWise cannot tell what the document records, so the count stays open until you say."
                : "Nothing to recompute yet. The count stays open until the evidence lands — PathWise holds the question rather than picking an answer."}
            </div>
          </div>
        )}
      </div>

      {added && evidence && levelChange ? (
        <div className="wc-fade">
          <div className="section-head">What changed</div>
          <ul className="wc-changes">
            {buildChanges(evidence, levelChange, settledEvents.length).map((c) => (
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
              <span className="cite">{SECTION_CITE}</span>. What changed is the evidence: the document
              now on record establishes the level change, so School X&apos;s{" "}
              {bachelors.fullTimeDays} bachelor&apos;s-level days can be attributed to a different
              level and kept out of the master&apos;s count. One of the two readings is now ruled out,
              so the analysis has one answer where it had two.
            </div>
            <div className="wc-why-v">
              Both states on this page are computed by the same ledger engine over the same authorized
              periods — {settled.fullTimeDays} days with the level change established,{" "}
              {pooled.fullTimeDays} without. Nothing here is a stored result, and the recomputation
              happened on this device.
            </div>
            <div className="wc-why-v">
              And one honest limit, because it is the difference between evidence and a claim about
              evidence: PathWise read this file&apos;s bytes, never its contents. The level change is
              recorded at <strong>asserted</strong> confidence — your word with a document attached —
              which is exactly what the record now says. PathWise advises; the DSO decides.
            </div>
          </div>

          {/* This is the payoff of the flow, not a way out of the page — the way out is the
              shell's back link, which is present from the moment the page loads rather than only
              once a document has been attached. So it stops calling itself "Back to …" with an
              arrow pointing the other way, and says what it actually offers: the dashboard as it
              reads NOW, recomputed. The trailing arrow is correct for that. */}
          <Link href="/student" className="memorystrip" style={{ marginTop: 18 }}>
            <span>
              <span className="ms-k">Her dashboard now reads the settled count.</span> Same record,
              same engines, one fewer open question.
            </span>
            <span className="ms-go">See her standing now →</span>
          </Link>
        </div>
      ) : null}

      <footer className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · The document is
        never uploaded anywhere — it is read in this tab and released, and the re-computation runs on
        this device. Every finding shows its regulation and the office that decides it.
      </footer>
    </>
  );
}
