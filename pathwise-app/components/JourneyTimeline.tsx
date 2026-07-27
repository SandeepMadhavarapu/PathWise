"use client";

// JourneyTimeline — the persistent record. Every row here is derived from the student's
// events + institutions; nothing is authored per-student. Status on each row comes from the
// real CPT ledger, so the timeline and the dashboard can never disagree.

import { useState } from "react";
import type { Event, Institution, ProgramLevel, Student } from "@/lib/types";
import {
  CLIFF_DAYS,
  FULL_TIME_HOURS_THRESHOLD,
  SECTION_CITE,
  type LedgerResult,
} from "@/lib/engines/cpt-ledger";
import { CLOCK_START_CITE } from "@/lib/engines/unemployment-clock";
import { jurisdictionFor } from "@/lib/engines/jurisdiction";
import { domicileView, lowerLabel } from "@/lib/engines/domicile-gate";
import { formatImmigrationStatus } from "@/lib/format";
import type { StatusKey as GlyphStatus } from "@/lib/tokens";
import { StatusGlyph } from "./StatusGlyph";
import { Capsule } from "./Capsule";

type StatusKey = "verified" | "attention" | "blocked" | "unknown";

const STATUS: Record<StatusKey, { glyph: GlyphStatus; word: string }> = {
  verified: { glyph: "done", word: "On track" },
  attention: { glyph: "warn", word: "Attention" },
  blocked: { glyph: "blocked", word: "Blocked" },
  unknown: { glyph: "idle", word: "Unable to verify" },
};

interface Row {
  key: string;
  instKey: string;
  instName: string;
  instMeta: string;
  level?: ProgramLevel;
  title: string;
  meta?: string;
  dateLabel: string;
  periodLabel: string;
  typeLabel: string;
  status: StatusKey;
  statusLine: string;
  evidence: string[];
  evidenceNote?: string;
  why: string;
  cite?: string;
  gap?: { what: string; how: string };
  inferred?: boolean;
}

interface Group {
  key: string;
  heading: string;
  meta: string;
  level?: ProgramLevel;
  rows: Row[];
  transitionBefore?: Row;
}

// ---- formatting helpers (deterministic: no locale, no timezone) ----

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

function ordinal(iso: string): number {
  return Math.floor(Date.parse(iso + "T00:00:00Z") / 86_400_000);
}

function inclusiveDays(from: string, to: string): number {
  return ordinal(to) - ordinal(from) + 1;
}

function levelLabel(level?: ProgramLevel): string {
  if (level === "bachelors") return "Bachelor's";
  if (level === "masters") return "Master's";
  if (level === "doctoral") return "Doctoral";
  return "Other";
}

const statusLabel = formatImmigrationStatus;

function titleFor(type: string): string {
  switch (type) {
    case "program_start": return "Program start";
    case "program_end": return "Program end";
    case "cpt_auth": return "CPT authorization";
    case "opt_auth": return "OPT authorization";
    case "ead_issued": return "EAD issued";
    case "i20_issued": return "I-20 issued";
    case "enrollment": return "Enrollment";
    case "transfer": return "Transfer";
    case "level_change": return "Level change";
    case "employment": return "Employment";
    case "status_change": return "Status change";
    default: return type.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  }
}

function evidenceLabel(id: string): string {
  if (id.startsWith("i20")) return "Form I-20";
  if (id.startsWith("ead")) return "EAD card";
  if (id.startsWith("offer")) return "Offer letter";
  if (id.startsWith("lease")) return "Lease";
  if (id.startsWith("tax")) return "Tax return";
  return "Document";
}

// ---- derivation ----

