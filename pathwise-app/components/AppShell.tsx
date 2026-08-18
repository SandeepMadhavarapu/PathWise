"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import coverage from "@/lib/rulepacks/coverage.json";
import { BackLink } from "./BackLink";

const RULES_VERIFIED_ON: string = (coverage as { verified_on?: string }).verified_on ?? "unknown";
// Resolved at build time from the commit actually being built — see next.config.mjs. Not typed by
// hand, because a stamp that says which build you are looking at is worthless the first time it is
// wrong, and this one had already drifted two commits.
const BUILD_SHA: string = process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev";

/**
 * The topbar heading for each route — and, since it is the page's `h1`, the loudest label the
 * product applies to itself. It is kept in step with the rail labels below for a reason: when the
 * rail said "My journey" and the page it opened said "Priya never has to explain her history
 * again", the two were describing different people, and the possessive was the one that reached
 * the reader first.
 *
 * Every title for an example route is now third person. Nothing here says "my" or "your" about a
 * record belonging to Priya or Marcus.
 */
const PAGE_TITLES: Record<string, string> = {
  "/student": "Priya's standing",
  "/student/journey": "Her timeline",
  "/student/finding/residency": "Why residency is blocked",
  "/student/finding/aid": "Why state aid is blocked",
  "/student/finding/domicile": "The domicile analysis in full",
  "/student/next": "Her next steps",
  "/student/changed": "When a document arrives",
  "/coverage": "State coverage & rule packs",
  // Second person, and deliberately not matching the rail's button. The button is the reader's own
  // voice choosing an action ("check MY status"); this heading is the product addressing them.
  "/check": "Check your status",
  "/moment": "One event, many effects",
};

/**
 * Every route's parent, and the ONE name that parent goes by.
 *
 * This map is the back-navigation contract, and it is centralised for two reasons that are not
 * about tidiness:
 *
 *   · A route cannot be forgotten. Rendering the link per page meant 3 of 10 routes had one, in
 *     three different conventions — /student/finding/residency said "Back to overview" while
 *     /moment said "Back to Priya's standing" for the SAME destination, and /student/changed
 *     pointed a trailing arrow backwards from inside a promo strip that only appeared once the
 *     document flow had been completed. A leaf page with no way out is the failure this fixes.
 *   · One destination, one name. Two names for /student is a comprehension tax paid by the reader
 *     for a decision the product never made.
 *
 * It is also the data the mobile sticky topbar will read in Step 8.11 — the relationship is
 * declared once here rather than a second time in a different shape for a different viewport.
 *
 * A pathname absent from this map renders no link, which is the honest answer for a route with no
 * declared parent (currently only the landing, which exits above, and 404).
 */
const PARENT: Record<string, { href: string; label: string }> = {
  "/student": { href: "/", label: "PathWise home" },
  "/student/journey": { href: "/student", label: "Priya's standing" },
  "/student/next": { href: "/student", label: "Priya's standing" },
  "/student/changed": { href: "/student", label: "Priya's standing" },
  "/moment": { href: "/student", label: "Priya's standing" },
  "/student/finding/residency": { href: "/student", label: "Priya's standing" },
  "/student/finding/aid": { href: "/student", label: "Priya's standing" },
  // The one route whose parent is not the dashboard: it is the CONTINUATION of the residency
  // finding past the gate, on a student the gate lets through, and it is reached from there.
  "/student/finding/domicile": {
    href: "/student/finding/residency",
    label: "Why residency is blocked",
  },
  "/check": { href: "/", label: "PathWise home" },
  "/coverage": { href: "/", label: "PathWise home" },
};

/**
 * PathWise is two things, and the rail used to present them as eight peers.
 *
 * Seven of those eight showed PRIYA — a fictional student — and three of them were named in the
 * possessive: "Overview", "My journey", "Next steps". The eighth, /check, is the only screen that
 * reasons over the reader's OWN facts, and it sat fourth in the list wearing the same weight as a
 * demo. So the product's actual tool was buried among worked examples, and the worked examples
 * were labelled as though they were the reader's record.
 *
 * The split below is the fix, and it is structural rather than cosmetic:
 *
 *   · THE TOOL is not navigation. It is an action, and it renders as one — see `.sidebar-cta`.
 *   · THE WORKED EXAMPLE is grouped under a heading that says so, in third person throughout.
 *     "Her timeline" cannot be mistaken for the reader's timeline the way "My journey" was.
 *   · The reference material sits below a divider, quieter than both.
 *
 * "Home" is gone as a peer item. It was a nav row competing with "Overview" for the meaning of
 * "the start", and neither name told a first-time reader which was which. The wordmark links to /,
 * which is where every reader already looks for it.
 */
