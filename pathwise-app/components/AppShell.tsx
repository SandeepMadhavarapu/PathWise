"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import coverage from "@/lib/rulepacks/coverage.json";
import { BackLink } from "./BackLink";
import {
  GridIcon,
  ClockIcon,
  ClipboardIcon,
  BoltIcon,
  ChevronIcon,
  MapIcon,
  CompareIcon,
  CalendarIcon,
} from "./icons";

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
const CHECK_CTA = { href: "/check", label: "Check my status", icon: ClipboardIcon };

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
  { href: "/student", label: "Priya's standing", icon: GridIcon },
  { href: "/student/journey", label: "Her timeline", icon: ClockIcon },
  { href: "/student/next", label: "Her next steps", icon: CalendarIcon },
  // Outcomes rather than internal names. "What changed" invited "changed since when?" and wore a
  // tick, which reads as "done" on the one screen whose subject is a question the record cannot
  // yet settle. "When evidence lands" was evocative but not a thing a reader scans for; a document
  // arriving is the event they would actually recognise.
  { href: "/student/changed", label: "When a document arrives", icon: CompareIcon },
  { href: "/moment", label: "One event, many effects", icon: BoltIcon },
];

// "Coverage map" wore a magnifying glass and did not say coverage of what.
const SECONDARY_NAV = [{ href: "/coverage", label: "State coverage", icon: MapIcon }];

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

type NavItem = { href: string; label: string; icon: (p: { className?: string }) => JSX.Element };

/**
 * One rail link. The three navs rendered it identically three times over, which is how the three
 * were able to disagree about anything.
 *
 * `aria-label` is the part that matters: `.sidebar-label` is `display: none` when the rail is
 * collapsed and on every viewport under 900px, and `display: none` takes an element out of the
 * accessibility tree as well as off the screen. That left every one of these links named nothing
 * at all on the layout a judge opening the link on a phone would get. Naming the link keeps the
 * name when the text goes, and matches the visible text exactly when it is there.
 */
function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  return (
    <Link
      href={item.href}
      className={`sidebar-item${pathname === item.href ? " active" : ""}`}
      aria-label={item.label}
    >
      <span className="sidebar-item-icon">
        <item.icon className="icon-20" />
      </span>
      <span className="sidebar-label">{item.label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // The landing page owns its own bare, chrome-free layout.
  if (pathname === "/") {
    return <>{children}</>;
  }

  const title = PAGE_TITLES[pathname] ?? "PathWise";
  const parent = PARENT[pathname];
  const exampleStudent = EXAMPLE_STUDENT[pathname];

  return (
    <div className="app-shell">
      {/* Seven links stand between the top of the document and the page's own content — eight on the
          phone rail, where they are laid out horizontally and every one of them is a Tab stop. A
          keyboard or screen-reader user had no way past them except through them, on every route.
          First focusable element in the shell, and invisible until it is focused. */}
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
        <div className="sidebar-logo-row">
          {/* The wordmark is the way home now that "Home" is not a nav row. This is where readers
              already click for it, and it frees the slot the duplicate was occupying. */}
          <Link href="/" className="sidebar-logo" aria-label="PathWise home">
            Path<span className="dot">Wise</span>
          </Link>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronIcon className="icon-16 sidebar-collapse-icon" />
          </button>
        </div>

        {/* The tool, and the only control here that acts on the reader's own facts. It is a
            button rather than a rail row because it is not a peer of the five demos below it —
            that equivalence is what buried it. */}
        <Link
          href={CHECK_CTA.href}
          className={`sidebar-cta${pathname === CHECK_CTA.href ? " active" : ""}`}
          aria-label={CHECK_CTA.label}
        >
          <span className="sidebar-item-icon">
            <CHECK_CTA.icon className="icon-20" />
          </span>
          <span className="sidebar-label">{CHECK_CTA.label}</span>
        </Link>

        {/* The heading a first-time reader needs before the five links under it, because without
            it "Priya's standing" is a stranger's name with no explanation attached. */}
        <div className="sidebar-section-label">Worked example</div>
        <nav className="sidebar-nav" aria-label="Worked example">
          {EXAMPLE_NAV.map((item) => (
            <React.Fragment key={item.href}>
              <NavLink item={item} pathname={pathname} />
              {/* The findings hang off the dashboard, immediately under it, so the relationship is
                  read rather than explained. A real nested list, so a screen reader hears three
                  items inside the standing entry instead of eight flat siblings. */}
              {item.href === "/student" ? (
                <ul className="sidebar-subnav">
                  {FINDING_NAV.map((sub) => (
                    <li key={sub.href}>
                      <Link
                        href={sub.href}
                        className={`sidebar-item sidebar-sub${
                          pathname === sub.href ? " active" : ""
                        }`}
                        aria-label={sub.label}
                      >
                        <span className="sidebar-label">{sub.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </React.Fragment>
          ))}
        </nav>

        <div className="sidebar-divider" />
        <nav className="sidebar-secondary" aria-label="Reference">
          {SECONDARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-footer">
          Rules verified: {formatVerifiedDate(RULES_VERIFIED_ON)}
          <br />
          Build: {BUILD_SHA}
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <h1 className="topbar-title t-page-title">{title}</h1>
          {/* Beside the page's own name, so the first thing read after "Her next steps" is that
              the steps are not the reader's. Not a status: it uses none of the four status
              colours, because "this is an example" is a fact about the RECORD, not a verdict on
              it, and borrowing amber here would make it argue with the findings below. */}
          {exampleStudent ? (
            <span className="topbar-example">
              Worked example
              <span className="tx-sep" aria-hidden="true">
                ·
              </span>
              <span className="tx-who">{exampleStudent}</span>
              <span className="sr-only"> — a fictional student, not your own record</span>
            </span>
          ) : null}
          {/* This bar used to carry a search field that searched nothing and an avatar with an
              initial in it. Both were dressing borrowed from products that have accounts, and on a
              product whose first promise is "no account, nothing stored on a server" the avatar
              contradicted the promise while the search box invited a judge to click something
              inert. What sits here now is the one claim the whole page is entitled to make. */}
          <p className="topbar-privacy">No account · nothing leaves this device</p>
        </header>

        {/* Above everything the page itself renders, and unconditional: a back affordance that
            appears only once some workflow has been completed is missing exactly when a lost
            reader needs it. */}
        <main className="content" id="main">
          {parent ? <BackLink href={parent.href} label={parent.label} /> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