function rowForEvent(ev: Event, inst: Institution | undefined, ledger: LedgerResult): Row {
  const level = ev.program_level ?? inst?.level;
  const led = level ? ledger.forLevel(level) : undefined;
  const hours = typeof ev.attrs.hours_per_week === "number" ? ev.attrs.hours_per_week : undefined;
  // Same test the ledger applies (strictly greater than the pack threshold), off the same value —
  // the row's "full-time" label cannot disagree with the days the engine counted.
  const fullTime = hours !== undefined && hours > FULL_TIME_HOURS_THRESHOLD;

  const dateLabel = ev.end_date ? `${fmtDate(ev.date)} → ${fmtDate(ev.end_date)}` : fmtDate(ev.date);
  const periodLabel = ev.end_date
    ? `${fmtDate(ev.date)} – ${fmtDate(ev.end_date)} · ${inclusiveDays(ev.date, ev.end_date)} days`
    : `${fmtDate(ev.date)} · single date`;

  let status: StatusKey = ev.evidence_ids.length > 0 ? "verified" : "unknown";
  let statusLine = "Backed by a document on file.";
  let why = "Part of the record every finding is read from.";
  let cite: string | undefined;
  let meta: string | undefined;

  if (ev.type === "cpt_auth") {
    meta = hours !== undefined ? `${hours} hrs/week · ${fullTime ? "full-time" : "part-time"}` : undefined;
    cite = SECTION_CITE;

    if (led) {
      if (ev.evidence_ids.length === 0) {
        status = "unknown";
      } else if (led.band === "red") {
        status = "blocked";
      } else if (led.band === "amber") {
        status = "attention";
      } else {
        status = "verified";
      }

      statusLine =
        led.band === "green"
          ? `Counted at the ${levelLabel(level).toLowerCase()} level: ${led.fullTimeDays} full-time days, ${led.daysToCliff} still clear of the cliff.`
          : led.band === "amber"
            ? `Counted at the ${levelLabel(level).toLowerCase()} level: ${led.fullTimeDays} of ${CLIFF_DAYS} full-time days used — ${led.daysToCliff} days from the cliff.`
            : `The ${levelLabel(level).toLowerCase()} level has passed ${CLIFF_DAYS} full-time days; OPT at this level is gone.`;

      why = fullTime
        ? `Feeds the CPT ledger at the ${levelLabel(level).toLowerCase()} level, and with it the ${CLIFF_DAYS}-day cliff — at ${CLIFF_DAYS} full-time days, OPT at this level disappears. This authorization is counted in full because it is over ${FULL_TIME_HOURS_THRESHOLD} hrs/week.`
        : `Feeds the CPT ledger at the ${levelLabel(level).toLowerCase()} level. Under ${FULL_TIME_HOURS_THRESHOLD} hrs/week it is part-time on its own — but concurrent authorizations aggregate, so where it overlaps another one the summed hours pass ${FULL_TIME_HOURS_THRESHOLD}/week and those days count as full-time. ${led.overlapDays} of her ${led.fullTimeDays} full-time days were created that way.`;

      if (level !== "masters") {
        why += ` The cap is per education level, so these days are kept out of her master's count entirely.`;
      }
    }
  } else if (ev.type === "program_start") {
    statusLine = `Anchors the ${levelLabel(level).toLowerCase()} record at ${inst?.name ?? "this institution"}.`;
    why = `Sets the level every later authorization is counted at. The ${CLIFF_DAYS}-day CPT cliff is partitioned by level, so where this line falls decides which ledger each authorization lands in.`;
    cite = SECTION_CITE;
  } else if (ev.type === "program_end") {
    statusLine = "The completion date every post-completion clock is measured from.";
    why =
      "Starts the post-completion OPT window — and the unemployment clock that runs while she job-hunts. Days without qualifying employment accumulate against the cap from here, not from the day she starts looking.";
    cite = CLOCK_START_CITE;
  }

  return {
    key: ev.id,
    instKey: ev.institution_id ?? "record",
    instName: inst?.name ?? "Student record",
    instMeta: inst ? `${levelLabel(inst.level)} · ${inst.state}` : "no institution attached",
    level,
    title: titleFor(ev.type),
    meta,
    dateLabel,
    periodLabel,
    typeLabel: ev.type,
    status,
    statusLine,
    evidence: ev.evidence_ids,
    evidenceNote:
      ev.evidence_ids.length === 0
        ? "No document linked — this rests on the student record alone."
        : `Confidence: ${ev.confidence}.`,
    why,
    cite,
  };
}

