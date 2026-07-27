// HeroFinding.tsx — the cross-domain claim, stated for whichever jurisdiction actually decided it.
//
// The frame ("one fact, two doors") is PathWise's own voice and belongs here. The rule inside it is
// not: `residencyText` is the deciding pack's own words, carried on the finding's rule_citation, and
// the jurisdiction is named from the resolved context. Nothing on this component is typed by hand
// about a state — which is what lets /check render it from data instead of guarding it with an `if`.

import { formatImmigrationStatus } from "@/lib/format";

export function HeroFinding({
  studentName,
  statusLabel,
  jurisdictionName,
  residencyText,
  residencyCite,
  aidCite,
  voice = "third",
}: {
  studentName: string;
  statusLabel: string;
  /** The resolved jurisdiction's name — never a literal. */
  jurisdictionName: string;
  /** Why the residency door is closed, in the pack's words (`finding.rule_citation.text`). */
  residencyText: string;
  residencyCite: string;
  aidCite: string;
  voice?: "second" | "third";
}) {
  const second = voice === "second";
  const statusDisplay = formatImmigrationStatus(statusLabel);

  return (
    <div className="hero surface">
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
          <div className="k">{jurisdictionName} in-state residency</div>
          <div className="v">
            Blocked. {residencyText} <span className="cite">{residencyCite}</span>
          </div>
        </div>
        <div className="door">
          <div className="k">{jurisdictionName} state financial aid</div>
          <div className="v">
            Blocked. The same status makes {second ? "you" : "her"} ineligible for{" "}
            {jurisdictionName} state aid. <span className="cite">{aidCite}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
