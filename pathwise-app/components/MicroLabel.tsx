// The signature detail: right-aligned uppercase micro-labels on a data row,
// e.g. "SCHEV PT II §03(A) · VERIFIED 12 JUL 2026 · 342 / 365 DAYS".
export function MicroLabel({ parts }: { parts: (string | undefined | false | null)[] }) {
  const visible = parts.filter((p): p is string => !!p);
  if (visible.length === 0) return null;
  return (
    <span className="micro-label t-micro">
      {visible.map((part, i) => (
        <span key={i}>
          {i > 0 ? <span className="sep"> · </span> : null}
          {part}
        </span>
      ))}
    </span>
  );
}
