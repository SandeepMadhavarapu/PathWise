"use client";

// Coverage map + rule-pack viewer — the screen that answers "does this generalise?".
//
// Everything on this page is read out of the rule packs themselves: the jurisdiction list and its
// counts come from rulepacks/coverage.json, the legend wording is the pack's own legend, and the
// viewer below prints the real files byte for byte. Nothing here is typed by hand, because the
// claim being made — that a jurisdiction is data, not code — is only worth anything if the screen
// proving it is also reading the data.

import { useState } from "react";

import {
  COVERAGE_COUNTS,
  COVERAGE_LEGEND,
  COVERAGE_VERIFIED_ON,
  IMPLEMENTED_COUNT,
  JURISDICTIONS,
  JURISDICTION_COUNT,
  NOT_YET_COUNT,
  STATE_COUNT,
  UNMODELLED_COUNT,
  type CoverageStatus,
  type Jurisdiction,
} from "@/lib/coverage";
import f1Pack from "@/lib/rulepacks/f1-practical-training.json";
import vaDomicilePack from "@/lib/rulepacks/va-domicile.json";
import vaAidPack from "@/lib/rulepacks/va-aid.json";
import consequencePack from "@/lib/rulepacks/consequence-map.json";
import { StatusGlyph } from "@/components/StatusGlyph";
import type { StatusKey as GlyphStatus } from "@/lib/tokens";

// The app's four-state vocabulary, applied to our own coverage. A state we haven't modelled is an
// "unable to verify", not an error — the same honesty the engines use about a student's record.
// `glyph` is the shared design-system token so this page's status reads identically to every other.
const STATUS: Record<
  CoverageStatus,
  { key: "verified" | "attention" | "unknown"; glyph: GlyphStatus; word: string; count: string }
> = {
  implemented: { key: "verified", glyph: "done", word: "Modelled & verified", count: "fully modelled" },
  schema_ready: { key: "attention", glyph: "warn", word: "Schema ready", count: "schema-ready" },
  not_yet: { key: "unknown", glyph: "idle", word: "Not yet modelled", count: "not yet" },
};

// The order the legend and the counts are read in — the confident state first, the honest one last.
const STATUS_ORDER: CoverageStatus[] = ["implemented", "schema_ready", "not_yet"];

// Every count on this page — the header, the tallies, the "not yet" remainder — is derived from
// coverage.json by lib/coverage.ts, never written down here.

// The header fields every pack is expected to carry. consequence-map.json deliberately has no
// single external authority — each consequence inside it carries its own citation — so these are
// optional and the UI says so rather than inventing a source.
interface PackMeta {
  pack_id: string;
  domain?: string;
  jurisdiction?: string;
  authority?: string;
  source_url?: string;
  guidelines_effective?: string;
  verified_on?: string;
  volatility?: { status: string; note: string };
}

interface PackEntry {
  file: string;
  tab: string;
  title: string;
  blurb: string;
  data: unknown;
}

const PACKS: PackEntry[] = [
  {
    file: "f1-practical-training.json",
    tab: "f1-practical-training",
    title: "F-1 practical training",
    blurb:
      "The CPT cliff, the OPT budget and the unemployment clock. Federal, so it is the one pack every jurisdiction shares.",
    data: f1Pack,
  },
  {
    file: "va-domicile.json",
    tab: "va-domicile",
    title: "Virginia domicile",
    blurb:
      "The residency gates, the durational clock and the intent factors. This is the file a second state would be a copy of.",
    data: vaDomicilePack,
  },
  {
    file: "va-aid.json",
    tab: "va-aid",
    title: "Virginia financial aid",
    blurb:
      "Which form applies, what blocks state aid, and the deadlines the aid engine resolves an earliest-of over.",
    data: vaAidPack,
  },
  {
    file: "consequence-map.json",
    tab: "consequence-map",
    title: "Event consequence map",
    blurb:
      "One life event → what it changes in all three domains. The table that makes PathWise one product instead of three.",
    data: consequencePack,
  },
];

