// Display-format the visa status code (display text only — never mutates the code value
// or any rule logic): F1 → F-1, J1 → J-1, M1 → M-1. Anything else passes through.
function formatStatus(statusLabel: string): string {
  const map: Record<string, string> = { F1: "F-1", J1: "J-1", M1: "M-1" };
  return map[statusLabel] ?? statusLabel;
}

export function HeroFinding({
  studentName,
  statusLabel,
  residencyCite,
  aidCite,
  voice = "third",
}: {
  studentName: string;
  statusLabel: string;
  residencyCite: string;
  aidCite: string;
  voice?: "second" | "third";
}) {
  const second = voice === "second";
  const statusDisplay = formatStatus(statusLabel);

  return (
    <div className="hero">
      <div className="eyebrow">The cross-domain finding</div>
      <h1>
        One fact —{" "}
        {second ? (
          <>your {statusDisplay}</>
        ) : (
          <>
            {studentName}&apos;s {statusDisplay}
          </>
        )}{" "}
        status — closes two doors at once.
      </h1>
      <p>
        {second ? (
          <>
            Three different offices each decide part of your future, and none of them sees the
            others. But a single fact about your status is the hidden variable across all three.
            Here it is, with the regulation that says so:
          </>
        ) : (
          <>
            Three different offices each decide part of {studentName}&apos;s future, and none of
            them sees the others. But a single fact about her status is the hidden variable across
            all three. Here it is, with the regulation that says so:
          </>
        )}
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
            Blocked. The same status makes {second ? "you" : "her"} ineligible for Virginia state
            aid. <span className="cite">{aidCite}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
