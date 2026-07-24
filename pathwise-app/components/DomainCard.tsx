type Band = "green" | "amber" | "red";

export function DomainCard({
  domain,
  status,
  band,
  detail,
  cite,
}: {
  domain: string;
  status: string;
  band: Band;
  detail: string;
  cite?: string;
}) {
  const label = band === "green" ? "On track" : band === "amber" ? "Attention" : "Blocked";
  return (
    <div className="card">
      <div className="domain">{domain}</div>
      <div className="status">{status}</div>
      <span className={`badge ${band}`}>{label}</span>
      <div className="detail" style={{ marginTop: 8 }}>
        {detail} {cite ? <span className="cite">{cite}</span> : null}
      </div>
    </div>
  );
}
