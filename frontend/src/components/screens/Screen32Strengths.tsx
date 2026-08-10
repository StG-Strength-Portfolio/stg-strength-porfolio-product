import { useEffect, useState } from "react";

import { ReflectionTextarea } from "@/components/ReflectionTextarea";
import { loadResponse, useAutosave, type SaveState } from "@/hooks/use-autosave";
import { useLanguage, useTr } from "@/lib/i18n";
import { useReportCompletion } from "@/lib/screen-completion";
import { getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";
import { cn } from "@/lib/utils";

type Props = { onSaveStateChange?: (s: SaveState) => void };

const STRENGTH_FIELD = "screen_29_karkit";
const STRENGTH_COUNT = 26;

function isStrengthId(value: string) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= STRENGTH_COUNT;
}

function parseSaved(saved: unknown): [string, string] {
  if (typeof saved !== "string") return ["", ""];
  const values = saved
    .split(/[,;|]/)
    .map((v) => v.trim())
    .filter(isStrengthId);
  return [values[0] ?? "", values[1] ?? ""];
}

function StrengthPair({ onSaveStateChange }: Props) {
  const tr = useTr();
  const { language } = useLanguage();
  const report = useReportCompletion();
  const [values, setValues] = useState<[string, string]>(["", ""]);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = await loadResponse<string>(STRENGTH_FIELD);
      if (cancelled) return;
      setValues(parseSaved(saved));
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const serialized = values.filter(Boolean).join(",");
  const saveState = useAutosave(STRENGTH_FIELD, serialized, {
    enabled: loaded && dirty,
  });

  useEffect(() => {
    onSaveStateChange?.(saveState);
  }, [saveState, onSaveStateChange]);

  useEffect(() => {
    if (loaded) report(STRENGTH_FIELD, values.some(Boolean));
  }, [loaded, report, values]);

  function change(slot: 0 | 1, next: string) {
    setDirty(true);
    setValues((current) => {
      const other = slot === 0 ? 1 : 0;
      if (next && current[other] === next) return current;
      const copy: [string, string] = [...current];
      copy[slot] = next;
      return copy;
    });
  }

  return (
    <div className="mt-6 flex max-w-[390px] flex-col gap-3">
      {([0, 1] as const).map((slot) => {
        const value = values[slot];
        const strengthNumber = Number(value);
        const hasValue = isStrengthId(value);
        const otherValue = values[slot === 0 ? 1 : 0];

        return (
          <div key={slot} className="relative w-full">
            {hasValue && (
              <span
                className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded-full border border-black/20"
                style={{ backgroundColor: getStrengthColor(strengthNumber) }}
              />
            )}
            <select
              value={value}
              onChange={(e) => change(slot, e.target.value)}
              aria-label={`${tr("Valitse vahvuus")} ${slot + 1}`}
              className={cn(
                "h-12 w-full appearance-none rounded-2xl border-2 border-black bg-[#fffefa] px-4 pr-10 font-display text-[15px] font-bold text-[#241b3f] shadow-[0_4px_0_#4b326c] outline-none focus:ring-2 focus:ring-[#d5c2ef]",
                hasValue && "pl-10",
              )}
            >
              <option value="">{tr("Valitse vahvuus")} {slot + 1}</option>
              {Array.from({ length: STRENGTH_COUNT }, (_, i) => i + 1).map((id) => {
                const optionValue = String(id);
                return (
                  <option key={id} value={optionValue} disabled={optionValue === otherValue}>
                    {getStrengthName(id, language)}
                  </option>
                );
              })}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-[color:var(--purple-dark)]">▼</span>
          </div>
        );
      })}
    </div>
  );
}

