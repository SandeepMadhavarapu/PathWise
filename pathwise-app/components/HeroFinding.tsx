export function HeroFinding({
  studentName,
  statusLabel,
  residencyCite,
  aidCite,
}: {
  studentName: string;
  statusLabel: string;
  residencyCite: string;
  aidCite: string;
}) {
  return (
    <div className="hero">
      <div className="eyebrow">The cross-domain finding</div>
      <h1>
        One fact — {studentName}&apos;s {statusLabel} status — closes two doors at once.
      </h1>
      <p>
        Three different offices each decide part of {studentName}&apos;s future, and none of them sees
        the others. But a single fact about her status is the hidden variable across all three. Here it
        is, with the regulation that says so:
      </p>
      <div className="doors">
        <div className="door">
          <div className="k">Virginia in-state residency</div>
          <div className="v">
            Blocked. Holders of a student visa cannot establish domicile in Virginia.{" "}
            <span className="cite">{residencyCite}</span>
          </div>
        </div>
        <div className="door">
          <div className="k">Virginia state financial aid</div>
          <div className="v">
            Blocked. The same status makes her ineligible for Virginia state aid.{" "}
            <span className="cite">{aidCite}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
