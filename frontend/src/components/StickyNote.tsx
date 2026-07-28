import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function StickyNote({
  children,
  seed: _seed,
  className,
  tone = "white",
}: {
  children: ReactNode;
  /** kept for backwards-compat; rotation is no longer applied to content cards */
  seed?: string;
  className?: string;
  tone?: "white" | "yellow" | "mint" | "coral";
}) {
  const bg =
    tone === "yellow" ? "bg-[color:var(--yellow)] text-[color:var(--ink)]"
    : tone === "mint" ? "bg-[color:var(--mint)] text-[color:var(--ink)]"
    : tone === "coral" ? "bg-[color:var(--coral)] text-white"
    : "bg-card text-card-foreground";
  return (
    <div className={cn("sticky-note", bg, className)}>
      {children}
    </div>
  );
}