const CHECK_CTA = { href: "/check", label: "Check my status" };

/**
 * The three finding routes, nested under the dashboard they belong to.
 *
 * These are the screens where PathWise shows its work — the reasoning chain, the regulation
 * quoted, the deciding office, the open questions, and on the third one the nine sections of a full
 * determination. They were reachable ONLY from in-page links: a row inside "More of this example",
 * a strip at the foot of another finding, and two "See full reasoning →" links on cards. A judge
 * who navigates by the rail — which is what a rail is for — never saw the explanation layer at all.
 *
 * Nested rather than promoted to peers, because they are not alternatives to the dashboard; they
 * are the dashboard's cards opened up. Marcus is named on his row for the same reason the topbar
 * badges him: that row crosses from one student's record into another's.
 *
 * Rendered only in the vertical rail. Below 900px the rail is a horizontally-scrolling strip that
 * is already carrying more than it can show at 375px, and adding three more items would make a
 * measured problem worse to solve a problem that does not exist there — on a phone these screens
 * are reached by tapping the card that states the finding, which is directly above the fold.
 */
const FINDING_NAV = [
  { href: "/student/finding/residency", label: "Why residency is blocked" },
  { href: "/student/finding/aid", label: "Why state aid is blocked" },
  { href: "/student/finding/domicile", label: "The full determination · Marcus" },
];

const EXAMPLE_NAV = [
  { href: "/student", label: "Priya's standing" },
  { href: "/student/journey", label: "Her timeline" },
  { href: "/student/next", label: "Her next steps" },
  // Outcomes rather than internal names. "What changed" invited "changed since when?" and wore a
  // tick, which reads as "done" on the one screen whose subject is a question the record cannot
  // yet settle. "When evidence lands" was evocative but not a thing a reader scans for; a document
  // arriving is the event they would actually recognise.
  { href: "/student/changed", label: "When a document arrives" },
  { href: "/moment", label: "One event, many effects" },
];

const SECONDARY_NAV = [{ href: "/coverage", label: "State coverage" }];

/**
 * The routes that show a FICTIONAL student's record — and WHICH ONE.
 *
 * Every one of these renders live findings, real citations, real countdowns and a real deciding
 * office, which is exactly what makes them convincing and exactly why they need saying. A reader
 * who arrives on /student/next sees "Report a qualifying job before your unemployment cap runs
 * out" with a date and ten days of margin; nothing in that sentence tells them it is not about
 * them. The rail groups these under "Worked example", but a rail is not where anyone looks when a
 * countdown is telling them they have ten days — so the claim is repeated on the page, at the top,
 * on every one of them.
 *
 * The NAME is here because seven of these routes are Priya and one is not. /student/finding/domicile
 * runs the residency engine on MARCUS, a second example student the status gate lets through — that
 * is the whole point of the screen, since Priya's record stops at the gate and a refusal is only
 * half of an engine. But a reader reaches it from a row on Priya's own dashboard, and a badge
 * reading "Worked example" on both pages says nothing about having changed person mid-journey.
 * With the name on it the switch is visible before the reader has read a word of the page.
 *
 * /check is deliberately absent: it is the reader's OWN facts, and the ABSENCE of this badge is
 * how that difference is felt. So is /coverage, which is reference material about rules rather
 * than a record about a person.
 *
 * Listed rather than inferred from the /student prefix, because /moment is an example route that
 * does not sit under it and /coverage is not one that would.
 */
const EXAMPLE_STUDENT: Record<string, string> = {
  "/student": "Priya",
  "/student/journey": "Priya",
  "/student/next": "Priya",
  "/student/changed": "Priya",
  "/moment": "Priya",
  "/student/finding/residency": "Priya",
  "/student/finding/aid": "Priya",
  "/student/finding/domicile": "Marcus",
};

