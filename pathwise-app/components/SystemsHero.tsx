// SystemsHero — the landing page's argument, computed instead of asserted.
//
// The landing used to state the thesis in a sentence ("Three offices decide your fate…") and then
// show nothing. A judge learned THAT PathWise reasons across three systems and saw no evidence of
// what reasoning across them produces, so the first thirty seconds — the only thirty seconds some
// judges spend — carried the weakest part of the product.
//
// Everything below is the real engines run over the real example student, at build time. The status
// of each row, the office that decides it, the number on the immigration row and every citation are
// engine output; the only thing this component contributes is the order the three are read in. That
// matters more than it sounds: it means the landing page cannot make a claim the app can't back,
// because the landing page IS the app, running.
//
// No network, no new dependency, no new visual language — StatusGlyph, Capsule and .cite are the
// same atoms every finding screen already uses.

import { computeCptLedger, CLIFF_DAYS, SECTION_CITE } from "@/lib/engines/cpt-ledger";
import { aidFindingFor, jurisdictionFor, residencyFindingFor } from "@/lib/engines/jurisdiction";
import { priyaStudent, priyaEvents, priyaAid } from "@/lib/fixtures/priya";
import { formatDecidingOffice, formatImmigrationStatus } from "@/lib/format";
import { statusFromBand, statusFromFindingResult, type StatusKey } from "@/lib/tokens";
import type { Finding } from "@/lib/types";
import Link from "next/link";
import { cptLevelChangeReadings } from "@/lib/readings";
import { StatusGlyph } from "./StatusGlyph";
import { Capsule } from "./Capsule";
import { UncertaintyBand } from "./UncertaintyBand";

/** A ledger band in the app's own status words — the same three the dashboard and the plan use. */
const BAND_WORD: Record<"green" | "amber" | "red", string> = {
  green: "On track",
  amber: "Attention",
  red: "Blocked",
};

/** How a finding's verdict is worded on a one-line row. The full vocabulary lives in FindingDetail. */
const VERDICT: Record<Finding["result"], string> = {
  ineligible: "Blocked",
  potential_risk: "At risk",
  review_recommended: "Needs review",
  unable_to_verify: "Unable to verify",
  no_issue: "Clear",
};

interface SystemRow {
  system: string;
  office: string;
  status: StatusKey;
  verdict: string;
  finding: string;
  cite: string;
}

export function SystemsHero() {
  const jx = jurisdictionFor(priyaStudent);
  // The refusal below is only rendered if the engines actually disagree — see lib/readings.ts.
  const readings = cptLevelChangeReadings();

  const ledger = computeCptLedger(priyaEvents);
  const masters = ledger.forLevel("masters");

  const residency = residencyFindingFor(jx, {
    student: priyaStudent,
    events: priyaEvents,
    intentFactors: [],
    allegedEntitlementDate: "2026-08-24",
  });
  const aid = aidFindingFor(jx, priyaAid);

  const statusDisplay = formatImmigrationStatus(priyaStudent.immigration.status);

  const rows: SystemRow[] = [
    {
      system: `Immigration (${statusDisplay})`,
      office: formatDecidingOffice("SEVP"),
      status: masters ? statusFromBand(masters.band) : "idle",
      verdict: masters ? `${masters.daysToCliff} days of margin` : "No CPT on record",
      finding: masters
        ? `${masters.fullTimeDays} full-time CPT days counted at the master's level, against the ${CLIFF_DAYS}-day cliff that ends OPT eligibility.`
        : "",
      cite: SECTION_CITE,
    },
    {
      system: `In-state residency (${jx.name})`,
      office: formatDecidingOffice(residency.deciding_office),
      status: statusFromFindingResult(residency.result),
      verdict: VERDICT[residency.result],
      finding: residency.rule_citation.text,
      cite: jx.display?.residencyCite ?? "",
    },
    {
      system: `State financial aid (${jx.name})`,
      office: formatDecidingOffice(aid.deciding_office),
      status: statusFromFindingResult(aid.result),
      verdict: VERDICT[aid.result],
      finding: `${aid.headline}, before need, merit or paperwork is reached.`,
      cite: jx.display?.aidCite ?? "",
    },
  ];

  return (
    <section className="sh surface" aria-label="How one fact is read by three systems">
      <div className="sh-fact">
        <span className="sh-fact-k">One fact</span>
        <p className="sh-fact-v">
          Priya holds <strong>{statusDisplay}</strong> status.
        </p>
      </div>

      <div className="sh-flow" aria-hidden="true">
        <span className="sh-flow-line" />
        <span className="sh-flow-note">read by three systems that never speak to each other</span>
        <span className="sh-flow-line" />
      </div>

      <ul className="sh-rows">
        {rows.map((row) => (
          <li className={`sh-row ${row.status}`} key={row.system}>
            <StatusGlyph status={row.status} />
            <div className="sh-row-body">
              <div className="sh-row-top">
                <span className="sh-row-system">{row.system}</span>
                <Capsule variant="tinted" status={row.status}>{row.verdict}</Capsule>
              </div>
              <p className="sh-row-finding">{row.finding}</p>
              <div className="sh-row-foot">
                <span className="sh-row-office">Decided by {row.office}</span>
                {row.cite ? <span className="cite wrap">{row.cite}</span> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* THE FOURTH ROW, and the reason the landing page now shows what it previously only claimed.
          The three rows above are findings PathWise reached. This is one it refused to reach — and
          it is the differentiator, so leaving it two clicks away on /student/changed while section
          two of this page ASSERTED it in prose was the single largest gap between what this product
          does and what a visitor could see it doing.
          Both ends are real ledger runs over the same authorizations (lib/readings.ts). Nothing here
          is a mock-up of the screen it links to; it is the same computation, drawn smaller. */}
      {readings.disagree ? (
        <div className="sh-refusal">
          <div className="sh-refusal-head">
            <span className="sh-refusal-k">And one it would not make</span>
            <Link href="/student/changed" className="sh-refusal-go">
              Watch it change its mind →
            </Link>
          </div>
          {/* The settled props are unreachable here — this band is never settled on the landing —
              but they are derived rather than typed all the same, so they cannot become a stale
              literal if that ever changes. "On track" was wrong on the record it describes: the
              ledger bands 342 days amber. */}
          <UncertaintyBand
            compact
            lo={readings.settled.fullTimeDays}
            hi={readings.pooled.fullTimeDays}
            cliff={readings.cliff}
            unit={`${readings.cliff}-day cliff`}
            settled={false}
            loLabel="if the level change holds"
            hiLabel="if it can't be shown"
            settledStatus={statusFromBand(readings.settled.band)}
            settledLabel={BAND_WORD[readings.settled.band]}
          />
          <p className="sh-refusal-why">
            One missing document — the form recording her level change between two schools. The same
            engine reads {readings.settled.fullTimeDays} days with it and{" "}
            {readings.pooled.fullTimeDays} without, and the cliff sits between the two answers. So
            PathWise says so, instead of picking one.
          </p>
        </div>
      ) : null}

      <p className="sh-foot">
        Not a summary — three findings and one refusal, computed on this page by the same engines the
        app runs on. PathWise advises; the office decides.
      </p>
    </section>
  );
}
