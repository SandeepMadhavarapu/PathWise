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

  // The landing page owns its own bare, chrome-free layout.
  if (pathname === "/") {
    return <>{children}</>;
  }

  const title = PAGE_TITLES[pathname] ?? "PathWise";
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
        <span className="sitenav-sep" aria-hidden="true" />
        {EXAMPLE_NAV.map((item) => (
          <NavPill key={item.href} item={item} pathname={pathname} />
        ))}
        <span className="sitenav-sep" aria-hidden="true" />
        {SECONDARY_NAV.map((item) => (
          <NavPill key={item.href} item={item} pathname={pathname} />
        ))}
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

      <div className="shell-meta">
        Rules verified: {formatVerifiedDate(RULES_VERIFIED_ON)} · Build: {BUILD_SHA}
      </div>
    </div>
  );
}
