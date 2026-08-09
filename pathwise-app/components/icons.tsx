// Minimal hand-rolled outline icons — no icon library dependency.
// Every icon is a plain 24x24 viewBox stroke path so size/color are controlled by the caller.

type IconProps = { className?: string };

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 5 16 12 9 19" />
    </svg>
  );
}
