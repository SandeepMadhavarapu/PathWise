// HeroFinding.tsx — the cross-domain claim, stated for whichever jurisdiction actually decided it.
//
// The frame ("one fact, two doors") is PathWise's own voice and belongs here. The rule inside it is
// not: `residencyText` is the deciding pack's own words, carried on the finding's rule_citation, and
// the jurisdiction is named from the resolved context. Nothing on this component is typed by hand
// about a state — which is what lets /check render it from data instead of guarding it with an `if`.
//
// On presentation: this is the product's thesis and it used to be the quietest element on the page.
// The doors were painted in --canvas, the same colour as the page behind them, outlined in the
// lightest border token, and carried no StatusGlyph and no Capsule — so the one component whose
// whole job is to say "BLOCKED" was also the only one in the app that did not speak the app's own
// status vocabulary, while the progress gauges below it got fill, colour and markers. The hierarchy
// below is deliberate and it is the same order a reader needs it in: the fact, then the two
// consequences, then each one's status, then who decides it, then the authority.

import { formatImmigrationStatus } from "@/lib/format";
import { StatusGlyph } from "./StatusGlyph";
import { Capsule } from "./Capsule";

interface Door {
  /** The system this door belongs to, named for the jurisdiction that decides it. */
  system: string;
  /** Why it is closed, in the deciding pack's words. */
  why: string;
  /** The office that actually rules on it — never PathWise. */
  office: string;
  cite: string;
}

export function HeroFinding({
  studentName,
  statusLabel,
  jurisdictionName,
  residencyText,
  residencyCite,
  residencyOffice,
  aidCite,
  aidOffice,
  voice = "third",
}: {
  studentName: string;
  statusLabel: string;
  /** The resolved jurisdiction's name — never a literal. */
  jurisdictionName: string;
  /** Why the residency door is closed, in the pack's words (`finding.rule_citation.text`). */
  residencyText: string;
  residencyCite: string;
  /** Already formatted for display by the caller, from the finding's own `deciding_office`. */
  residencyOffice: string;
  aidCite: string;
  aidOffice: string;
  voice?: "second" | "third";
}) {
  const second = voice === "second";
  const statusDisplay = formatImmigrationStatus(statusLabel);
  const subject = second ? "you" : "her";
  const possessive = second ? "your" : `${studentName}'s`;

  const doors: Door[] = [
    {
      system: `${jurisdictionName} in-state residency`,
      why: residencyText,
      office: residencyOffice,
      cite: residencyCite,
    },
    {
      system: `${jurisdictionName} state financial aid`,
      why: `The same status makes ${subject} ineligible for ${jurisdictionName} state aid, before need, merit or paperwork is reached.`,
      office: aidOffice,
      cite: aidCite,
    },
  ];

  return (
    <div className="hero surface">
      <div className="eyebrow">The cross-domain finding</div>

      <div className="hero-fact">
        <span className="hero-fact-k">One fact</span>
        <h2 className="hero-fact-v">
          {second ? "Your" : `${studentName}'s`} <strong>{statusDisplay}</strong> status.
        </h2>
      </div>

      <div className="hero-split" aria-hidden="true">
        <span className="hero-split-line" />
        <span className="hero-split-note">closes two doors, in two different buildings</span>
        <span className="hero-split-line" />
      </div>

      <div className="doors">
        {doors.map((door) => (
          <div className="door blocked" key={door.system}>
            <div className="door-head">
              <StatusGlyph status="blocked" />
              <span className="door-system">{door.system}</span>
              <Capsule variant="tinted" status="blocked">
                Blocked
              </Capsule>
            </div>
            <p className="door-why">{door.why}</p>
            <div className="door-foot">
              <span className="door-office">Decided by {door.office}</span>
              {door.cite ? <span className="cite wrap">{door.cite}</span> : null}
            </div>
          </div>
        ))}
      </div>

      <p className="hero-foot">
        Three different offices each decide part of {possessive} future and none of them sees the
        others — so nobody but {second ? "you" : studentName} is in a position to notice that one
        fact closed both of these. PathWise advises; the office decides.
      </p>
    </div>
  );
}