function CoverageTile({ j }: { j: Jurisdiction }) {
  const [open, setOpen] = useState(false);
  const s = STATUS[j.status];

  const body = (
    <>
      <span className="cov-top">
        <StatusGlyph status={s.glyph} />
        <span className="cov-code">{j.code}</span>
        {j.note ? (
          <span className="cov-more" aria-hidden="true">
            {open ? "−" : "+"}
          </span>
        ) : null}
      </span>
      <span className="cov-name">{j.name}</span>
      <span className={`cov-word ${s.key}`}>{s.word}</span>
      {j.note && open ? <span className="cov-note">{j.note}</span> : null}
    </>
  );

  if (!j.note) {
    return <div className={`cov-tile ${s.key}`}>{body}</div>;
  }

  // title carries the note on hover; the explicit aria-label keeps the spoken name complete,
  // because a bare title would otherwise be announced in place of the state and its status.
  return (
    <button
      type="button"
      className={`cov-tile has-note ${s.key} ${open ? "open" : ""}`}
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      title={j.note}
      aria-label={`${j.name} — ${s.word}. ${j.note}`}
    >
      {body}
    </button>
  );
}

function RulePackViewer() {
  const [active, setActive] = useState(0);
  const pack = PACKS[active];
  const meta = pack.data as PackMeta;
  const json = JSON.stringify(pack.data, null, 2);
  const lines = json.split("\n").length;

  return (
    <>
      <p className="rp-frame">
        Adding a jurisdiction means authoring one of these files — not writing code.
      </p>

      <div className="rp-tabs" role="tablist" aria-label="Rule packs">
        {PACKS.map((p, i) => (
          <button
            key={p.file}
            type="button"
            role="tab"
            id={`rp-tab-${p.tab}`}
            aria-selected={i === active}
            aria-controls="rp-panel"
            className={`rp-tab ${i === active ? "active" : ""}`}
            onClick={() => setActive(i)}
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
              "No single external authority — every consequence in this file carries its own citation."}
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
          <span className="rp-filename">lib/rulepacks/{pack.file}</span>
          <span>
            {lines} lines · read-only
          </span>
        </div>
        <pre className="rp-json" tabIndex={0}>
          {json}
        </pre>
      </section>
    </>
  );
}

export default function CoveragePage() {
  return (
    <>
      <div className="jintro surface">
        <div className="jintro-eyebrow">Coverage · {STATE_COUNT} states + DC</div>
        <h2>
          {IMPLEMENTED_COUNT === 1
            ? "One state is fully modelled."
            : `${IMPLEMENTED_COUNT} states are fully modelled.`}{" "}
          The other {UNMODELLED_COUNT} are the same shape of file.
        </h2>
        <p>
          Residency and state aid are decided state by state, so a system that only ever worked in
          Virginia would not be a system. PathWise keeps every rule in a versioned rule pack — the
          authority, the source URL, the date it was verified, and the conditions themselves — and
          the engines read those files. Below is exactly how far that has been carried, including
          the {NOT_YET_COUNT} states where the honest answer is &ldquo;not yet.&rdquo;
        </p>
        <div className="cov-counts">
          {STATUS_ORDER.map((status, i) => {
            const s = STATUS[status];
            return (
              <span key={status} className="cov-count">
                {i > 0 ? (
                  <span className="cov-sep" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <StatusGlyph status={s.glyph} />
                <strong>{COVERAGE_COUNTS[status] ?? 0}</strong> {s.count}
              </span>
            );
          })}
          <span className="cov-count">
            <span className="cov-sep" aria-hidden="true">
              ·
            </span>
            {JURISDICTION_COUNT} jurisdictions, verified {COVERAGE_VERIFIED_ON}
          </span>
        </div>
      </div>

      <div className="section-head">What each state of coverage means</div>
      <ul className="cov-legend">
        {STATUS_ORDER.map((status) => {
          const s = STATUS[status];
          return (
            <li key={status}>
              <span className={`cov-legend-k ${s.key}`}>
                <StatusGlyph status={s.glyph} />
                {s.word}
              </span>
              <span className="cov-legend-v">{COVERAGE_LEGEND[status]}</span>
            </li>
          );
        })}
      </ul>

      <div className="section-head">
        Every jurisdiction, in order — the ones we can&apos;t do yet included
      </div>
      <div className="cov-grid">
        {JURISDICTIONS.map((j) => (
          <CoverageTile key={j.code} j={j} />
        ))}
      </div>

      <div className="section-head">The rules themselves</div>
      <RulePackViewer />

      <div className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · A state moves from
        &ldquo;not yet&rdquo; to &ldquo;modelled&rdquo; when someone authors its rule pack against
        the primary source and dates it. Until then PathWise says so rather than guessing. PathWise
        advises; the office decides.
      </div>
    </>
  );
}