function WorksheetInput({ fieldKey, onSaveStateChange }: { fieldKey: string; onSaveStateChange?: (s: SaveState) => void }) {
  return (
    <div className="h-full w-full overflow-hidden rounded-[18px] [&_label]:hidden [&>div]:h-full [&>div]:min-h-0 [&_div]:h-full [&_div]:border-0 [&_div]:bg-transparent [&_div]:p-0 [&_div]:shadow-none [&_textarea]:h-full [&_textarea]:min-h-0 [&_textarea]:w-full [&_textarea]:resize-none [&_textarea]:rounded-[18px] [&_textarea]:border-0 [&_textarea]:bg-transparent [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-[15px] [&_textarea]:leading-[1.45] [&_textarea]:text-[#241b3f] [&_textarea]:outline-none [&_textarea]:shadow-none [&_textarea]:ring-0">
      <ReflectionTextarea fieldKey={fieldKey} label="" rows={4} onSaveStateChange={onSaveStateChange} />
    </div>
  );
}

export function Screen32Strengths({ onSaveStateChange }: Props) {
  const tr = useTr();
  const { language } = useLanguage();
  const sheetIllustration = language === "fi" ? "/illustrations/s29-lukiossa-sheet-fi.png" : language === "sv" ? "/illustrations/s29-lukiossa-sheet-sv.png" : "/illustrations/s29-lukiossa-sheet-en.png";
  const strengthInstruction =
    language === "en"
      ? "Choose 1–2 strength candies and use them in your studies."
      : language === "sv"
        ? "Välj 1–2 styrkegodisar och använd dem i dina studier."
        : "Valitse 1–2 vahvuuskarkkia ja hyödynnä niitä opinnoissa.";

  return (
    <div className="relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto text-white [scrollbar-gutter:stable]">
      <div className="relative mx-auto grid min-h-[760px] w-full max-w-[1500px] grid-cols-1 gap-12 px-[6%] pb-24 pt-8 lg:grid-cols-[44%_56%]">
        <div className="relative min-w-0 pt-6">
          <h1 className="max-w-[520px] font-display text-[clamp(36px,3.2vw,54px)] font-semibold leading-[1.05] text-[#FFE77A]">{tr("Vahvuuskarkkini")}</h1>
          <p className="mt-10 max-w-[430px] font-display text-[clamp(20px,1.55vw,27px)] font-semibold leading-[1.25] text-white">{strengthInstruction}</p>
          <StrengthPair onSaveStateChange={onSaveStateChange} />
          <p className="mt-16 max-w-[440px] font-display text-[clamp(19px,1.6vw,26px)] font-semibold leading-[1.35] text-white">{tr("Pohdi, mitä teit, koit ja opit.")}</p>
          <div className="mt-8 grid max-w-[460px] grid-cols-[10px_minmax(0,1fr)] gap-x-4"><span aria-hidden="true" className="mt-[10px] h-[8px] w-[8px] rounded-full bg-[#ffc936]" /><p className="text-[clamp(18px,1.45vw,24px)] leading-[1.35] text-white">{tr("Täydennä oheinen tehtävä.")}</p></div>
          <img src="/illustrations/s29-candy-collage.png" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-[-10px] left-[-8%] h-[250px] w-auto select-none object-contain" />
        </div>

        <div className="relative flex min-h-[760px] min-w-0 items-start justify-center">
          <div className="relative h-[700px] w-[560px] max-w-full shrink-0">
            <img src={sheetIllustration} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-fill" />
            <div className="absolute left-[25.39%] top-[13.09%] z-20 h-[18.95%] w-[50%]"><WorksheetInput fieldKey="screen_29_opit" onSaveStateChange={onSaveStateChange} /></div>
            <div className="absolute left-[14.75%] top-[39.65%] z-20 h-[18.65%] w-[33.59%]"><WorksheetInput fieldKey="screen_29_seuraavaksi" onSaveStateChange={onSaveStateChange} /></div>
            <div className="absolute left-[51.86%] top-[39.65%] z-20 h-[18.65%] w-[33.40%]"><WorksheetInput fieldKey="screen_29_hyodynnat" onSaveStateChange={onSaveStateChange} /></div>
            <div className="absolute left-[24.71%] top-[69.73%] z-20 h-[16.02%] w-[50.49%]"><WorksheetInput fieldKey="screen_29_teit" onSaveStateChange={onSaveStateChange} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
