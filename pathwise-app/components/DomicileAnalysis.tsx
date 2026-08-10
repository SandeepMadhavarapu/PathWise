// DomicileAnalysis.tsx — the worked analysis behind Engine B's reasoning steps.
//
// It renders inside FindingDetail (as its `analysis` slot), not beside it: the numbered claims are
// the answer, and these are the tables, weights and arithmetic those claims are read off. Every
// number, weight word, clause and section reference on screen arrives from the engine, which reads
// it from whichever domicile pack the router resolved for this student — nothing here is typed by
// hand, including the citations, and nothing here names a jurisdiction.
//
// Vocabulary is the app's four states (icon + word + colour, never colour alone). A factor that
// simply cannot apply to this student is deliberately NOT given a status chip: it is not an
// uncertainty and not a risk, so it reads as a muted, dashed row with the reason in the pack's own
// words.

import {
  formatDomicileDate,
  humanizeId,
  type DependencyDetermination,
  type DomicileAnalysis,
  type FactorState,
  type IntentFactorRow,
} from "@/lib/engines/domicile";
import { describeEvent } from "@/lib/labels";
import type { Event } from "@/lib/types";

type StateKey = "verified" | "attention" | "blocked" | "unknown";

const ICON: Record<StateKey, string> = {
  verified: "✓",
  attention: "◐",
  blocked: "●",
  unknown: "?",
};

function Chip({ state, word }: { state: StateKey; word: string }) {
  return (
    <span className={`statuschip ${state}`}>
      <span className="ic" aria-hidden="true">
        {ICON[state]}
      </span>
      {word}
    </span>
  );
}

// The four states, applied to one factor. `inapplicable` has no chip on purpose — see the header.
const FACTOR_CHIP: Record<Exclude<FactorState, "inapplicable">, { state: StateKey; word: string }> = {
  satisfied: { state: "verified", word: "Satisfied" },
  does_not_count: { state: "blocked", word: "Does not count" },
  not_on_record: { state: "unknown", word: "Not on record" },
};

const DEPENDENCY_CHIP: Record<DependencyDetermination["status"], { state: StateKey; word: string }> = {
  independent: { state: "verified", word: "Independent" },
  not_presumed: { state: "verified", word: "No presumption applies" },
  presumed_dependent: { state: "attention", word: "Presumed dependent" },
  // A pack that states no dependency rule. Neutral, not "verified": nothing was verified — the
  // question was never asked, which is a different thing from being answered in the student's favour.
  not_modelled: { state: "unknown", word: "Not modelled here" },
};

// How the pack words a caveat's outcome. The caveat text itself is always quoted verbatim.
const CAVEAT_WORD: Record<NonNullable<IntentFactorRow["caveatResolution"]>, string> = {
  applies: "applies to this record — the factor stops counting",
  does_not_apply: "does not apply to this record",
  unresolved: "cannot be resolved from this record",
};

/**
 * The events a row rests on, named rather than keyed.
 *
 * These printed as `event · mv-va` and `event · prog-start-z`, which is the engine's addressing
 * scheme leaking onto a student's screen. The id is still what the row is derived FROM and is still
 * what `title` carries for anyone who wants it; what is read aloud is what the event was.
 */
function EvidenceTags({ ids, events }: { ids: string[]; events: readonly Event[] }) {
  if (ids.length === 0) return null;
  return (
    <div className="reason-tags">
      {ids.map((id) => (
        <span className="reason-tag" key={id} title={id}>
          {describeEvent(id, events)}
        </span>
      ))}
    </div>
  );
}

function BlockHead({ title, cite }: { title: string; cite?: string }) {
  return (
    <div className="dm-h">
      <div className="section-h">{title}</div>
      {cite ? <span className="cite wrap">{cite}</span> : null}
    </div>
  );
}

