import type { StatusKey } from "@/lib/tokens";

/**
 * The mark each of the five epistemic states carries.
 *
 * Colour alone cannot carry these. The product's whole claim is that "blocked by a rule" and "we
 * made no claim" are different KINDS of answer, and a reader who cannot see hue — about 1 in 12 men
 * — was previously told them apart by the text label alone. So each state now has a shape as well:
 * three channels (glyph, colour, word) instead of two.
 *
 * Drawn as inline SVG paths rather than an icon font or an emoji: no network request, no font
 * fallback, and each one inherits `currentColor` so it stays correct on a tinted fill.
 *
 * The shapes are chosen to be legible at 13px and to mean something on their own:
 *   done     ✓  a check — the ordinary sign of a passed condition
 *   active   →  an arrow — a task moving through an office, not a hazard
 *   warn     !  a bar and a dot inside a triangle — the standard hazard shape
 *   blocked  ▬  a horizontal bar — a closed door, not a cross (a cross reads as "wrong answer",
 *               and a blocked finding is a correct answer about a closed door)
 *   idle     ?  a question mark — the one state whose meaning is a question
 */
const PATHS: Record<StatusKey, React.ReactNode> = {
  done: <path d="M2.5 7.2 5.6 10.3 11.5 3.9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  active: <path d="M2.6 7h7.6M7.2 3.9 10.6 7l-3.4 3.1" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />,
  warn: (
    <>
      <path d="M7 2.6 12.6 11.4H1.4Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 5.8v2.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="7" cy="9.9" r="0.85" fill="currentColor" />
    </>
  ),
  blocked: <path d="M3 7h8" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />,
  idle: null, // drawn as a text "?" below — a glyph the CSS has always rendered as a character
};

export function StatusGlyph({
  status,
  count,
  className,
}: {
  status: StatusKey;
  count?: number;
  className?: string;
}) {
  if (count !== undefined) {
    return (
      <span className={`status-glyph count ${status}${className ? ` ${className}` : ""}`}>
        {Math.min(99, count)}
      </span>
    );
  }

  // `idle` keeps its character rather than a path: "?" is already the clearest possible mark for
  // "no claim was made", and it is the one state the product most needs a reader to stop on.
  if (status === "idle") {
    return (
      <span className={`status-glyph idle${className ? ` ${className}` : ""}`} aria-hidden="true">
        ?
      </span>
    );
  }

  return (
    <span className={`status-glyph ${status}${className ? ` ${className}` : ""}`} aria-hidden="true">
      <svg viewBox="0 0 14 14" focusable="false">{PATHS[status]}</svg>
    </span>
  );
}
