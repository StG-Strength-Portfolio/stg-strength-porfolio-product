import { useEffect, useState } from "react";
import { useAutosave, useResponseReader, type SaveState } from "@/hooks/use-autosave";
import { cn } from "@/lib/utils";
import { useTr } from "@/lib/i18n";

const LABELS: Array<{ label: string; value: number }> = [
  { label: "minuun hyvin sopiva", value: 5 },
  { label: "minuun sopiva", value: 4 },
  { label: "neutraali", value: 3 },
  { label: "minuun huonosti sopiva", value: 2 },
  { label: "minuun erittäin huonosti sopiva", value: 1 },
];

/**
 * A candy-style 1–5 picker. The on-screen labels match the workbook verbatim.
 * `reversed=true` flips the scoring (so a "5" answer becomes a 1 point score)
 * but the labels stay in the same order the workbook prints them.
 */
export function MeterPicker({
  fieldKey,
  statement,
  reversed = false,
  onSaveStateChange,
  onScoreChange,
}: {
  fieldKey: string;
  statement: string;
  reversed?: boolean;
  onSaveStateChange?: (s: SaveState) => void;
  onScoreChange?: (score: number | null) => void;
}) {
  const tr = useTr();
  const [picked, setPicked] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  // @lovable-new 2026-08-05 — mode-aware read (empty in teacher preview).
  const readResponse = useResponseReader();
  useEffect(() => {
    (async () => {
      const v = await readResponse<number>(fieldKey);
      setPicked(typeof v === "number" ? v : null);
      setLoaded(true);
    })();
  }, [fieldKey, readResponse]);

  const state = useAutosave(fieldKey, picked, { enabled: loaded && picked !== null });
  useEffect(() => { onSaveStateChange?.(state); }, [state, onSaveStateChange]);
  useEffect(() => {
    if (!loaded) return;
    if (picked === null) { onScoreChange?.(null); return; }
    onScoreChange?.(reversed ? 6 - picked : picked);
  }, [picked, loaded, reversed, onScoreChange]);

  return (
    <div className="space-y-3">
      <p className="text-[0.95rem] leading-snug font-medium text-[color:var(--ink)]">
        {statement}
      </p>
      <div className="flex flex-col gap-2">
        {LABELS.map(({ label, value }) => {
          const active = picked === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setPicked(value)}
              className={cn(
                "candy-chip flex items-center gap-3 rounded-full border-2 px-3 py-2 text-left text-sm font-medium transition-all",
                active
                  ? "is-active bg-[color:var(--coral)] border-[color:var(--coral)] text-white"
                  : "bg-white text-slate-900 border-white/40 hover:bg-[color:var(--yellow)]/50",
              )}
              aria-pressed={active}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display font-bold",
                  active ? "bg-white text-[color:var(--coral)]" : "bg-[color:var(--yellow)] text-[color:var(--ink)]",
                )}
              >
                {value}
              </span>
              <span>{tr(label)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
