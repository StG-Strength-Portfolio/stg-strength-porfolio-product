/**
 * @lovable-new 2026-07-31
 * Shared 26-strength picker grid (canonical registry + brand hex colours).
 * Supports single-select (`selected`) and multi-select (`selectedIds` + `max`).
 */
import { ALL_STRENGTHS } from "@/lib/strength-jar-data";
import { CheckIcon } from "@/components/icons/AppIcons";
import { useTr } from "@/lib/i18n";
import { getStrengthName } from "@/lib/strengths-i18n";
import { cn } from "@/lib/utils";

export function StrengthPickerGrid({
  lang,
  selected,
  selectedIds,
  max = 3,
  onSelect,
  disabled,
  className,
}: {
  lang: "fi" | "sv" | "en";
  /** Single-select mode. */
  selected?: number | null;
  /** Multi-select mode — when provided, the parent toggles ids itself. */
  selectedIds?: number[];
  max?: number;
  onSelect: (id: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const tr = useTr();
  const multi = Array.isArray(selectedIds);
  const chosen = new Set(selectedIds ?? (selected != null ? [selected] : []));
  const full = multi && chosen.size >= max;

  return (
    <div className="space-y-2">
      {multi && (
        <p className="text-sm font-bold opacity-80">
          {tr("Valitse 1–3 vahvuutta")} — {tr("Valittu")} {chosen.size} / {max}
        </p>
      )}
      <div
        className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
          className,
        )}
      >
        {ALL_STRENGTHS.map((s) => {
          const isOn = chosen.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={isOn}
              disabled={disabled || (full && !isOn)}
              onClick={() => onSelect(s.id)}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-3xl bg-white/90 p-3 text-center text-slate-900 shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-40",
                isOn && "border-4 border-[color:var(--yellow)]",
              )}
            >
              {isOn && multi && (
                <span
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--yellow)] text-slate-900"
                  aria-hidden
                >
                  <CheckIcon size={14} />
                </span>
              )}
              <span
                className="h-12 w-12 rounded-full shadow-inner"
                style={{ background: s.color }}
                aria-hidden
              />
              <span className="break-words text-xs font-bold leading-tight">
                {getStrengthName(s.id, lang)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
