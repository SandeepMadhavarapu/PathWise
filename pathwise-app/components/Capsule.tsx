import type { StatusKey } from "@/lib/tokens";

export function Capsule({
  children,
  variant = "neutral",
  status,
}: {
  children: React.ReactNode;
  variant?: "neutral" | "tinted";
  status?: Exclude<StatusKey, "idle">;
}) {
  if (variant === "tinted") {
    return <span className={`capsule capsule--tinted ${status ?? "active"}`}>{children}</span>;
  }
  return <span className="capsule capsule--neutral">{children}</span>;
}
