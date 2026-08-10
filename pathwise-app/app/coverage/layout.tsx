import type { Metadata } from "next";

/**
 * Tab title only.
 *
 * This route's page is a Client Component, and a Client Component cannot export `metadata`.
 * A sibling layout is the documented way to attach it — this one renders its children and
 * nothing else, so it adds no element, no wrapper and no style to the rendered output.
 *
 * The string is the one the topbar already shows for this route, so the tab and the page
 * heading cannot disagree.
 */
export const metadata: Metadata = { alternates: { canonical: "/coverage" }, description:
  "Which of the 51 jurisdictions PathWise has modelled, which it has only sourced, and the rule packs themselves — printed in full, with their authorities and verification dates.",
  title: "State coverage & rule packs" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