export function buildJourney(student: Student, events: Event[], ledger: LedgerResult): Group[] {
  const instById = new Map(student.institutions.map((i) => [i.id, i]));
  // The status row below names the state whose door the status closes, so it needs to know which
  // state that is. Resolved from the student's own record; absent cite for a state with no pack.
  const jx = jurisdictionFor(student);
  // And whether that state's gate is actually what this status trips — the difference between
  // quoting a rule and inventing one for a jurisdiction PathWise has never read.
  const view = jx.packs ? domicileView(jx.packs.domicile) : undefined;
  const gate = view?.gateStatuses.has(student.immigration.status) ? view : undefined;

  const rows: Row[] = [...events]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map((ev) => rowForEvent(ev, ev.institution_id ? instById.get(ev.institution_id) : undefined, ledger));

  // The status itself is a timeline fact: it is the single input behind two blocked findings.
  const since = student.immigration.status_since;
  if (since) {
    rows.unshift({
      key: "status-since",
      instKey: "record",
      instName: "Student record",
      instMeta: "no institution attached",
      title: `${statusLabel(student.immigration.status)} status begins`,
      meta: `Held continuously since ${fmtDate(since)}`,
      dateLabel: fmtDate(since),
      periodLabel: `${fmtDate(since)} → present`,
      typeLabel: "status_change",
      status: "verified",
      statusLine: "On the student record and unchanged since — no prior status on file.",
      evidence: [],
      evidenceNote: "No document linked — this rests on the student record alone.",
      // What this status DOES is a rule, and a rule belongs to a jurisdiction. With a pack whose
      // gate this status trips, the pack's own words say why; without one, PathWise has no gate to
      // reason from and says only what is true everywhere — that the status is federal, and the
      // state question is open. It must not name a state and then assert a rule for it.
      why: gate
        ? `The one fact both blocked findings are built on: ${lowerLabel(gate.gateExplain)} Without domicile there is no ${jx.name} state aid. It also sets which practical-training rules apply at all.`
        : `The single fact the federal findings below are built on. What it means for ${jx.name} residency and state aid depends on ${jx.name}'s own rules, which PathWise has not modelled.`,
      cite: jx.display?.residencyCite,
    });
  }

  // Group consecutive rows by institution, so a return to an earlier school reads as its own chapter.
  const groups: Group[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.key.startsWith(row.instKey + "#")) {
      last.rows.push(row);
      continue;
    }
    const inst = instById.get(row.instKey);
    groups.push({
      key: `${row.instKey}#${groups.length}`,
      heading: inst ? inst.name : "Immigration record",
      meta: inst
        ? `${levelLabel(inst.level)} · ${inst.state}`
        : `${statusLabel(student.immigration.status)} · the record every school reads from`,
      level: inst?.level,
      rows: [row],
    });
  }

  // A level boundary between two institutions is real but undocumented: show it as an honest gap
  // rather than inventing a transfer event that no evidence supports.
  for (let i = 1; i < groups.length; i++) {
    const prev = groups[i - 1];
    const cur = groups[i];
    if (!prev.level || !cur.level || prev.level === cur.level) continue;

    const lastPrev = prev.rows[prev.rows.length - 1];
    const firstCur = cur.rows[0];
    const cliffLine = ledger.forLevel(cur.level);

    cur.transitionBefore = {
      key: `transition-${i}`,
      instKey: cur.key,
      instName: `${prev.heading} → ${cur.heading}`,
      instMeta: `${levelLabel(prev.level)} → ${levelLabel(cur.level)}`,
      level: cur.level,
      title: `Level change to ${levelLabel(cur.level).toLowerCase()}`,
      meta: `${prev.heading} (${levelLabel(prev.level).toLowerCase()}) → ${cur.heading} (${levelLabel(cur.level).toLowerCase()})`,
      dateLabel: `between ${lastPrev.dateLabel.split(" → ").pop()} and ${firstCur.dateLabel.split(" → ")[0]}`,
      periodLabel: `Somewhere between ${lastPrev.dateLabel.split(" → ").pop()} and ${firstCur.dateLabel.split(" → ")[0]} — the exact date is not on record.`,
      typeLabel: "level_change (derived)",
      status: "unknown",
      statusLine: "Inferred from the order of her records, not from a document.",
      evidence: [],
      evidenceNote: "Nothing linked — this row is derived from the records around it, not documented by one.",
      gap: {
        what: "No transfer or level-change document on record — PathWise inferred this boundary from the levels on either side of it.",
        how: `Ask School Y's DSO for the I-20 issued when the ${levelLabel(cur.level).toLowerCase()} program began, or confirm the transfer-out date with ${prev.heading}.`,
      },
      why: cliffLine
        ? `This boundary decides which ledger every authorization lands in. The ${CLIFF_DAYS}-day CPT cliff is counted per education level, never summed across them — which is why her ${levelLabel(prev.level).toLowerCase()} days sit apart from the ${cliffLine.fullTimeDays} full-time days now counted at the ${levelLabel(cur.level).toLowerCase()} level.`
        : "This boundary decides which ledger every authorization lands in — the CPT cap is counted per education level.",
      cite: SECTION_CITE,
      inferred: true,
    };
  }

  return groups;
}

