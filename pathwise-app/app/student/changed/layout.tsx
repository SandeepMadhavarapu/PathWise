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
export const metadata: Metadata = { alternates: { canonical: "/student/changed" }, description:
  "A missing document arrives and the same CPT record can be read two ways, 210 days apart. Watch PathWise re-reason — and refuse to choose until it is settled.",
  title: "When a document arrives" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
