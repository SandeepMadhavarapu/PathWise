import type { StatusKey } from "@/lib/tokens";
import { CheckIcon, CalendarIcon, WarningIcon, LockIcon } from "./icons";

const ICON: Record<StatusKey, React.ComponentType<{ className?: string }> | null> = {
  done: CheckIcon,
  active: CalendarIcon,
  warn: WarningIcon,
  blocked: LockIcon,
  idle: null,
};

// The atom of the visual system: a 22px status-colored square with a white icon,
// or (when `count` is given) a white square with a colored border holding a number.
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
  const Icon = ICON[status];
  return (
    <span className={`status-glyph ${status}${className ? ` ${className}` : ""}`}>
      {Icon ? <Icon /> : status === "idle" ? "?" : null}
    </span>
  );
}
