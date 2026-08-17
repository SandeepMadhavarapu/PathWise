"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import coverage from "@/lib/rulepacks/coverage.json";
import { BackLink } from "./BackLink";
import { ChevronIcon } from "./icons";

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
 *   · THE TOOL is not navigation. It is an action, and it renders as one — see `.sb-item-cta`.
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
 * Rendered only in the sidebar, never as peers to it. Below 768px the sidebar is an off-canvas
 * drawer rather than a permanent column, so these three still reach a phone reader — through the
 * drawer, or by tapping the card that states the finding, which is directly above the fold.
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

const SIDEBAR_KEY = "pathwise-sidebar-collapsed";

/**
 * One sidebar item — the same destination NavPill used to render as a horizontal pill.
 *
 * Collapsed state has no icon set to fall back to (see icons.tsx: one hand-rolled chevron,
 * nothing else), so it shows the label's first letter in a 32px square instead, per the
 * collapsible-sidebar spec. The accessible name is the full label either way — collapsed mode
 * keeps it as visually-hidden text rather than relying on the avatar's letter or a native
 * `title` tooltip, neither of which a screen reader announces reliably on focus.
 *
 * The tooltip itself is `position: fixed`, placed via the item's own measured rect rather than
 * plain CSS `position: absolute` + `:hover`. `.sb-scroll` needs `overflow-y: auto` so a long list
 * can scroll, and per the CSS overflow spec, setting one axis to a non-visible value silently
 * computes the OTHER axis to `auto` too — so an absolutely-positioned tooltip escaping to the
 * right was being clipped by its own scroll ancestor even though every computed style on it
 * (opacity, position, z-index) looked correct. `position: fixed` escapes that ancestor entirely.
 */