export function DomicileAnalysisDetail({
  analysis,
  jurisdictionCode,
  events = [],
}: {
  analysis: DomicileAnalysis;
  /**
   * The resolved jurisdiction's code, from the router. `humanizeId` needs it to know which token a
   * pack abbreviates itself with; without it an id is still readable, just not initialised. The
   * component takes it as a prop rather than reaching for a pack, same as every other screen.
   */
  jurisdictionCode?: string;
  /** The record the rows point into, so an event can be named instead of keyed. */
  events?: readonly Event[];
}) {
  const { dependency, intent, clock, clockRule, construction, gated } = analysis;
  const label = (id: string): string => humanizeId(id, jurisdictionCode);

  // The gate fired and stopped the analysis, so there is nothing deeper to show.
  // Inventing a table here would be inventing an analysis that was never performed.
  if (gated || !dependency || !intent || !clock || !clockRule) return null;

  const dep = DEPENDENCY_CHIP[dependency.status];

  return (
    <div className="dm">
      {/* ---- Dependency (§09(C)(1)) ---- */}
      <BlockHead title="Dependency — whose acts get weighed" cite={dependency.cite} />
      <section className="dm-card">
        <div className="dm-card-top">
          <Chip state={dep.state} word={dep.word} />
          <span className="dm-fact">
            {dependency.ageAtEntitlement} years old on{" "}
            {formatDomicileDate(clock.allegedEntitlementDate)}
            {/* The threshold is the PACK's number. A pack that states no dependency rule has none,
                and printing "under 0" there was inventing a rule — see DependencyStatus. */}
            {dependency.thresholdAge === undefined
              ? " — PathWise has not read a dependency rule for this jurisdiction"
              : ` — the presumption applies under ${dependency.thresholdAge}`}
          </span>
        </div>

        {dependency.exception ? (
          <div className="dm-sub">
            <div className="dm-sub-k">
              Presumption rebutted — {dependency.exception.label}
              <span className={`dm-tag ${dependency.exception.derived ? "" : "off"}`}>
                {dependency.exception.derived ? "derived from the timeline" : "asserted on the record"}
              </span>
            </div>
            <div className="dm-sub-v">{dependency.exception.basis}</div>
            <EvidenceTags ids={dependency.exception.eventIds} events={events} />
          </div>
        ) : dependency.presumptionApplies ? (
          <div className="dm-sub pending">
            <div className="dm-sub-k">
              None of the {dependency.openExceptions.length} exceptions is established on this record
            </div>
            <ul className="dm-inline">
              {dependency.openExceptions.map((id) => (
                <li key={id}>{label(id)}</li>
              ))}
            </ul>
            <div className="dm-sub-v">
              Until one of them is, the domicile examined is the parents&apos; — which is why this sits
              in the open questions below rather than being decided either way.
            </div>
          </div>
        ) : (
          <div className="dm-sub">
            <div className="dm-sub-v">
              At or over the threshold, so the student&apos;s own acts are what the factors below
              measure.
            </div>
          </div>
        )}
      </section>

      {/* ---- Intent factors (weights, inapplicability, caveats) ---- */}
      <BlockHead title="Intent factors, and what each one weighs" cite={intent.cite} />
      <ul className="dm-rows">
        {intent.rows.map((row) => {
          const chip = row.state === "inapplicable" ? undefined : FACTOR_CHIP[row.state];
          return (
            <li className={`dm-row ${row.state}`} key={row.id}>
              <div className="dm-row-top">
                <span className="dm-factor">{row.label}</span>
                <span className={`dm-weight ${row.weight}`}>{row.weight}</span>
                {row.auxiliary ? (
                  <span className="dm-aux">
                    <span className="ic" aria-hidden="true">
                      ◐
                    </span>
                    little weight
                  </span>
                ) : null}
                <span className="dm-when">{row.date ? formatDomicileDate(row.date) : "no date"}</span>
                {chip ? (
                  <Chip state={chip.state} word={chip.word} />
                ) : (
                  <span className="dm-na">Not applicable</span>
                )}
              </div>

              {row.state === "inapplicable" ? (
                /* The condition itself is the proof, and the pack really does say it in this form —
                   so it stays. What it lacked was a name: bare, it read as an internal expression
                   that had escaped onto the page. Labelled, it reads the way a citation reads. */
                <div className="dm-row-note">
                  {row.inapplicableBecause}
                  {row.inapplicableWhen ? (
                    <span className="dm-clause-wrap">
                      <span className="dm-clause-k">the pack&apos;s condition</span>
                      <span className="dm-clause">{row.inapplicableWhen}</span>
                    </span>
                  ) : null}
                </div>
              ) : null}

              {row.caveat && row.caveatResolution ? (
                <div className="dm-row-note">
                  Pack caveat &ldquo;{row.caveat}&rdquo; {CAVEAT_WORD[row.caveatResolution]}.
                </div>
              ) : null}

              {row.auxiliary ? (
                <div className="dm-row-note">
                  The warning names this act — {label(row.auxiliaryAct ?? row.id)}{" "}
                  {/* The warning's own cite, carried on the analysis the engine returned, so it is
                      this jurisdiction's section reference and not one imported from elsewhere. */}
                  <span className="cite wrap">{intent.warning.cite}</span>
                </div>
              ) : null}

              <EvidenceTags ids={row.eventIds} events={events} />
            </li>
          );
        })}
      </ul>

      {/* ---- The auxiliary-acts warning itself ---- */}
      <section className="dm-warn">
        <div className="dm-warn-k">
          <span className="ic" aria-hidden="true">
            ◐
          </span>
          Acts the guidelines warn carry little weight
          <span className="cite wrap">{intent.warning.cite}</span>
        </div>
        <p className="dm-warn-v">&ldquo;{intent.warning.note}&rdquo;</p>
        <ul className="dm-acts">
          {intent.warning.acts.map((act) => {
            const hit = intent.rows.find((r) => r.auxiliaryAct === act);
            return (
              <li className={`dm-act ${hit ? "hit" : "off"}`} key={act}>
                <span className="dm-act-k">{label(act)}</span>
                <span className="dm-act-v">
                  {hit ? `on this record as ${hit.label}` : "not among this student's factors"}
                </span>
              </li>
            );
          })}
        </ul>
        {intent.auxiliaryOnly ? (
          <p className="dm-warn-v">
            Every factor still counting is one of these — the weakest form this case can take.
          </p>
        ) : null}
      </section>

      {/* ---- The durational clock ---- */}
      <BlockHead title="The clock — and where it actually starts" cite={clockRule.cite} />
      <section className="dm-card">
        <div className="dm-calc">
          <div className={`dm-calc-row ${clock.clockStart ? "" : "pending"}`}>
            <span className="dm-calc-date">
              {clock.clockStart ? formatDomicileDate(clock.clockStart) : "—"}
            </span>
            <span className="dm-calc-k">Clock start</span>
            <span className="dm-calc-v">
              {clock.startFactor
                ? `the LAST qualifying factor: ${
                    intent.rows.find((r) => r.id === clock.startFactor!.id)?.label ??
                    label(clock.startFactor.id)
                  }`
                : "no factor on this record both applies and counts"}
            </span>
          </div>

          <div className="dm-calc-row op">
            <span className="dm-calc-date">+ {clock.durationDays}</span>
            <span className="dm-calc-k">days</span>
            <span className="dm-calc-v">the duration the pack requires before entitlement</span>
          </div>

          <div className={`dm-calc-row ${clock.earliestEntitlement ? "binding" : "pending"}`}>
            <span className="dm-calc-date">
              {clock.earliestEntitlement ? formatDomicileDate(clock.earliestEntitlement) : "—"}
            </span>
            <span className="dm-calc-k">Earliest term</span>
            <span className="dm-calc-v">
              the earliest date of alleged entitlement that satisfies the duration requirement
            </span>
          </div>

          <div className="dm-calc-row">
            <span className="dm-calc-date">{formatDomicileDate(clock.allegedEntitlementDate)}</span>
            <span className="dm-calc-k">Claimed term</span>
            <span className="dm-calc-v">
              {clockRule.anchorDefinition}{" "}
              {clock.clockStart ? (
                clock.meetsDuration ? (
                  <Chip state="verified" word="Duration met" />
                ) : (
                  <Chip state="attention" word={`${clock.daysShort} days short`} />
                )
              ) : (
                <Chip state="unknown" word="No start date" />
              )}
            </span>
          </div>
        </div>

        <p className="dm-rule">
          &ldquo;{clockRule.startRuleNote}&rdquo;{" "}
          <span className="cite wrap">{clockRule.cite}</span>
        </p>
      </section>

      {/* ---- Rules of construction ---- */}
      <BlockHead title="Rules of construction the officer applies" />
      <ul className="dm-cons">
        {construction.map((rule) => (
          <li className={`dm-con ${rule.relevant ? "" : "off"}`} key={rule.id}>
            <div className="dm-con-k">
              {rule.label}
              <span className={`dm-tag ${rule.relevant ? "" : "off"}`}>
                {rule.relevant ? "in play here" : "not in play here"}
              </span>
              {rule.cite ? <span className="cite wrap">{rule.cite}</span> : null}
            </div>
            <p className="dm-con-note">&ldquo;{rule.note}&rdquo;</p>
            <p className="dm-con-v">{rule.relevance}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
