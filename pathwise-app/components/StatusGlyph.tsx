import type { StatusKey } from "@/lib/tokens";

// The atom of the visual system: a small status-coloured dot, or (when `count` is given) a white
// square with a coloured border holding a number.
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
  // The non-count glyph is drawn by CSS as a coloured dot — the restored design says the status
  // with colour plus a pill label beside it, not with an icon inside a square. The four status
  // icons were still being rendered and then hidden by `.status-glyph:not(.count) > *`, which is
  // markup and bundle weight for something no reader ever sees, so they are no longer rendered.
  //
  // The `idle` "?" STAYS. That rule hides child ELEMENTS; a bare text node is not one, so the "?"
  // has always been visible — it is how "unable to verify" reads as a question rather than as a
  // colour, which is the one status whose meaning colour alone cannot carry.
  return (
    <span className={`status-glyph ${status}${className ? ` ${className}` : ""}`}>
      {status === "idle" ? "?" : null}
    </span>
  );
}