// ---- view ----

function StatusChip({ status }: { status: StatusKey }) {
  const s = STATUS[status];
  return (
    <span className="statuschip">
      <StatusGlyph status={s.glyph} />
      {s.word}
    </span>
  );
}

function JourneyRow({
  row,
  open,
  onToggle,
}: {
  row: Row;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `jd-${row.key}`;
  return (
    <li className={`jitem${open ? " open" : ""}${row.inferred ? " inferred" : ""}`}>
      <span className={`jdot ${STATUS[row.status].glyph}`} aria-hidden="true" />
      <div className="jcard">
        <button className="jrow" type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
          <span className="jrow-top">
            <span className="jdate">{row.dateLabel}</span>
            <span className="jtitle">{row.title}</span>
            <span className="jinst">{row.instName}</span>
            <StatusChip status={row.status} />
            <span className="jchev" aria-hidden="true">›</span>
          </span>
          {row.meta ? <span className="jmeta">{row.meta}</span> : null}
        </button>

        {open ? (
          <div className="jdetail" id={panelId}>
            <div className="jfacts">
              <div className="jfact">
                <div className="k">Institution</div>
                <div className="v">
                  {row.instName} <span className="jsub">{row.instMeta}</span>
                </div>
              </div>
              <div className="jfact">
                <div className="k">Period</div>
                <div className="v">{row.periodLabel}</div>
              </div>
              <div className="jfact">
                <div className="k">Type</div>
                <div className="v">
                  {row.title} <Capsule>{row.typeLabel}</Capsule>
                </div>
              </div>
              <div className="jfact">
                <div className="k">Status</div>
                <div className="v">
                  <StatusChip status={row.status} /> <span className="jsub">{row.statusLine}</span>
                </div>
              </div>
            </div>

            {row.evidence.length > 0 || row.evidenceNote ? (
              <div className="jfact jev-block">
                <div className="k">Evidence this rests on</div>
                {row.evidence.length > 0 ? (
                  <ul className="jev">
                    {row.evidence.map((id) => (
                      <li key={id}>
                        {evidenceLabel(id)} <span className="jev-id">{id}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {row.evidenceNote ? <div className="jev-note">{row.evidenceNote}</div> : null}
              </div>
            ) : null}

            {row.gap ? (
              <div className="jgap">
                <div className="k">
                  <span aria-hidden="true">?</span> What&apos;s missing
                </div>
                <div className="v">{row.gap.what}</div>
                <div className="k" style={{ marginTop: 10 }}>
                  How to resolve it
                </div>
                <div className="v">{row.gap.how}</div>
              </div>
            ) : null}

            <div className="jwhy">
              <div className="k">Why this matters</div>
              <div className="v">
                {row.why} {row.cite ? <span className="cite wrap">{row.cite}</span> : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function JourneyTimeline({
  student,
  events,
  ledger,
}: {
  student: Student;
  events: Event[];
  ledger: LedgerResult;
}) {
  const groups = buildJourney(student, events, ledger);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="journey">
      {groups.map((g) => (
        <section className="jgroup" key={g.key}>
          {g.transitionBefore ? (
            <ul className="jlist">
              <JourneyRow
                row={g.transitionBefore}
                open={!!open[g.transitionBefore.key]}
                onToggle={() => toggle(g.transitionBefore!.key)}
              />
            </ul>
          ) : null}

          <div className="jgroup-head">
            <span className="jgroup-mark" aria-hidden="true" />
            <span className="jgroup-name">{g.heading}</span>
            <span className="jgroup-meta">{g.meta}</span>
          </div>

          <ul className="jlist">
            {g.rows.map((row) => (
              <JourneyRow key={row.key} row={row} open={!!open[row.key]} onToggle={() => toggle(row.key)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
