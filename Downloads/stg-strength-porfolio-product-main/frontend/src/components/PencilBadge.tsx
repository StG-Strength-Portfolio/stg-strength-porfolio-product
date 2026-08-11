import type { ReactNode } from "react";
import { PencilIcon } from "@/components/icons/AppIcons";

export function PencilBadge({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span className="pencil-badge">
      {icon ?? <PencilIcon size={14} />} {children}
    </span>
  );
}
