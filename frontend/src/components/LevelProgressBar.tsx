/**
 * App-wide progress bar for level / screen completion.
 * White track, gold fill, 4px pill, compact (sized to its label), with a
 * 10px right-aligned percentage that is gold when > 0% and grey at 0%.
 */
import { cn } from "@/lib/utils";

export function LevelProgressBar({
  pct,
  className,
  showPercent = true,
}: {
  pct: number;
  className?: string;
  showPercent?: boolean;
}) {
  const value = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <span className="h-[4px] flex-1 overflow-hidden rounded-full bg-white">
        <span
          className="block h-full rounded-full transition-all"
          style={{ width: `${value}%`, background: "#FFC300" }}
        />
      </span>
      {showPercent && (
        <span
          className="shrink-0 text-right text-[10px] leading-none tabular-nums"
          style={{ color: value > 0 ? "#FFC300" : "#9CA3AF" }}
        >
          {value}%
        </span>
      )}
    </span>
  );
}
