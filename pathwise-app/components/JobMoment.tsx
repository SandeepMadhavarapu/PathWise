"use client";

import { useState } from "react";
import { formatDomicileDate } from "@/lib/format";
import { applyLifeEvent } from "@/lib/engines/consequence-engine";
import type { DerivedConsequence } from "@/lib/engines/consequence-engine";
import { jurisdictionFor } from "@/lib/engines/jurisdiction";
import { priyaStudent, priyaJobOffer } from "@/lib/fixtures/priya";
import type { StatusKey } from "@/lib/tokens";
import { StatusGlyph } from "./StatusGlyph";
import { Capsule } from "./Capsule";

const TONE_STATUS: Record<string, StatusKey> = { warn: "warn", ok: "done", info: "active" };

// PathWise's three domains, and the office language a student would use for each. Named here so the
// sentence below can be COUNTED rather than asserted: this panel used to read "4 things changed
// across your three offices" while the engine returned consequences in two of the three, which is
// the one kind of error this product cannot afford. Nothing below is a literal count — add an aid
// consequence to the map and every number and name in this component follows it.
type Domain = DerivedConsequence["domain"];

const DOMAINS: { key: Domain; office: string }[] = [
  { key: "immigration", office: "immigration" },
  { key: "residency", office: "residency" },
  { key: "aid", office: "financial aid" },
];

/**
 * The derivation, made readable — WITHOUT touching the string itself.
 *
 * `consequence-map.json` carries derivations like `employment_start_date + 10 days`, and that text
 * is not prose: `resolveDeadline` in the consequence engine matches `+ N days` against it and tests
 * it for `employment_start_date` / `program_completion_date` to pick the anchor. It is machine
 * input, so rewriting it in the pack would change deterministic behaviour and is out of the
 * question. What was wrong is only that the raw identifier reached the screen.
 *
 * So the transformation happens here, at the render edge: the underscored anchor becomes words and
 * the arithmetic is left exactly as authored. Nothing upstream is altered, and an anchor this does
 * not recognise still renders — just spaced — rather than disappearing.
 */
function readableDerivation(derivation: string): string {
  return derivation.replace(/\b[a-z]+(?:_[a-z]+)+\b/g, (token) => token.replace(/_/g, " "));
}

