import Link from "next/link";

/**
 * The one way out of a page, and deliberately the only one.
 *
 * ---- why a static href and not history ----
 *
 * `router.back()` is the reflex here and it is wrong for this product. PathWise is opened by
 * DIRECT LINK more often than it is browsed: a judge follows a URL to /student/finding/aid, a
 * reviewer opens /check from a submission document. Those visitors have no history to go back to,
 * so `back()` either does nothing or leaves the site entirely — the two worst outcomes for a
 * control whose whole promise is "you are not trapped".
 *
 * A static parent is deterministic. It behaves identically for someone who arrived three clicks
 * deep and someone who arrived cold, and it can be reasoned about without running the app. The
 * cost is that the parent must be declared rather than inferred; that declaration lives in one
 * place (PARENT in AppShell) so the answer cannot differ per page.
 *
 * ---- why the direction is announced, not drawn ----
 *
 * The arrow carries the direction for a sighted reader. A screen reader that heard only
 * "Priya's standing" would be told the destination and not that this link goes UP, which is the
 * one thing the control exists to say. So "Back to" is in the accessible name and out of the
 * visual, and the arrow is the reverse. Neither reader gets a duplicate.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="back-link">
      <span className="sr-only">Back to </span>
      <span aria-hidden="true">←</span> {label}
    </Link>
  );
}
