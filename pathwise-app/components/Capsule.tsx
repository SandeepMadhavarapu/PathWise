import type { StatusKey } from "@/lib/tokens";

/**
 * A status chip, in one of two registers: neutral (a label) or tinted (a verdict).
 *
 * ---- why `idle` is allowed here now, and why the fallback is gone ----
 *
 * `status` used to be typed `Exclude<StatusKey, "idle">` and a tinted capsule with no status fell
 * back to `"active"`. Both halves of that were wrong in the same direction.
 *
 * The five status keys are the app's whole verdict vocabulary and `idle` is the member that means
 * "PathWise could not settle this". Forbidding it here forced every caller that had one to launder
 * it — `status={status === "idle" ? undefined : status}` appears in FindingDetail and SystemsHero —
 * and the fallback then coloured the result ORANGE, which in this product means "in progress".
 * So a finding of `unable_to_verify` arrived on screen wearing the chip for a limit being
 * approached, next to a StatusGlyph that correctly drew the dashed "unknown" square. One state,
 * two answers, in adjacent elements.
 *
 * `idle` is a first-class member now, styled as the absence of a verdict rather than as a fifth
 * kind of verdict (see `.capsule--tinted.idle`), and a tinted capsule with NO status renders
 * neutral — an honest nothing, instead of a colour nobody asked for.
 */
export function Capsule({
  children,
  variant = "neutral",
  status,
}: {
  children: React.ReactNode;
  variant?: "neutral" | "tinted";
  status?: StatusKey;
}) {
  if (variant === "tinted" && status) {
    return <span className={`capsule capsule--tinted ${status}`}>{children}</span>;
  }
  return <span className="capsule capsule--neutral">{children}</span>;
}
