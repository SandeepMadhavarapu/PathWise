import Link from "next/link";
import { statusFromBand, type EngineBand } from "@/lib/tokens";
import { StatusGlyph } from "./StatusGlyph";
import { SegmentedProgress, type ProgressSegment, type ProgressLegendItem } from "./SegmentedProgress";

export function DomainCard({
  domain,
  decidingOffice,
  status,
  band,
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
  detail: string;
  cite?: string;
  progress?: { segments: ProgressSegment[]; legend?: ProgressLegendItem[] };
  detailHref?: string;
  detailLabel?: string;
}) {
  const statusKey = statusFromBand(band);

  return (
    <div className="surface domain-card">
      <div className="domain-card-head">
        <StatusGlyph status={statusKey} />
        <div className="domain-card-head-text">
          <div className="t-card-title">{domain}</div>
          {decidingOffice ? <div className="t-meta">{decidingOffice}</div> : null}
        </div>
      </div>

      {progress ? (
        <div className="domain-card-progress">
          <SegmentedProgress segments={progress.segments} legend={progress.legend} ariaLabel={`${domain} progress`} />
        </div>
      ) : null}

      <ul className="domain-card-findings">
        <li className="domain-card-finding-row">
          <span className="t-row-title">{status}</span>
        </li>
        <li className="domain-card-finding-row">
          <span className="t-meta">
            {detail} {cite ? <span className="cite">{cite}</span> : null}
          </span>
        </li>
      </ul>

      {detailHref ? (
        <Link href={detailHref} className="domain-card-more">
          {detailLabel ?? "See full reasoning →"}
        </Link>
      ) : null}
    </div>
  );
}