function SidebarItem({
  item,
  pathname,
  collapsed,
  cta,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  cta?: boolean;
}) {
  const active = pathname === item.href;
  const letter = item.label.trim().charAt(0).toUpperCase();
  const [tooltipTop, setTooltipTop] = useState<number | null>(null);
  const showTooltip = useCallback((e: React.SyntheticEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipTop(rect.top + rect.height / 2);
  }, []);
  const hideTooltip = useCallback(() => setTooltipTop(null), []);

  return (
    <Link
      href={item.href}
      className={`sb-item${active ? " active" : ""}${cta ? " sb-item-cta" : ""}`}
      aria-current={active ? "page" : undefined}
      onMouseEnter={collapsed ? showTooltip : undefined}
      onMouseLeave={collapsed ? hideTooltip : undefined}
      onFocus={collapsed ? showTooltip : undefined}
      onBlur={collapsed ? hideTooltip : undefined}
    >
      {collapsed ? (
        <span className="sb-item-avatar" aria-hidden="true">
          {letter}
        </span>
      ) : null}
      <span className={collapsed ? "sb-item-label sr-only" : "sb-item-label"}>{item.label}</span>
      {collapsed && tooltipTop !== null ? (
        <span className="sb-tooltip" aria-hidden="true" style={{ top: tooltipTop }}>
          {item.label}
        </span>
      ) : null}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Desktop/tablet: expanded vs. collapsed, remembered across page loads. Mobile: an off-canvas
  // drawer, open only for the current view — CSS decides which of the two applies at the current
  // width, so neither state fights the other.
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Below 768px the sidebar is always the full-width drawer, even while `collapsed` (the
  // desktop/tablet rail state) is true — a phone that loaded with the tablet default of
  // collapsed=true would otherwise open its drawer showing icon-only rows with 240px to spare.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let storageOk = true;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(SIDEBAR_KEY);
    } catch {
      storageOk = false;
    }
    // Unavailable storage (private-mode restrictions etc.) silently defaults to expanded, per
    // spec, rather than guessing from the viewport. A stored choice always wins; absent one, a
    // narrow viewport (<1024) starts collapsed.
    if (!storageOk) {
      setCollapsed(false);
    } else if (stored === "1") {
      setCollapsed(true);
    } else if (stored === "0") {
      setCollapsed(false);
    } else {
      setCollapsed(window.innerWidth < 1024);
    }
  }, []);

  // A route change is a completed selection — the drawer's job on mobile is done.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        // Nothing to persist; the toggle still works for the rest of this session.
      }
      return next;
    });
  }, []);

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
  const showFindingNav = pathname.startsWith("/student");
  // What the ITEMS render as. `collapsed` (the rail's own state) is meaningless on mobile, where
  // the sidebar is either a closed drawer or a full-width open one — never an icon-only rail.
  const itemsCollapsed = collapsed && !isMobile;

  /**
   * The shell: a persistent top banner, a collapsible left sidebar carrying the same tool /
   * worked-example / reference split the pill row made, and the content column. Nothing about
   * routing, titles, the back-navigation contract, or the underlying nav data (CHECK_CTA,
   * EXAMPLE_NAV, SECONDARY_NAV, FINDING_NAV) moved — only the geometry the same links render in.
   */
  return (
    <div className="shell-wrap">
      {/* First focusable element, invisible until focused — the sidebar below is a list of links
          and a keyboard reader still needs a way past it on every route. */}
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="pw-banner">
        {/* Mobile-only: the sidebar's toggle relocates here below 768px, where the sidebar itself
            becomes an off-canvas drawer instead of a permanent column. */}
        <button
          type="button"
          className="sb-toggle sb-toggle-mobile"
          aria-expanded={drawerOpen}
          aria-controls="pw-sidebar"
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          onClick={() => setDrawerOpen((v) => !v)}
        >
          <ChevronIcon className={`sb-toggle-icon${drawerOpen ? " is-open" : ""}`} />
        </button>
        <Link href="/" className="pw-banner-logo" aria-label="PathWise home">
          Path<span className="dot">Wise</span>
        </Link>
      </header>

      {drawerOpen ? (
        <div className="sb-scrim" aria-hidden="true" onClick={() => setDrawerOpen(false)} />
      ) : null}

      <div className="shell-body">
        <nav
          id="pw-sidebar"
          aria-label="Sections"
          className={`sidebar${collapsed ? " collapsed" : ""}${drawerOpen ? " drawer-open" : ""}`}
        >
          <button
            type="button"
            className="sb-toggle"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            onClick={toggleCollapsed}
          >
            <ChevronIcon className={`sb-toggle-icon${collapsed ? "" : " is-open"}`} />
          </button>

          <div className="sb-scroll">
            {/* The tool — not navigation, an action, and rendered as one. */}
            <SidebarItem item={CHECK_CTA} pathname={pathname} collapsed={itemsCollapsed} cta />

            <div className="sb-sep" role="separator" aria-hidden="true" />
            {!itemsCollapsed ? <div className="sb-group-label">Worked example</div> : null}
            {EXAMPLE_NAV.map((item) => (
              <SidebarItem key={item.href} item={item} pathname={pathname} collapsed={itemsCollapsed} />
            ))}

            <div className="sb-sep" role="separator" aria-hidden="true" />
            {SECONDARY_NAV.map((item) => (
              <SidebarItem key={item.href} item={item} pathname={pathname} collapsed={itemsCollapsed} />
            ))}

            {/* The three finding screens, shown on the routes they belong to. */}
            {showFindingNav ? (
              <>
                <div className="sb-sep" role="separator" aria-hidden="true" />
                {!itemsCollapsed ? <div className="sb-group-label">Findings</div> : null}
                {FINDING_NAV.map((item) => (
                  <SidebarItem key={item.href} item={item} pathname={pathname} collapsed={itemsCollapsed} />
                ))}
              </>
            ) : null}
          </div>
        </nav>

        <main id="main">
          <div className="shell-context">
            <span className="tag">your standing across every system</span>
            {/* Kept beside the page name, so the first thing read after "Her next steps" is that
                the steps are not the reader's own. */}
            {exampleStudent ? (
              <span className="pill pill-example">
                Example student · {exampleStudent}
                <span className="sr-only"> — a fictional student, not your own record</span>
              </span>
            ) : null}
            <span className="pill pill-privacy">No account · nothing leaves this device</span>
          </div>

          {parent ? <BackLink href={parent.href} label={parent.label} /> : null}
          <h1 className="page-title">{title}</h1>
          {children}

          <div className="shell-meta">
            Rules verified: {formatVerifiedDate(RULES_VERIFIED_ON)} · Build: {BUILD_SHA}
          </div>
        </main>
      </div>
    </div>
  );
}
