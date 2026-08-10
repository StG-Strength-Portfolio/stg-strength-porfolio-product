import { useCallback, useEffect, useState } from "react";

import { useAutosave, loadResponse, type SaveState } from "@/hooks/use-autosave";
import { useLanguage, useTr } from "@/lib/i18n";
import { useReportCompletion } from "@/lib/screen-completion";
import { getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";
import { cn } from "@/lib/utils";

type Props = { onSaveStateChange?: (s: SaveState) => void };

const NOTES = [
  { id: 1, position: "left-[0%] top-[3%] h-[205px] w-[29%] -rotate-[2deg]" },
  { id: 2, position: "left-[35.5%] top-[0%] h-[205px] w-[29%] rotate-[1deg]" },
  { id: 3, position: "right-[0%] top-[3%] h-[205px] w-[29%] rotate-[2deg]" },
  { id: 4, position: "left-[2%] top-[34%] h-[195px] w-[29%] rotate-[1deg]" },
  { id: 5, position: "left-[36%] top-[32%] h-[195px] w-[29%] -rotate-[1deg]" },
  { id: 6, position: "right-[0%] top-[34%] h-[195px] w-[29%] -rotate-[2deg]" },
  { id: 7, position: "left-[35.5%] top-[64%] h-[190px] w-[29%] rotate-[1deg]" },
] as const;

export function Screen10Strengths({ onSaveStateChange }: Props) {
  const tr = useTr();
  const { language } = useLanguage();
  const [selectedStrengths, setSelectedStrengths] = useState<Record<number, string>>({});
  const selectedValues = Object.values(selectedStrengths).filter(Boolean);

  const updateStrength = useCallback((index: number, value: string) => {
    setSelectedStrengths((current) => {
      if (current[index] === value) return current;
      return { ...current, [index]: value };
    });
  }, []);

  return (
    <div className="relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto px-[3%] pb-16 pt-6 text-white">
      <div className="grid min-h-[760px] grid-cols-[0.25fr_0.75fr] gap-7">
        <div className="relative min-w-0">
          <h1 className="font-display text-[42px] font-medium leading-[1.12] tracking-[-0.01em]">{tr("Minä olen")}</h1>
          <p className="mt-8 max-w-[290px] font-display text-[22px] font-medium leading-[1.4]">{tr("Muuta muilta saamasi palaute lauseiksi minä muotoon:")}</p>
          <div className="mt-7 max-w-[290px] text-[21px] font-normal leading-[1.45]">{tr('"Olet sinnikäs" → "Minä olen sinnikäs."')}</div>
          <img src="/illustrations/mina-olen-character.png" alt={tr("Minä olen –övning")} className="pointer-events-none absolute bottom-[-55px] left-[-95px] h-[520px] w-auto max-w-none select-none object-contain" />
        </div>

        <div className="relative min-h-[760px] min-w-0">
          {NOTES.map((note) => (
            <div key={note.id} className={`absolute flex flex-col overflow-visible rounded-[18px_14px_24px_16px] border-[3px] border-black bg-[#fffefa] px-5 pb-4 pt-4 text-black shadow-[0_10px_0_#4b326c] transition-all duration-200 hover:z-30 hover:-translate-y-1 hover:scale-[1.02] focus-within:z-40 focus-within:ring-2 focus-within:ring-[#d5c2ef] ${note.position}`}>
              <p className="mb-5 shrink-0 text-center font-display text-[15px] font-medium uppercase leading-[1.2] tracking-[0.2px] text-black">{tr("Minä olen ...")}</p>
              <div className="flex flex-1 items-center">
                <Screen10StrengthSelect index={note.id - 1} fieldKey={`screen_10_mina_olen_${note.id}`} language={language} selectedValues={selectedValues} onValueChange={updateStrength} onSaveStateChange={onSaveStateChange} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Screen10StrengthSelect({ index, fieldKey, language, selectedValues, onValueChange, onSaveStateChange }: {
  index: number;
  fieldKey: string;
  language: "fi" | "sv" | "en";
  selectedValues: string[];
  onValueChange: (index: number, value: string) => void;
  onSaveStateChange?: (s: SaveState) => void;
}) {
  const tr = useTr();
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [initialValueWasValid, setInitialValueWasValid] = useState(false);
  const report = useReportCompletion();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = await loadResponse<string>(fieldKey);
      if (cancelled) return;
      const savedNumber = Number(saved);
      const isValidSavedStrength = typeof saved === "string" && Number.isInteger(savedNumber) && savedNumber >= 1 && savedNumber <= 26;
      if (isValidSavedStrength) {
        setValue(saved);
        setInitialValueWasValid(true);
        onValueChange(index, saved);
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [fieldKey, index, onValueChange]);

  const state = useAutosave(fieldKey, value, { enabled: loaded && (dirty || initialValueWasValid) });

  useEffect(() => { onSaveStateChange?.(state); }, [state, onSaveStateChange]);
  useEffect(() => { if (loaded) report(fieldKey, value.trim().length > 0); }, [fieldKey, loaded, report, value]);

  function handleChange(nextValue: string) {
    setDirty(true);
    setValue(nextValue);
    onValueChange(index, nextValue);
  }

  const selectedStrengthNumber = Number(value);
  const hasSelectedStrength = Number.isInteger(selectedStrengthNumber) && selectedStrengthNumber >= 1 && selectedStrengthNumber <= 26;

  return (
    <div className="relative w-full">
      {hasSelectedStrength && <span className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded-full border border-black/20" style={{ backgroundColor: getStrengthColor(selectedStrengthNumber) }} />}
      <select value={value} onChange={(event) => handleChange(event.target.value)} aria-label={tr("Minä olen ...")} className={cn("h-12 w-full appearance-none rounded-2xl border border-black/10 bg-white px-4 pr-10 font-display text-sm font-bold text-[color:var(--ink)] shadow-sm outline-none transition focus:border-[color:var(--purple-dark)] focus:ring-2 focus:ring-[#d5c2ef]", hasSelectedStrength && "pl-10")}>
        <option value="">{tr("Valitse vahvuus")}</option>
        {Array.from({ length: 26 }).map((_, strengthIndex) => {
          const strengthNumber = strengthIndex + 1;
          const optionValue = String(strengthNumber);
          const alreadyUsed = selectedValues.includes(optionValue) && optionValue !== value;
          return <option key={strengthNumber} value={optionValue} disabled={alreadyUsed}>{getStrengthName(strengthNumber, language)}</option>;
        })}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-[color:var(--purple-dark)]">▼</span>
    </div>
  );
}
