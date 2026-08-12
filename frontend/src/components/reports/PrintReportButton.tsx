/**
 * @lovable-new 2026-08-05
 * "Save as PDF" for any report view — uses the browser print dialog, which
 * offers "Save as PDF" on every platform. Hidden from the printout itself.
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
        "no-print rounded-full bg-[color:var(--yellow)] px-4 py-1.5 text-xs font-bold text-[color:var(--ink)] shadow hover:brightness-95",
        className,
      )}
    >
      {tr("Tallenna PDF:nä")}
    </button>
  );
}