/** ["a", "b", "c"] → "a, b and c". */
function listPhrase(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// The product has ONE date spelling and it lives in lib/format.ts. This component used to
// carry its own `toLocaleDateString("en-US", { month: "long" })`, which rendered "September 15,
// 2026" beside the shell footer's "24 Jul 2026" — two spellings of the same kind of value on one
// screen. Both were timezone-safe; they were simply different.
const formatDate = formatDomicileDate;

export function JobMoment() {
  // Was `useState(false)` behind an "I got a job →" button. The gate was the bug: measured, the
  // pre-click page filled 66% of a 1920x1080 viewport and 80% of 1440x900 — the only route in the
  // product that under-fills its own screen — so the strongest demonstration PathWise has looked
  // like a page that had failed to load, and only rewarded a reader who clicked anyway. Nothing
  // about the output changes; the same engine call renders the same consequences. It is simply no
  // longer conditional on a click that a judge with twenty other projects open will not make.
  const [revealed] = useState(true);
  // The residency consequence turns on a state's gate, so the event is read under the rules of the
  // state Priya's record puts her in — not under whichever pack the engine happened to import.
  const consequences = applyLifeEvent(priyaStudent, priyaJobOffer, jurisdictionFor(priyaStudent));

  const touched = DOMAINS.filter((d) => consequences.some((c) => c.domain === d.key));
  const untouched = DOMAINS.filter((d) => !consequences.some((c) => c.domain === d.key));
  // A consequence that fires as "does not apply" is still the engine answering — and on this event
  // it is the counter-intuitive answer. Worth counting separately from a domain nothing reached.
  const reasonedNegatives = consequences.filter((c) => !c.applies).length;

  return (
    <div className="moment surface">
      <div className="moment-head">
        <div>
          <div className="moment-eyebrow">The life-event test</div>
          <h2>Priya does something good — she signs a job offer.</h2>
          <p className="moment-sub">
            Start date {formatDate(String(priyaJobOffer.attrs.start_date))}. A calendar app would say
            &ldquo;congrats.&rdquo; Watch what a reasoning engine says instead.
          </p>
        </div>
      </div>

      {revealed && (
        <>
          <div className="moment-count">
            <span className="mc-lead">
              Priya reported a job. <strong>{consequences.length} consequences</strong>, in{" "}
              {touched.length} of her {DOMAINS.length} offices —{" "}
              {listPhrase(touched.map((d) => d.office))}.
            </span>
            <span className="mc-sub">
              {untouched.length > 0
                ? `No rule for this event reaches ${listPhrase(
                    untouched.map((d) => d.office),
                  )}, so that office is untouched. `
                : ""}
              {reasonedNegatives > 0
                ? `And ${reasonedNegatives} of the ${consequences.length} is a reasoned "this changes nothing" rather than a blank — it is the counter-intuitive one.`
                : ""}
            </span>
          </div>
          <ol className="conseq">
            {consequences.map((c, i) => {
              const status = TONE_STATUS[c.tone] ?? "active";
              return (
                /* The counter-intuitive consequence is the one a judge remembers — "a signed offer
                   with a future start date does NOT stop the unemployment clock" is the claim no
                   calendar app and no chatbot would make. It was rendered in a card identical to
                   the routine one beside it, distinguished only by a small chip. It now carries the
                   weight its content already had. */
                <li
                  key={i}
                  className={`conseq-item in${c.counterintuitive ? " conseq-item--key" : ""}`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <StatusGlyph status={status} />
                  <div className="ci-body">
                    <div className="ci-top">
                      <span className="t-micro">
                        {DOMAINS.find((d) => d.key === c.domain)?.office ?? c.domain}
                      </span>
                      {c.counterintuitive && (
                        <Capsule variant="tinted" status="blocked">
                          counter-intuitive
                        </Capsule>
                      )}
                      {!c.applies && <Capsule variant="neutral">does not apply</Capsule>}
                    </div>
                    <div className="ci-effect">{c.effect}</div>
                    {c.newDeadline && (
                      <div className="ci-deadline">
                        <strong>Deadline{c.newDeadline.date ? ` ${c.newDeadline.date}` : ""}</strong>
                        <span className="ci-derivation"> — {readableDerivation(c.newDeadline.derivation)}</span>
                        <div className="ci-miss">If missed: {c.newDeadline.consequenceOfMissing}</div>
                      </div>
                    )}
                    {c.supersedes && (
                      <div className="ci-stale">
                        {/* The count, not the keys. This printed the internal finding ids —
                            "supersedes: opt_risk_finding, unemployment_finding" — and the effect
                            sentence directly above it already says the finding must be recomputed,
                            so the ids were the only thing the line added. */}
                        Supersedes {c.supersedes.length} earlier{" "}
                        {c.supersedes.length === 1 ? "finding" : "findings"}
                      </div>
                    )}
                    <div className="ci-cite">
                      {/* An inference PathWise drew is not an authority it can cite, and it was
                          wearing the identical mono chip as `8 CFR 214.2(f)(12)` on the card
                          directly above — so the product appeared to cite itself as if it were law.
                          The wording is unchanged and was always honest; only the costume is
                          removed, so the two kinds of claim stop looking like one kind. */}
                      {/* `wrap` because these authorities are the longest in the product — the
                          residency one runs to "Part II, Section 03(A) & Section 02(4); SCHEV
                          Domicile Guidelines, Code of Virginia 23.1-510(D)", 641px of unbreakable
                          mono. `.cite` is nowrap by design so a short citation never splits across
                          lines mid-section-number; at this length that turned into 300px of
                          horizontal overflow at 430px wide. The modifier already existed for
                          exactly this case. */}
                      <span
                        className={
                          /^PathWise/.test(c.cite.authority) ? "cite-self" : "cite wrap"
                        }
                      >
                        {c.cite.authority}
                      </span>
                      {/* An unmodelled jurisdiction's consequence carries the official source the
                          engine found for it. This component was computing that link and then
                          dropping it, which is the one case where the link matters most. */}
                      {c.cite.source_url && (
                        <>
                          {" "}
                          <a href={c.cite.source_url} target="_blank" rel="noreferrer noopener">
                            Official source →
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="moment-foot">
            None of Priya&apos;s three offices would have caught all four. That is the whole point of
            PathWise.
          </p>
        </>
      )}
    </div>
  );
}
