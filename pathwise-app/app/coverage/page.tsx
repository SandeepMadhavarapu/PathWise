"use client";

// Coverage map + rule-pack viewer — the screen that answers "does this generalise?".
//
// Nothing on this page is typed by hand, and that is the whole argument it makes. The jurisdiction
// list is the index; the LEVEL each jurisdiction sits at is derived from what its registered pack
// declares it can answer; the legend is the pack file's own; and the viewer below prints the real
// rule packs, enumerated from the registry rather than from a list somebody remembered to update.
//
// The pack list in this file used to be four hardcoded imports with hand-written titles. That made
// this the one screen where adding a jurisdiction meant editing the UI — on the page whose entire
// claim is that a jurisdiction is data.
//
// Status is per DOMAIN, because that is how coverage actually arrives. "Residency modelled, aid
// sourced only" is a real and common state, and a single badge per jurisdiction would flatten it
// into something untrue in one direction or the other.

import { useEffect, useRef, useState } from "react";

import {
  COVERAGE_LEGEND,
  COVERAGE_VERIFIED_ON,
  JURISDICTION_COUNT,
  SOURCES_CHECKED_ON,
  STATE_COUNT,
} from "@/lib/coverage";
import {
  COVERAGE,
  LEVEL_COUNTS,
  FULLY_MODELLED_COUNT,
  FULLY_MODELLED_NAMES,
  PARTIALLY_MODELLED_COUNT,
  SOURCED_ONLY_COUNT,
  type DomainCoverage,
  type JurisdictionCoverage,
} from "@/lib/jurisdiction-coverage";
import { REGISTERED_PACKS } from "@/lib/rulepacks";
import type { CapabilityLevel } from "@/lib/rulepacks/schema";
import f1Pack from "@/lib/rulepacks/f1-practical-training.json";
import consequencePack from "@/lib/rulepacks/consequence-map.json";
import { StatusGlyph } from "@/components/StatusGlyph";
import { Capsule } from "@/components/Capsule";
import type { StatusKey as GlyphStatus } from "@/lib/tokens";

// The five levels, mapped onto the app's own status vocabulary. A jurisdiction PathWise has not
// modelled is an "unable to verify", not an error — the same honesty the engines use about a
// student's record, applied to our own coverage.
const LEVEL: Record<
  CapabilityLevel,
  { key: "verified" | "attention" | "sourced" | "unknown"; glyph: GlyphStatus; word: string; short: string }
> = {
  modelled: { key: "verified", glyph: "done", word: "Modelled & verified", short: "modelled" },
  partial: { key: "attention", glyph: "warn", word: "Partially modelled", short: "partial" },
  // Was `glyph: "warn"`, which made it identical to `partial` in every channel the page has: the
  // same amber triangle in the counts row, the same amber in the legend, and the same
  // rgb(183,121,31) in the bar — 43 jurisdictions and 2 jurisdictions rendered indistinguishably on
  // the one page whose entire subject is how far PathWise has actually got. Only the word differed.
  //
  // `active` is the honest key, not merely a free colour: source captured means the deciding body
  // and its published rule are on record and linked, and the modelling has not been written yet.
  // That is work underway, which is what the arrow and the teal already mean everywhere else in
  // this product. It reads at deltaE 80 from warn, and the arrow differs from the triangle in
  // shape, so the distinction survives greyscale and colour-vision deficiency alike.
  sourced_only: { key: "sourced", glyph: "active", word: "Source captured", short: "source captured" },
  unable_to_verify: { key: "unknown", glyph: "idle", word: "Unable to verify", short: "unable to verify" },
  not_modelled: { key: "unknown", glyph: "idle", word: "Not modelled", short: "not modelled" },
};

// Best first — the order a reader should meet them in.
const LEVEL_ORDER: CapabilityLevel[] = [
  "modelled",
  "partial",
  "sourced_only",
  "unable_to_verify",
  "not_modelled",
];

const DOMAIN_LABEL: Record<DomainCoverage["domain"], string> = {
  residency: "Residency",
  aid: "State aid",
};

// How a source link was confirmed, said out loud. "We checked" is a claim like any other, and a
// page that was read and a host that merely answered are not the same evidence.
const CHECK_LABEL: Record<"fetched" | "serving_blocked", string> = {
  fetched: "page read",
  serving_blocked: "host live, page not read",
};
const CHECK_TITLE: Record<"fetched" | "serving_blocked", string> = {
  fetched: "PathWise retrieved this page and read it on the date the index was checked.",
  serving_blocked:
    "The host answered but refuses automated reads, so PathWise confirmed the address is live and is the agency's own without reading what is on it.",
};

