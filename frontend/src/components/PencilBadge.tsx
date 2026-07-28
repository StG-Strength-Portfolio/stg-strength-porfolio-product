import type { ReactNode } from "react";
import { Pencil } from "lucide-react";

export function PencilBadge({ children }: { children: ReactNode }) {
  return (
    <span className="pencil-badge">
      <Pencil className="h-3 w-3" /> {children}
    </span>
  );
}