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

      {/* The original hierarchy: one sentence carrying the whole claim, then the two doors under
          it. The redesign split this into a boxed "ONE FACT" label, an oversized status line and a
          hairline divider reading "closes two doors, in two different buildings" — three pieces of
          chrome saying what this single sentence says. `h2`, not `h1`: the shell owns the page's
          h1, and that heading structure is current behaviour worth keeping. */}
      <h2 className="hero-h">
        One fact — {second ? "your" : `${studentName}'s`} <strong>{statusDisplay}</strong> status —
        closes two doors at once.
      </h2>
      <p className="hero-lede">
        Three different offices each decide part of {possessive} future, and none of them sees the
        others. But a single fact about {second ? "your" : "her"} status is the hidden variable
        across all three. Here it is, with the regulation that says so:
      </p>

      <div className="doors">
        {doors.map((door) => (
          <div className="door" key={door.system}>
            {/* The original small-caps key line, with the status said as a dotted pill rather than
                a filled glyph square plus a tinted capsule. */}
            <div className="k">
              {door.system}
              <span className="badge red">Blocked</span>
            </div>
            <div className="v">
              {door.why} {door.cite ? <span className="cite">{door.cite}</span> : null}
            </div>
            {/* Kept from the current component: the office is a finding-derived fact and the
                original hero simply never carried one. Removing it would drop real information to
                match an older layout, which is not what a visual restoration is. */}
            <div className="door-office">Decided by {door.office}</div>
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