/**
 * Every pack the app actually reads, enumerated.
 *
 * The jurisdiction packs come from the registry, so a state added in `lib/rulepacks/index.ts`
 * appears here without this file being touched. The two federal packs are named explicitly because
 * they are not jurisdiction packs and have no registry to come from — 8 CFR does not vary by state,
 * which is exactly why the immigration engines bind them directly.
 */
function packEntries() {
  const jurisdictionPacks = REGISTERED_PACKS.flatMap(({ packs }) => {
    const entries = [
      {
        tab: packs.domicile.pack_id,
        title: `${packs.domicile.agencies[0]?.short_name ?? packs.domicile.jurisdiction} residency`,
        blurb: `The residency rules for ${packs.domicile.jurisdiction}: ${
          packs.domicile.gates.length
            ? `${packs.domicile.gates.length} gate${packs.domicile.gates.length === 1 ? "" : "s"}, `
            : "no status gate, "
        }${
          packs.domicile.clock
            ? `a ${packs.domicile.clock.duration_days}-day clock counted from ${packs.domicile.clock.start_rule.replace(/_/g, " ")}, `
            : "no durational clock at all, "
        }and what it weighs.`,
        data: packs.domicile as unknown,
      },
    ];
    // Only where aid rules have actually been authored. A jurisdiction with residency modelled and
    // aid not has one file here, not two — and the map beside it says which.
    if (packs.aid) {
      entries.push({
        tab: packs.aid.pack_id,
        title: `${packs.aid.agencies[0]?.short_name ?? packs.aid.jurisdiction} state aid`,
        blurb: `Which form applies in ${packs.aid.jurisdiction}, what blocks state aid, and the deadlines the aid engine resolves an earliest-of over.`,
        data: packs.aid as unknown,
      });
    }
    return entries;
  });

  return [
    ...jurisdictionPacks,
    {
      tab: "f1-practical-training",
      title: "F-1 practical training",
      blurb:
        "The CPT cliff, the OPT budget and the unemployment clock. Federal, so it is the one pack every jurisdiction shares — and the reason the immigration engines take no jurisdiction at all.",
      data: f1Pack as unknown,
    },
    {
      tab: "consequence-map",
      title: "Event consequence map",
      blurb:
        "One life event → what it changes in every domain. The table that makes PathWise one product instead of three.",
      data: consequencePack as unknown,
    },
  ];
}

interface PackMeta {
  authority?: string;
  source_url?: string;
  guidelines_effective?: string;
  verified_on?: string;
  volatility?: { status: string; note: string };
  agencies?: { id: string; name: string; short_name: string; decides: string[] }[];
  capabilities?: { domain: string; level: string; answers?: string[]; reason?: string }[];
}

/** One domain's badge on a tile. */
function DomainBadge({ d }: { d: DomainCoverage }) {
  const l = LEVEL[d.level];
  return (
    <span className={`cov-domain ${l.key}`}>
      <StatusGlyph status={l.glyph} />
      <span className="cov-domain-k">{DOMAIN_LABEL[d.domain]}</span>
      <span className="cov-domain-v">{l.short}</span>
    </span>
  );
}

