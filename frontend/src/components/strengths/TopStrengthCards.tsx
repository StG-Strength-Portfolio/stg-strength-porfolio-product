/**
 * Shared "Top 5 strengths" card row — identical visual across student,
 * teacher and school-admin views. Display only.
 */
import { getStrengthName } from "@/lib/strengths-i18n";
import { getJarStrength } from "@/lib/strength-jar-data";
import { cn } from "@/lib/utils";

export interface TopStrengthItem {
  id: number;
  /** Count shown inside the coloured circle. */
  count: number;
  /** Optional caption under the name (e.g. "12 students"). */
  caption?: string;
}

export function TopStrengthCards({
  items,
  lang,
  size = "lg",
  className,
}: {
  items: TopStrengthItem[];
  lang: "fi" | "sv" | "en";
  size?: "lg" | "sm";
  className?: string;
}) {
  const circle = size === "lg" ? "h-16 w-16 text-2xl" : "h-12 w-12 text-lg";
  return (
    <div
      className={cn(
        "grid gap-3",
        size === "lg" ? "sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-3 sm:grid-cols-5",
        className,
      )}
    >
      {items.map((s, i) => (
        <div
          key={s.id}
          className={cn(
            "flex flex-col items-center gap-2 rounded-3xl bg-white/90 text-center text-slate-900 shadow-md",
            size === "lg" ? "p-4" : "p-3",
            i === 0 && "border-4 border-[color:var(--yellow)] shadow-lg",
            i === 0 && size === "lg" && "sm:scale-105",
          )}
        >
          <span className="text-xs font-bold uppercase tracking-wider opacity-60">#{i + 1}</span>
          <span
            className={cn(
              "flex items-center justify-center rounded-full font-display font-bold tabular-nums text-white shadow-inner",
              circle,
            )}
            style={{ background: getJarStrength(s.id)?.color ?? "var(--purple)" }}
          >
            {s.count}
          </span>
          <span
            className={cn(
              "font-bold leading-tight break-words",
              size === "lg" ? "text-sm" : "text-xs",
            )}
          >
            {getStrengthName(s.id, lang)}
          </span>
          {s.caption && <span className="text-xs opacity-70">{s.caption}</span>}
        </div>
      ))}
    </div>
  );
}