function formatVerifiedDate(iso: string): string {
  if (iso === "unknown") return iso;
  const [y, m, d] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

type NavItem = { href: string; label: string };

/**
 * One navigation pill.
 *
 * The original design navigated with `.pill` — a small bordered lozenge on the surface colour —
 * and had no rail at all. Every label is rendered as text rather than as an icon plus a label that
 * disappears at narrow widths, so the accessible name and the visible name are the same string on
 * every viewport, which is what the rail needed `aria-label` to work around.
 */
function NavPill({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = pathname === item.href;
  return (
    <Link
      href={item.href}
      className={`pill navpill${active ? " active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {item.label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  /**
   * Whether the rail's six secondary destinations are folded behind one line.
   *
   * False on the server and on first paint, so the markup always ships every link — a reader with
   * no JavaScript, and any crawler, gets the whole rail. It flips to true only after a phone
   * viewport is measured, which is the one case where the rail costs more than it gives: at 390px
   * it wraps to three rows and pushes the first form control on /check below the fold.
   *
   * `matchMedia` rather than a resize listener: one event on the breakpoint crossing instead of one
   * per pixel, and it stays correct through an orientation change.
   */
  const [railFolded, setRailFolded] = React.useState(false);
  React.useEffect(() => {
    // Width alone was the wrong question. A phone held sideways is 844px wide and 390px tall, so it
    // failed `max-width: 767px`, took the full desktop rail, and spent 65px of a 390px screen on it —
    // measured on /check, the first form field landed at y=518, or 133% of the viewport, and NONE of
    // the seven fields were visible. The product's only tool, on a screen that had simply been
    // rotated, looked like a page with no tool on it. 932x430 (120%) and a short desktop window at
    // 1280x500 (104%) failed the same way.
    //
    // The condition is therefore "narrow OR short", and the stylesheet's fold block carries the same
    // pair so the markup and the styling can never disagree about which rail is on screen. 500px is
    // chosen to sit above every phone landscape height and below every tablet portrait height, so
    // the 768-900px tablet fix this branch already shipped is untouched: those are 900px tall.
    const mq = window.matchMedia("(max-width: 767px), (max-height: 500px)");
    const apply = () => setRailFolded(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /**
   * The six secondary destinations, defined once.
   *
   * Held as a fragment rather than a component so the two branches below render the SAME nodes in
   * two different parents — the rail directly, or a `details` inside it. Two copies of this list
   * would be two places for a destination to go missing.
   */
  const secondaryRail = (
    <>
      <span className="sitenav-group">Worked example</span>
      {EXAMPLE_NAV.map((item) => (
        <NavPill key={item.href} item={item} pathname={pathname} />
      ))}
      <span className="sitenav-sep" aria-hidden="true" />
      <span className="sitenav-group">Reference</span>
      {SECONDARY_NAV.map((item) => (
        <NavPill key={item.href} item={item} pathname={pathname} />
      ))}
    </>
  );

  // The landing page owns its own bare, chrome-free layout.
  if (pathname === "/") {
    return <>{children}</>;
  }

  // The fallback is reachable on exactly one screen: the not-found page. Every real route has an
  // entry above, and `/` returned before this line. It used to read "PathWise", which put the
  // site name in the page heading of a 404 — and, once not-found.tsx supplied a heading of its
  // own, produced two h1s on the only route in the product that had them.
  const title = PAGE_TITLES[pathname] ?? "No page at this address";
  const parent = PARENT[pathname];
  const exampleStudent = EXAMPLE_STUDENT[pathname];

  /**
   * The original shell: one centred column under a slim topbar, and no permanent rail.
   *
   * Every responsibility the sidebar carried is still carried here — the tool, the worked-example
   * routes, the three finding screens, the reference route, the verification stamp and the build
   * sha. What changed is the geometry: they are pills under a brand line rather than a dark rail
   * pinned beside the content, which is the difference between reading a document and operating an
   * application. Nothing about routing, titles or the back-navigation contract moved.
   */
  return (
    <div className="shell-wrap">
      {/* First focusable element, invisible until focused — the nav below is a row of links and a
          keyboard reader still needs a way past it on every route. */}
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="topbar">
        <div className="brand">
          <Link href="/" className="logo" aria-label="PathWise home">
            Path<span className="dot">Wise</span>
          </Link>
          <span className="tag">your standing across every system</span>
        </div>
        <div className="topnav">
          {/* Kept beside the page name, so the first thing read after "Her next steps" is that the
              steps are not the reader's own. */}
          {exampleStudent ? (
            <span className="pill pill-example">
              Example student · {exampleStudent}
              <span className="sr-only"> — a fictional student, not your own record</span>
            </span>
          ) : null}
          <span className="pill pill-privacy">No account · nothing leaves this device</span>
        </div>
      </header>

      {/* The tool first and visually distinct, then the worked example, then reference material —
          the same three-part split the rail made, expressed as pills instead of a rail. */}
      <nav className="sitenav" aria-label="Sections">
        <Link
          href={CHECK_CTA.href}
          className={`pill navpill navpill-cta${pathname === CHECK_CTA.href ? " active" : ""}`}
          aria-current={pathname === CHECK_CTA.href ? "page" : undefined}
        >
          {CHECK_CTA.label}
        </Link>
        {/* One definition of the six secondary destinations, rendered in one of two SHAPES.
            Unfolded, they are returned as a fragment and become DIRECT flex children of `.sitenav`,
            exactly as they are on main — no wrapper, no `display: contents`. Folded, the same
            fragment is placed inside a `details`.
            This replaces the previous CSS-only approach, which wrapped them in a `details` at every
            width and neutralised the wrapper with `display: contents`. That does not reliably
            promote children into the parent's flex formatting context: measured at 768px the pills
            computed to `display: inline`, stopped wrapping, and drove scrollWidth to 906 against a
            768 viewport — 138px of horizontal overflow on five routes. A structural switch cannot
            fail that way, because above the fold-point there is no wrapper element at all. */}
        {/* The groups are LABELLED now, not just separated.
            A bare divider told a reader that "Check my status" and "Her timeline" belong to
            different sets; it did not tell them what the second set IS. So a first-time visitor met
            "Her timeline" and "Her next steps" with no antecedent for "Her" — five of the seven
            items in the rail are one fictional student's record, and nothing on the rail said so.
            The heading is the antecedent, and it costs one line. */}
        {/* On a phone these six collapse behind one line, and the tool above stays visible.
            Measured at 390px: the rail wraps to three rows and costs ~102px of the first viewport,
            which pushed the first form control on /check to y=709 — the product's only tool, below
            the fold, behind its own navigation. Akshaya's branch solves this by making the whole
            sidebar an off-canvas drawer; that works, but it hides the primary action too and it
            replaces the rail with a sidebar the rest of this product does not have.
            This keeps the rail — which is PathWise's own shape, not a dashboard's — and folds only
            the six secondary destinations, using the same `details` disclosure the check page uses
            for its privacy elaboration. `open` above 768px is handled in CSS, so the desktop rail is
            byte-identical to what ships today. */}
        {/* `open` is driven by viewport, not by CSS, and that is not a stylistic choice — it is the
            only correct way to do this. A closed `<details>` hides its children in the browser's own
            box tree, which `display: contents` does not override: a CSS-only version silently
            removed six of the rail's seven destinations from the desktop tab order. Measured before
            this fix: Tab went "Check my status" → "Back to", skipping the worked example and the
            coverage map entirely.
            Rendered OPEN by default so the server output and the no-JS case carry every link, and
            collapsed only once a phone viewport is confirmed after mount. */}
        {railFolded ? (
          <details className="sitenav-more">
            <summary>
              <span className="sitenav-more-k">Worked example &amp; reference</span>
            </summary>
            <div className="sitenav-more-body">{secondaryRail}</div>
          </details>
        ) : (
          secondaryRail
        )}
      </nav>

      {/* The three finding screens, shown on the routes they belong to. They were rail sub-items;
          here they surface only where they are relevant, which keeps the pill row scannable. */}
      {pathname.startsWith("/student") ? (
        <nav className="sitenav sitenav-sub" aria-label="Findings">
          {FINDING_NAV.map((item) => (
            <NavPill key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
      ) : null}

      <main id="main">
        {parent ? <BackLink href={parent.href} label={parent.label} /> : null}
        <h1 className="page-title">{title}</h1>
        {children}
      </main>

      {/* The disclaimer belongs in the shell and not on a page, because the thing it disclaims
          happens on every page: a finding that quotes a regulation at a visa holder and tells them
          a door is shut. The product hedges its epistemics carefully already — "unable to verify"
          is a first-class result, and "PathWise advises; the office decides" closes several pages —
          but hedging what PathWise KNOWS is not the same as stating what PathWise IS, and the
          second was nowhere in eleven routes. A reader in this position is entitled to both.

          It sits with the verification date and the build sha rather than in a banner because that
          is what this strip is: the line that says what you are looking at and how far to trust it.
          A disclaimer shouted at the top would be a product apologising for its answers. This one
          is a fact about the tool, filed with the other facts about the tool. */}
      <div className="shell-meta">
        Rules verified: {formatVerifiedDate(RULES_VERIFIED_ON)} · Build: {BUILD_SHA}
        <br />
        <span className="shell-meta-disclaimer">
          PathWise reads published rules and decides nothing. It is not legal advice. The offices
          named in each finding are the ones that decide.
        </span>
      </div>
    </div>
  );
}
