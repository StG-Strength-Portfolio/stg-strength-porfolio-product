import type { ReactNode } from "react";

/**
 * Two-column grid for screens with 2–3 related but distinct prompts
 * (e.g. family / school / friends). Stacks on mobile.
 */
export function TwoColumnCards({ children }: { children: ReactNode }) {
  return <div className="layout-two-col">{children}</div>;
}
