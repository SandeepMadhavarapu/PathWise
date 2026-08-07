import Link from "next/link";
import { statusFromBand, type EngineBand, type StatusKey } from "@/lib/tokens";
import { SegmentedProgress, type ProgressSegment, type ProgressLegendItem } from "./SegmentedProgress";

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
      <span className={`badge ${statusKey}`}>{bandLabel}</span>
      <div className="domain-detail">
        {detail} {cite ? <span className="cite wrap">{cite}</span> : null}
      </div>

      {detailHref ? (
        <Link href={detailHref} className="domain-card-more">
          {detailLabel ?? "See full reasoning →"}
        </Link>
      ) : null}
    </div>
  );
}
