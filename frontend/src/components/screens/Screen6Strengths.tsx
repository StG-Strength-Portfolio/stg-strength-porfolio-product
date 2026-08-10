import { useEffect, useState } from "react";

import { useAutosave, loadResponse, type SaveState } from "@/hooks/use-autosave";
import { useTr, useLanguage } from "@/lib/i18n";
import { useReportCompletion } from "@/lib/screen-completion";
import { getStrengthColor, getStrengthName } from "@/lib/strengths-i18n";
import { cn } from "@/lib/utils";

type Props = { onSaveStateChange?: (s: SaveState) => void };

export function Screen6Strengths({ onSaveStateChange }: Props) {
  const tr = useTr();
  const { language } = useLanguage();
  const strengthJarLabel =
    language === "en" ? "My strengths" : language === "sv" ? "Mina styrkor" : "Minun vahvuuteni";

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  const report = useReportCompletion();

  const fieldKey = "screen_6_known_strengths";
  const maxSelections = 5;

  const legacyNameToId: Record<string, number> = {
    Luovuus: 1,
    Uteliaisuus: 2,
    Arviointikyky: 3,
    "Oppimisen ilo": 4,
    Näkökulmanottokyky: 5,
    Rohkeus: 6,
    Sinnikkyys: 7,
    Rehellisyys: 8,
    Innokkuus: 9,
    Innostus: 9,
    Sisukkuus: 10,
    Myötätunto: 11,
    Rakkaus: 12,
    Ystävällisyys: 13,
    "Sosiaalinen älykkyys": 14,
    Ryhmätyötaito: 15,
    Ryhmätyötaidot: 15,
    Reiluus: 16,
    Johtajuus: 17,
    Anteeksiantavuus: 18,
    Vaatimattomuus: 19,
    Harkitsevuus: 20,
    Harkitsevaisuus: 20,
    Itsesäätely: 21,
    "Kauneuden ja erinomaisuuden arvostaminen": 22,
    "Kauneuden ja erinomaisuuden arvostus": 22,
    Kiitollisuus: 23,
    Toiveikkuus: 24,
    Huumorintaju: 25,
    Hengellisyys: 26,
    Henkisyys: 26,
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const saved = await loadResponse<unknown[]>(fieldKey);
      if (cancelled) return;

      if (Array.isArray(saved)) {
        const migratedIds = saved
          .map((item) => {
            if (typeof item === "number" && Number.isInteger(item) && item >= 1 && item <= 26) {
              return item;
            }
            if (typeof item === "string") return legacyNameToId[item];
            return undefined;
          })
          .filter((id): id is number => typeof id === "number");

        setSelectedIds([...new Set(migratedIds)].slice(0, maxSelections));
      }

      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const state = useAutosave(fieldKey, selectedIds, { enabled: loaded });

  useEffect(() => {
    onSaveStateChange?.(state);
    if (state === "saved") setPendingSave(false);
  }, [state, onSaveStateChange]);

  useEffect(() => {
    if (!loaded) return;
    report(fieldKey, selectedIds.length >= 1 && !pendingSave);
  }, [loaded, pendingSave, report, selectedIds.length]);

  function toggleStrength(id: number) {
    if (!selectedIds.includes(id) && selectedIds.length >= maxSelections) return;

    setPendingSave(true);
    setSelectedIds((currentIds) => {
      if (currentIds.includes(id)) {
        return currentIds.filter((selectedId) => selectedId !== id);
      }
      if (currentIds.length >= maxSelections) return currentIds;
      return [...currentIds, id];
    });
  }

  return (
    <div className="relative min-h-[560px] overflow-hidden p-8 text-white">
      <div className="relative z-10 grid h-full grid-cols-[220px_minmax(0,1fr)] gap-8">
        <aside className="flex flex-col items-center justify-center pt-4 text-center">
          <div className="relative h-[245px] w-[185px]">
            <div className="absolute left-1/2 top-0 z-20 h-[28px] w-[140px] -translate-x-1/2 rounded-full border-[3px] border-black bg-[#EAF9FC]" />

            <div className="absolute bottom-0 left-1/2 h-[220px] w-[175px] -translate-x-1/2 overflow-hidden rounded-[36px] border-[3px] border-black bg-white/20 shadow-[0_9px_0_rgba(0,0,0,0.14)]">
              {selectedIds.length === 0 && (
                <div className="absolute left-1/2 top-[70px] w-[125px] -translate-x-1/2 -rotate-3 bg-[#FFF4DE] px-3 py-3 text-center text-[11px] font-bold leading-tight text-[#4C3B58]">
                  {strengthJarLabel}
                </div>
              )}

              <div className="absolute inset-x-2 bottom-5 flex flex-col-reverse items-center gap-2">
                {selectedIds.map((id, index) => {
                  const color = getStrengthColor(id);
                  const name = getStrengthName(id, language);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleStrength(id)}
                      title={name}
                      className={`flex items-center justify-center transition-transform hover:scale-105 ${index === 0 ? "-rotate-2" : ""} ${index === 1 ? "rotate-2" : ""} ${index === 2 ? "-rotate-1" : ""} ${index === 3 ? "rotate-1" : ""} ${index === 4 ? "-rotate-2" : ""}`}
                    >
                      <span aria-hidden="true" className="h-[24px] w-[14px] shrink-0 rounded-full border-2 border-black" style={{ backgroundColor: color }} />
                      <span className="-mx-[2px] flex min-h-[32px] max-w-[120px] items-center justify-center rounded-full border-2 border-black px-3 py-1 text-center text-[9px] font-semibold leading-[1.05] text-[#2E2336] shadow-sm" style={{ backgroundColor: color }}>
                        {name}
                      </span>
                      <span aria-hidden="true" className="h-[24px] w-[14px] shrink-0 rounded-full border-2 border-black" style={{ backgroundColor: color }} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="relative mt-5 max-w-[205px] text-center font-display text-[13px] font-semibold leading-[1.25] text-[#FFE65A]">
            <span className="absolute -left-7 top-2 -rotate-[25deg] text-[34px]">↗</span>
            {tr("Valitse ne vahvuudet, jotka tunnistat itsessäsi tai läheisissäsi. Voit palata muokkaamaan valintaasi myöhemmin.")}
          </div>

          <div className="mt-3 font-display text-[14px] font-semibold">
            {tr("Valittu")} {selectedIds.length} / {maxSelections}
          </div>
        </aside>

        <section className="min-w-0 pt-1">
          <h1 className="mb-1 max-w-[850px] font-display text-[30px] font-bold leading-tight">
            {tr("Luonteenvahvuudet, joita voit tunnistaa itsessäsi ja toisissa")}
          </h1>
          <p className="mb-4 font-display text-[18px] font-medium">{tr("Keksitkö lisää?")}</p>

          <div className="grid max-w-[1000px] grid-cols-5 gap-x-3 gap-y-3">
            {Array.from({ length: 26 }, (_, index) => index + 1).map((id) => {
              const name = getStrengthName(id, language);
              const color = getStrengthColor(id);
              const isSelected = selectedIds.includes(id);
              const selectionDisabled = selectedIds.length >= maxSelections && !isSelected;

              return (
                <button
                  key={id}
                  type="button"
                  disabled={selectionDisabled}
                  onClick={() => toggleStrength(id)}
                  aria-pressed={isSelected}
                  aria-label={name}
                  className={cn(
                    "group flex min-w-0 items-center justify-center transition-all duration-150",
                    isSelected && "scale-105",
                    selectionDisabled && "cursor-not-allowed opacity-35",
                    !selectionDisabled && "hover:scale-105",
                  )}
                >
                  <span aria-hidden="true" className="h-[34px] w-[18px] shrink-0 rounded-full border-2 border-black" style={{ backgroundColor: color }} />
                  <span
                    className={cn(
                      "-mx-[2px] flex min-h-[46px] w-[128px] shrink-0 items-center justify-center rounded-full border-2 border-black px-2 py-1 text-center font-display text-[10px] font-semibold leading-[1.08] text-[#2E2336] shadow-[0_4px_0_rgba(0,0,0,0.12)]",
                      isSelected && "ring-4 ring-white/70",
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {name}
                  </span>
                  <span aria-hidden="true" className="h-[34px] w-[18px] shrink-0 rounded-full border-2 border-black" style={{ backgroundColor: color }} />
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
