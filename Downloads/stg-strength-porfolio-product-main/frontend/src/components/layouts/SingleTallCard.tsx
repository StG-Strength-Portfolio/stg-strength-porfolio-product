import type { ReactNode } from "react";

/**
 * Single tall centered card for introspective / deep-reflection screens.
 * Used when a screen has 1 prompt that deserves room to breathe.
 * Pair with a single <StickyNote> child; its <ReflectionTextarea> will
 * stretch to fill the card.
 */
export function SingleTallCard({ children }: { children: ReactNode }) {
  return <div className="layout-single-tall">{children}</div>;
}
