import { useEffect, useState } from "react";
import { useAutosave, loadResponse, type SaveState } from "@/hooks/use-autosave";
import { useReportCompletion } from "@/lib/screen-completion";
import { cn } from "@/lib/utils";
import { useTFi } from "@/lib/i18n";

export function SelectableChips({
  fieldKey,
  options,
  onSaveStateChange,
  max,
  min = 1,
  labelFor,
}: {
  fieldKey: string;
  options: string[];
  onSaveStateChange?: (s: SaveState) => void;
  max?: number;
  min?: number;
  /** Display-only label mapper. Never affects stored/compared values. */
  labelFor?: (opt: string) => string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const report = useReportCompletion();
  const tFi = useTFi();

  useEffect(() => {
    (async () => {
      const v = await loadResponse<string[]>(fieldKey);
      if (Array.isArray(v)) setSelected(v);
      setLoaded(true);
    })();
  }, [fieldKey]);

  const state = useAutosave(fieldKey, selected, { enabled: loaded });
  useEffect(() => { onSaveStateChange?.(state); }, [state, onSaveStateChange]);

  useEffect(() => {
    if (!loaded) return;
    report(fieldKey, selected.length >= min);
  }, [selected, loaded, fieldKey, report, min]);

  function toggle(opt: string) {
    setSelected((cur) => {
      if (cur.includes(opt)) return cur.filter((c) => c !== opt);
      if (max && cur.length >= max) return cur;
      return [...cur, opt];
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        const atMax = !!max && selected.length >= max && !active;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            disabled={atMax}
            className={cn(
              "candy-chip rounded-full border-2 px-4 py-1.5 text-sm font-semibold",
              active
                ? "is-active bg-[color:var(--coral)] border-[color:var(--coral)] text-white"
                : "bg-white text-slate-900 border-white/40 hover:bg-[color:var(--yellow)]/70",
              atMax && "opacity-40 cursor-not-allowed hover:bg-white",
            )}

          >
            {labelFor ? labelFor(opt) : tFi(opt)}
          </button>
        );
      })}
    </div>
  );
}