function CoverageTile({ j }: { j: JurisdictionCoverage }) {
  const [open, setOpen] = useState(false);
  const l = LEVEL[j.furthest];
  const expandable = Boolean(j.note || j.domains.some((d) => d.reason || d.source_url));

  return (
    <div className={`cov-tile ${l.key}${open ? " open" : ""}`}>
      <button
        type="button"
        className="cov-tile-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        disabled={!expandable}
        aria-label={`${j.name} — residency ${LEVEL[j.residency.level].word}, state aid ${
          LEVEL[j.aid.level].word
        }`}
      >
        <span className="cov-top">
          <span className="cov-code">{j.code}</span>
          {expandable ? (
            <span className="cov-more" aria-hidden="true">
              {open ? "−" : "+"}
            </span>
          ) : null}
        </span>
        <span className="cov-name">{j.name}</span>
        <span className="cov-domains">
          {j.domains.map((d) => (
            <DomainBadge key={d.domain} d={d} />
          ))}
        </span>
      </button>

      {open ? (
        <div className="cov-detail">
          {j.domains.map((d) => (
            <div className="cov-detail-row" key={d.domain}>
              <span className="cov-detail-k">{DOMAIN_LABEL[d.domain]}</span>
              <span className="cov-detail-v">
                {d.authority ? <strong>{d.authority}</strong> : null}
                {d.authority ? " — " : null}
                {d.reason}
                {d.answers?.length ? (
                  <span className="cov-answers">
                    {d.answers.map((a) => (
                      <Capsule key={a}>{a.replace(/_/g, " ")}</Capsule>
                    ))}
                  </span>
                ) : null}
                {d.source_url ? (
                  <span className="cov-source">
                    <a href={d.source_url} target="_blank" rel="noopener noreferrer">
                      Official source →
                    </a>
                    {d.sourceCheck ? (
                      <span className="cov-check" title={CHECK_TITLE[d.sourceCheck]}>
                        {CHECK_LABEL[d.sourceCheck]}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
          {j.note ? (
            <div className="cov-detail-row">
              <span className="cov-detail-k">Noted</span>
              <span className="cov-detail-v cov-note-unverified">
                {j.note}{" "}
                <em>Research note — not verified against a primary source, and never cited.</em>
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RulePackViewer() {
  const packs = packEntries();
  const [active, setActive] = useState(0);
  const pack = packs[Math.min(active, packs.length - 1)];
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * Arriving from a finding's "open the rule pack this came from" link.
   *
   * The hash is read once, on mount, and only ever used to SELECT a tab that already exists — an
   * unrecognised pack id selects nothing rather than erroring or defaulting to the first, because a
   * link to a pack this build does not carry should fail visibly rather than quietly show the
   * wrong file.
   *
   * A hash and not a query string: `useSearchParams` would opt this route out of static
   * prerendering, and every route in this product ships as static HTML. The tab buttons already
   * carry these ids, so with JavaScript disabled the browser still scrolls to the right pack — the
   * selection is an enhancement on top of behaviour that works without it.
   */
  useEffect(() => {
    const id = window.location.hash.replace(/^#rp-tab-/, "");
    if (!id || id === window.location.hash) return;
    const i = packs.findIndex((p) => p.tab === id);
    if (i >= 0) setActive(i);
    // `packs` is rebuilt each render from the registry but is stable in content; the registry is a
    // module constant. Running this once on mount is the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * The keyboard half of the tab pattern, which was missing.
   *
   * This strip already declared `role="tablist"` / `role="tab"` / `role="tabpanel"`, and declaring
   * those roles is a promise about how the control behaves: a screen reader announces "tab, 1 of 6"
   * and its user then reaches for the arrow keys. There were none. Every tab was an ordinary Tab
   * stop instead, so the announced model and the real one disagreed — which is worse than shipping
   * plain buttons, because plain buttons never claimed anything.
   *
   * Roving tabindex, per WAI-ARIA: exactly one tab is in the Tab sequence (the selected one), and
   * Left/Right move selection between them, wrapping at both ends. Home and End jump to the first
   * and last. Tab itself now leaves the strip entirely and lands in the panel, which is the point of
   * the pattern — six packs should cost one Tab stop on the way to the content, not six.
   */
  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = packs.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = i === last ? 0 : i + 1;
    else if (e.key === "ArrowLeft") next = i === 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    // Selection follows focus, which is the correct choice here: switching panel is instant, reads
    // no network and loses no state, so making the user press Enter as well would be friction with
    // nothing behind it.
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }
  const meta = pack.data as PackMeta;
  const json = JSON.stringify(pack.data, null, 2);
  const lines = json.split("\n").length;

  return (
    <>
      <p className="rp-frame">
        Adding a jurisdiction means authoring one of these files and registering it — not writing
        code. This list is the registry itself, so a state that is not here is a state the engines
        genuinely cannot answer for.
      </p>

      <div className="rp-tabs" role="tablist" aria-label="Rule packs">
        {packs.map((p, i) => (
          <button
            key={p.tab}
            type="button"
            role="tab"
            id={`rp-tab-${p.tab}`}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            aria-selected={i === active}
            aria-controls="rp-panel"
            tabIndex={i === active ? 0 : -1}
            className={`rp-tab ${i === active ? "active" : ""}`}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
          >
            {p.tab}
          </button>
        ))}
      </div>

      <section
        className="rp-panel surface"
        id="rp-panel"
        role="tabpanel"
        aria-labelledby={`rp-tab-${pack.tab}`}
      >
        <h3 className="rp-title">{pack.title}</h3>
        <p className="rp-blurb">{pack.blurb}</p>

        <div className="rp-meta">
          <span className="rp-k">Authority</span>
          <span className={`rp-v ${meta.authority ? "" : "absent"}`}>
            {meta.authority ??
              "No single external authority — every entry in this file carries its own citation."}
          </span>

          <span className="rp-k">Source</span>
          <span className={`rp-v ${meta.source_url ? "" : "absent"}`}>
            {meta.source_url ? (
              <a href={meta.source_url} target="_blank" rel="noopener noreferrer">
                {meta.source_url}
              </a>
            ) : (
              "Cited per entry, inside the file."
            )}
          </span>

          {meta.agencies?.length ? (
            <>
              <span className="rp-k">Decided by</span>
              <span className="rp-v">
                {meta.agencies
                  .map((a) => `${a.name} (${a.short_name}) — ${a.decides.join(", ")}`)
                  .join("; ")}
              </span>
            </>
          ) : null}

          {meta.capabilities?.length ? (
            <>
              <span className="rp-k">Answers</span>
              <span className="rp-v">
                {meta.capabilities
                  .map(
                    (c) =>
                      `${c.domain}: ${c.level}${
                        c.answers?.length ? ` (${c.answers.length} rules)` : ""
                      }`,
                  )
                  .join("; ")}
              </span>
            </>
          ) : null}

          <span className="rp-k">Verified on</span>
          <span className="rp-v">
            {meta.verified_on ?? "—"}
            {meta.guidelines_effective ? (
              <> · guidelines effective {meta.guidelines_effective}</>
            ) : null}
          </span>

          {meta.volatility ? (
            <>
              <span className="rp-k">Volatility</span>
              <span className="rp-v">
                {meta.volatility.status.replace(/_/g, " ")} — {meta.volatility.note}
              </span>
            </>
          ) : null}
        </div>

        <div className="rp-filebar">
          <span className="rp-filename">lib/rulepacks/{pack.tab}.json</span>
          <span>{lines} lines · read-only</span>
        </div>
        <pre className="rp-json" tabIndex={0}>
          {json}
        </pre>
      </section>
    </>
  );
}

export default function CoveragePage() {
  // The heading of the page whose whole job is honest coverage claimed "3 states are fully
  // modelled" while its own tiles, one scroll below, badged two of those three "partial" and
  // "source captured". Same constant, same bug as the landing.
  const modelled =
    FULLY_MODELLED_NAMES.length === 1 ? FULLY_MODELLED_NAMES[0] : `${FULLY_MODELLED_COUNT} states`;
  const notModelled = LEVEL_COUNTS.not_modelled;

  return (
    <>
      <div className="jintro surface">
        <div className="jintro-eyebrow">Coverage · {STATE_COUNT} states + DC</div>
        <h2>
          {FULLY_MODELLED_COUNT === 1
            ? `${modelled} is modelled in full.`
            : `${modelled} are modelled in full.`}{" "}
          {PARTIALLY_MODELLED_COUNT > 0
            ? `${PARTIALLY_MODELLED_COUNT} more ${
                PARTIALLY_MODELLED_COUNT === 1 ? "is" : "are"
              } partially modelled. `
            : ""}
          Every other jurisdiction says exactly how far PathWise has got.
        </h2>
        {/* The counts lead. They were below a four-line paragraph, at 13px — the most scannable and
            most load-bearing object on the page, arriving fourth. Four numbers ARE the coverage
            policy: one modelled, two partial, forty-three sourced, five honestly blank. The prose
            explains them and now follows them. */}
        <div className="cov-counts cov-counts--lead">
          {LEVEL_ORDER.filter((l) => LEVEL_COUNTS[l] > 0).map((level, i) => {
            const s = LEVEL[level];
            return (
              <span key={level} className="cov-count">
                {i > 0 ? (
                  <span className="cov-sep" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <StatusGlyph status={s.glyph} />
                <strong>{LEVEL_COUNTS[level]}</strong> {s.short}
              </span>
            );
          })}
          <span className="cov-count">
            <span className="cov-sep" aria-hidden="true">
              ·
            </span>
            {JURISDICTION_COUNT} jurisdictions · every source link checked {SOURCES_CHECKED_ON}
          </span>
        </div>

        {/* The same four counts, to scale.
            Read as numerals, "1 · 2 · 43 · 5" is four facts a reader skims. Drawn to width it is a
            single fact they cannot skim: the modelled segment is one fifty-first of the bar, and the
            honest remainder is the rest of it. This is the strongest argument the page makes and it
            was being made in 13px type.
            Widths are computed from LEVEL_COUNTS — the same derived object the numerals above read —
            so the bar cannot disagree with them, and it cannot be made to overstate coverage by
            editing this file. `aria-hidden` because the numerals immediately above already state
            every value in text; a screen reader should hear them once. */}
        <div className="cov-bar" aria-hidden="true">
          {LEVEL_ORDER.filter((l) => LEVEL_COUNTS[l] > 0).map((level) => (
            <span
              key={level}
              className={`cov-bar-seg cov-bar-seg--${LEVEL[level].glyph}`}
              style={{ flexGrow: LEVEL_COUNTS[level] }}
              title={`${LEVEL_COUNTS[level]} ${LEVEL[level].short}`}
            />
          ))}
        </div>
        <p>
          Residency and state aid are decided state by state, so a system that only ever worked in
          one of them would not be a system. PathWise keeps every rule in a versioned rule pack — the
          authority, the source URL, the date it was verified, and the conditions themselves — and
          the engines read those files.{" "}
          <strong>
            Nothing below is typed into this page: each status is derived from what that
            jurisdiction&apos;s registered pack declares it can answer.
          </strong>{" "}
          A state cannot be shown as modelled by editing the map — only by authoring a pack that says
          so and passing the tests that check the claim.
        </p>
      </div>

      {/* The distinction this page exists to make, raised out of the fourth legend row.
          "Unable to verify" and "not modelled" are separate levels in the pack, separately
          counted in the four numbers above, and a reader who does not know why will read the
          five as a rounding error rather than as the most careful thing on the screen. The
          legend below still carries the pack's own words for each level, unchanged — this only
          states, in PathWise's voice, why two of them are kept apart. */}
      <h2 className="section-head">
        What each level means — and why &ldquo;unable to verify&rdquo; is not &ldquo;not
        modelled&rdquo;
      </h2>
      {/* Deliberately the one phrase the legend card below also carries, and nothing else it
          carries: the card is the glossary definition, this is the reason the distinction exists.
          An earlier draft of this note restated the card's other sentence too, which read as an
          editing mistake rather than as emphasis. */}
      <p className="section-note">
        One is work not done. The other is work done that failed. A single &ldquo;unsupported&rdquo;
        badge would hide which of the two you were looking at, so PathWise keeps them as separate
        levels and counts them separately above.
      </p>
      <ul className="cov-legend">
        {LEVEL_ORDER.map((level) => {
          const s = LEVEL[level];
          return (
            <li key={level}>
              <span className={`cov-legend-k ${s.key}`}>
                <StatusGlyph status={s.glyph} />
                {s.word}
              </span>
              <span className="cov-legend-v">{COVERAGE_LEGEND[level]}</span>
            </li>
          );
        })}
      </ul>

      <h2 className="section-head">
        Every jurisdiction, in order — residency and state aid rated separately
        {notModelled > 0
          ? `, including the ${notModelled} where the answer is still "not yet"`
          : ""}
      </h2>
      <div className="cov-grid">
        {COVERAGE.map((j) => (
          <CoverageTile key={j.code} j={j} />
        ))}
      </div>

      <h2 className="section-head">The rules themselves</h2>
      <RulePackViewer />

      <footer className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · A jurisdiction
        moves up this list when someone authors its rule pack against the primary source and dates
        it — and the list moves with it, because it is read from the packs. Until then PathWise says
        so rather than guessing.{" "}
        {SOURCED_ONLY_COUNT > 0
          ? `${SOURCED_ONLY_COUNT} jurisdiction${
              SOURCED_ONLY_COUNT === 1 ? " has" : "s have"
            } a verified official source but no authored rules — PathWise can name who decides and link the rule, and will not go further than that. `
          : ""}
        PathWise advises; the office decides.
      </footer>
    </>
  );
}
