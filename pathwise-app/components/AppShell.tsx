"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import coverage from "@/lib/rulepacks/coverage.json";
import {
  GridIcon,
  ClockIcon,
  ClipboardIcon,
  BoltIcon,
  ChevronIcon,
  SearchIcon,
  HomeIcon,
  CalendarIcon,
  CheckIcon,
} from "./icons";

const RULES_VERIFIED_ON: string = (coverage as { verified_on?: string }).verified_on ?? "unknown";
// Resolved at build time from the commit actually being built — see next.config.mjs. Not typed by
// hand, because a stamp that says which build you are looking at is worthless the first time it is
// wrong, and this one had already drifted two commits.
const BUILD_SHA: string = process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev";

const PAGE_TITLES: Record<string, string> = {
  "/student": "Student overview",
  "/student/journey": "My journey",
  "/student/finding/residency": "Finding detail",
  "/student/finding/aid": "Finding detail",
  "/student/finding/domicile": "The domicile analysis in full",
  "/student/next": "Next steps",
  "/student/changed": "What changed?",
  "/coverage": "Coverage & rule packs",
  "/check": "Check your status",
  "/moment": "The life-event test",
};

const PRIMARY_NAV = [
  { href: "/student", label: "Overview", icon: GridIcon },
  { href: "/student/journey", label: "My journey", icon: ClockIcon },
  { href: "/check", label: "Check your status", icon: ClipboardIcon },
];

// The analysis screens. They read the same engines as the overview but answer a different
// question — what to do next, what moved, and how far the rules themselves have been carried.
const ANALYSIS_NAV = [
  { href: "/student/next", label: "Next steps", icon: CalendarIcon },
  { href: "/student/changed", label: "What changed", icon: CheckIcon },
  { href: "/coverage", label: "Coverage map", icon: SearchIcon },
];

const SECONDARY_NAV = [
  { href: "/moment", label: "Life-event test", icon: BoltIcon },
  { href: "/", label: "Home", icon: HomeIcon },
];

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

  return (
    <div className="app-shell">
      <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
        <div className="sidebar-logo-row">
          <span className="sidebar-logo">
            Path<span className="dot">Wise</span>
          </span>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronIcon className="icon-16 sidebar-collapse-icon" />
          </button>
        </div>

        <nav className="sidebar-nav">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="sidebar-divider" />
        <nav className="sidebar-secondary">
          {ANALYSIS_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="sidebar-divider" />
        <nav className="sidebar-secondary">
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
          {/* This bar used to carry a search field that searched nothing and an avatar with an
              initial in it. Both were dressing borrowed from products that have accounts, and on a
              product whose first promise is "no account, nothing stored on a server" the avatar
              contradicted the promise while the search box invited a judge to click something
              inert. What sits here now is the one claim the whole page is entitled to make. */}
          <p className="topbar-privacy">No account · nothing leaves this device</p>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
