import Link from "next/link";
import { statusFromBand, type EngineBand, type StatusKey } from "@/lib/tokens";
import { SegmentedProgress, type ProgressSegment, type ProgressLegendItem } from "./SegmentedProgress";
import { StatusGlyph } from "./StatusGlyph";

export function DomainCard({
  domain,
  decidingOffice,
  status,
  band,
  tone,
  qualifier,
  detail,
  cite,
  progress,
  detailHref,
  detailLabel,
  evidence,
}: {
  domain: string;
  decidingOffice?: string;
  status: string;
  band: EngineBand;
  /**
   * Overrides the glyph derived from `band`.
   *
   * `EngineBand` is green/amber/red and has no neutral member, so a finding of `unable_to_verify`
   * came out amber — the same colour as "there is something here to look at". Not knowing is not a
   * warning, and colouring it as one overstates what PathWise has established.
   *
   * An override rather than a fourth band: EngineBand is consumed by three federal engines and five
   * components, and widening it for a presentation concern on one page would be the larger change.
   */
  tone?: StatusKey;
  /**
   * A short qualifier on the card's own certainty — "partial rules", and nothing longer.
   *
   * A jurisdiction whose pack models only part of a domain rendered a card identical to a fully
   * modelled one: same layout, same weight, same confidence. The level is declared in the pack and
   * shown on /coverage, and it belongs wherever the finding itself is shown.
   */
  qualifier?: string;
  detail: string;
  cite?: string;
  progress?: { segments: ProgressSegment[]; legend?: ProgressLegendItem[] };
  detailHref?: string;
  detailLabel?: string;
  /**
   * The provenance behind this card's verdict, shown on the card itself.
   *
   * Each field is optional on purpose. An unmodelled jurisdiction has no citation and no
   * verification date, and the correct rendering there is nothing at all — not "n/a", not a dash.
   * A placeholder in a provenance block is the one thing this product must never print.
   */
  evidence?: { office?: string; verified?: string; sources?: string };
}) {
  const statusKey = tone ?? statusFromBand(band);
  // The original card's own word for the band, restored. It reads the SAME `band`/`tone` the glyph
  // did, so a card cannot say one thing in its pill and another in its colour.
  const bandLabel =
    statusKey === "idle"
      ? "Unable to verify"
      : band === "green"
        ? "On track"
        : band === "amber"
          ? "Attention"
          : "Blocked";

  /**
   * Whether the evidence block should repeat the deciding office.
   *
   * The office is already the card's subtitle, three lines above — so on a fully modelled finding
   * the block was printing "SEVP", "Domicile Officer", "Financial Aid Office" a second time and
   * calling it evidence. Measured on the Virginia result, each of the three cards carried its
   * office exactly twice, and of the block's three rows only two said anything the card had not
   * already said.
   *
   * But on a jurisdiction with no pack it is the ONLY thing the block can honestly hold: no
   * verification date exists, no source count exists, and inventing either is the one thing this
   * product must never do. There, the office is not a repetition, it is the whole of what is known.
   *
   * So it renders when it is the block's only content, and stands down when the block has
   * something the card has not already said. Ohio keeps "Decision office", then stops.
   */
  const officeRepeatsSubtitle = !!evidence?.office && evidence.office === decidingOffice;
  const evidenceHasMore = !!(evidence?.verified || evidence?.sources);
  const showEvidenceOffice = !!evidence?.office && !(officeRepeatsSubtitle && evidenceHasMore);

  return (
    <div className="surface domain-card">
      {/* The original structure: a small-caps domain label, the status line, the band pill, then
          the detail with its citation. The redesign led with a filled glyph square beside a card
          title; the original led with the domain name and said the state in a dotted pill. */}
      <div className="domain-card-head">
        <div className="domain-card-head-text">
          <div className="domain">
            {domain}
            {qualifier ? <span className="capsule capsule--neutral">{qualifier}</span> : null}
          </div>
          {decidingOffice ? <div className="domain-office">{decidingOffice}</div> : null}
        </div>
      </div>

      {progress ? (
        <div className="domain-card-progress">
          <SegmentedProgress segments={progress.segments} legend={progress.legend} ariaLabel={`${domain} progress`} />
        </div>
      ) : null}

      <div className="domain-status">{status}</div>
      <span className={`badge ${statusKey}`}>
        <StatusGlyph status={statusKey} />
        {bandLabel}
      </span>
      <div className="domain-detail">
        {detail} {cite ? <span className="cite wrap">{cite}</span> : null}
      </div>

      {/* EVIDENCE ON THE CARD.
          The provenance for a finding existed only behind "See full reasoning" — a reader had to
          take the verdict on trust and click to find out who decided it, on what authority, and how
          old the reading was. Those three facts are the product's whole claim, so they belong on the
          face of the card that makes the claim.
          Every row is optional and renders only when the caller has the real value: a jurisdiction
          with no pack has no citation and no verification date, and this block must stay empty
          rather than print a placeholder. */}
      {evidence && (showEvidenceOffice || evidence.verified || evidence.sources) ? (
        <dl className="domain-evidence">
          {showEvidenceOffice ? (
            <>
              <dt>Decision office</dt>
              <dd>{evidence.office}</dd>
            </>
          ) : null}
          {evidence.verified ? (
            <>
              <dt>Rule verified</dt>
              <dd>{evidence.verified}</dd>
            </>
          ) : null}
          {evidence.sources ? (
            <>
              <dt>Evidence</dt>
              <dd>{evidence.sources}</dd>
            </>
          ) : null}
        </dl>
      ) : null}

      {detailHref ? (
        <Link href={detailHref} className="domain-card-more">
          {detailLabel ?? "See full reasoning →"}
        </Link>
      ) : null}
    </div>
  );
}
