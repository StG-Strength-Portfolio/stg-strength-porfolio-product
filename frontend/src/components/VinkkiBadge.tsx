import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";

export function VinkkiBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--mint)] text-[color:var(--ink)] px-3 py-1 text-xs font-semibold shadow-[2px_2px_0_0_var(--purple-dark)]">
      <Lightbulb className="h-3 w-3" /> Vinkki — {children}
    </span>
  );
}
