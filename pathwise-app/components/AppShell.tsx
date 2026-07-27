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
// Both parents of the pending UI merge. Becomes the merge commit's own sha once it is committed.
const BUILD_SHA = "8ac1c3f+d2527d1";

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
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item${pathname === item.href ? " active" : ""}`}
            >
              <span className="sidebar-item-icon">
                <item.icon className="icon-20" />
              </span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-divider" />
        <nav className="sidebar-secondary">
          {ANALYSIS_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item${pathname === item.href ? " active" : ""}`}
            >
              <span className="sidebar-item-icon">
                <item.icon className="icon-20" />
              </span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-divider" />
        <nav className="sidebar-secondary">
          {SECONDARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item${pathname === item.href ? " active" : ""}`}
            >
              <span className="sidebar-item-icon">
                <item.icon className="icon-20" />
              </span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
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
          <div className="topbar-search-wrap">
            <label className="topbar-search">
              <SearchIcon className="icon-16" />
              <input type="search" placeholder="Search findings, rules, students…" aria-label="Search" />
            </label>
          </div>
          <div className="topbar-actions">
            <span className="avatar" aria-hidden="true">
              P
            </span>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
