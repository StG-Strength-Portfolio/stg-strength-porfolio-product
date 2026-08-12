import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { StickyNote } from "@/components/StickyNote";
import { TopStrengthCards } from "@/components/strengths/TopStrengthCards";
import { useLanguage } from "@/lib/i18n";
import {
  getSchoolTopStrengths,
  type SchoolTopStrength,
} from "@/lib/school-top-strengths.functions";

const COPY = {
  fi: {
    title: "Koulun Top 5 vahvuudet",
    empty: "Koulussa ei ole vielä kerätty tai annettu vahvuuksia.",
    loading: "Ladataan koulun vahvuuksia…",
    error: "Koulun vahvuuksia ei voitu ladata.",
  },
  en: {
    title: "School’s Top 5 strengths",
    empty: "No strengths have been collected or given in the school yet.",
    loading: "Loading school strengths…",
    error: "School strengths could not be loaded.",
  },
  sv: {
    title: "Skolans topp 5 styrkor",
    empty: "Inga styrkor har ännu samlats in eller getts i skolan.",
    loading: "Laddar skolans styrkor…",
    error: "Skolans styrkor kunde inte laddas.",
  },
} as const;

type LoadState = "loading" | "ready" | "error";

export function SchoolTopStrengths() {
  const { language } = useLanguage();
  const text = COPY[language];
  const getTopStrengths = useServerFn(getSchoolTopStrengths);
  const [items, setItems] = useState<SchoolTopStrength[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const result = await getTopStrengths();
        if (cancelled) return;
        setItems(result);
        setState("ready");
      } catch {
        if (cancelled) return;
        setState("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [getTopStrengths]);

  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";

  return (
    <StickyNote seed="t-school-top-strengths" className="space-y-4 md:col-span-2">
      <h2 className="text-2xl font-bold">{text.title}</h2>
      {state === "loading" && <p className="opacity-70">{text.loading}</p>}
      {state === "error" && <p className="opacity-70">{text.error}</p>}
      {state === "ready" && items.length === 0 && <p className="opacity-70">{text.empty}</p>}
      {state === "ready" && items.length > 0 && (
        <TopStrengthCards items={items} lang={lang} />
      )}
    </StickyNote>
  );
}
