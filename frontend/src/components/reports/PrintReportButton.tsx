/**
 * @lovable-new 2026-08-05
 * "Save as PDF" for any report view — uses the browser print dialog, which
 * offers "Save as PDF" on every platform. Hidden from the printout itself.
 *
 * @lovable-new 2026-08-05 — Restyled to the permanent white / dark-purple pill
 * used across every teacher and school-admin report, with hover + focus states.
 */
import { useTr } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function PrintReportButton({ className }: { className?: string }) {
  const tr = useTr();
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn(
        "no-print rounded-full border-2 border-[color:var(--purple)] bg-white px-4 py-1.5",
        "text-xs font-bold text-[color:var(--purple)] shadow-sm transition-colors",
        "hover:bg-[color:var(--purple)]/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--purple)] focus-visible:ring-offset-2",
        className,
      )}
    >
      {tr("Tallenna PDF:nä")}
    </button>
  );
}
