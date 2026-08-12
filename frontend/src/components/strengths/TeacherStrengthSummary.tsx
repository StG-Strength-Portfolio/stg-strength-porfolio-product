import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { StickyNote } from "@/components/StickyNote";
import { TopStrengthCards } from "@/components/strengths/TopStrengthCards";
import { useLanguage } from "@/lib/i18n";
import {
  getTeacherStrengthSummary,
  type TeacherStrengthSummaryData,
} from "@/lib/teacher-strength-summary.functions";

const COPY = {
  fi: {
    schoolTitle: "Koulun Top 5 vahvuudet",
    classTitle: "Luokan Top 5 vahvuudet",
    schoolEmpty: "Koulussa ei ole vielä kerätty tai annettu vahvuuksia.",
    classEmpty: "Tässä luokassa ei ole vielä kerätty vahvuuksia tai annettu vahvuuksia opiskelijoille.",
    noClasses: "Sinulla ei ole vielä luokkia.",
    loading: "Ladataan yhteenvetoa…",
    error: "Yhteenvetoa ei voitu ladata.",
  },
  en: {
    schoolTitle: "School’s Top 5 strengths",
    classTitle: "Class Top 5 strengths",
    schoolEmpty: "No strengths have been collected or given in the school yet.",
    classEmpty: "No strengths have been collected or given to students in this class yet.",
    noClasses: "You do not have any classes yet.",
    loading: "Loading summary…",
    error: "The summary could not be loaded.",
  },
  sv: {
    schoolTitle: "Skolans topp 5 styrkor",
    classTitle: "Klassens topp 5 styrkor",
    schoolEmpty: "Inga styrkor har ännu samlats in eller getts i skolan.",
    classEmpty: "Inga styrkor har ännu samlats in eller getts till elever i den här klassen.",
    noClasses: "Du har inga klasser ännu.",
    loading: "Laddar sammanfattningen…",
    error: "Sammanfattningen kunde inte laddas.",
  },
} as const;

type LoadState = "loading" | "ready" | "error";

const EMPTY_SUMMARY: TeacherStrengthSummaryData = {
  schoolStrengths: [],
  classes: [],
};

export function TeacherStrengthSummary() {
  const { language } = useLanguage();
  const text = COPY[language];
  const getSummary = useServerFn(getTeacherStrengthSummary);
  const [summary, setSummary] = useState<TeacherStrengthSummaryData>(EMPTY_SUMMARY);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const result = await getSummary();
        if (cancelled) return;
        setSummary(result);
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
  }, [getSummary]);

  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";

  if (state === "loading") {
    return (
      <StickyNote seed="teacher-summary-loading" className="p-6">
        <p className="opacity-70">{text.loading}</p>
      </StickyNote>
    );
  }

  if (state === "error") {
    return (
      <StickyNote seed="teacher-summary-error" className="p-6">
        <p className="opacity-70">{text.error}</p>
      </StickyNote>
    );
  }

  return (
    <div className="space-y-6">
      <StickyNote seed="teacher-summary-school" className="space-y-5 p-6">
        <h2 className="text-2xl font-bold">{text.schoolTitle}</h2>
        {summary.schoolStrengths.length === 0 ? (
          <p className="opacity-70">{text.schoolEmpty}</p>
        ) : (
          <TopStrengthCards items={summary.schoolStrengths} lang={lang} />
        )}
      </StickyNote>

      {summary.classes.length === 0 ? (
        <p className="px-1 text-sm opacity-70">{text.noClasses}</p>
      ) : (
        <div className="space-y-5">
          {summary.classes.map((klass) => (
            <StickyNote
              key={klass.classId}
              seed={`teacher-summary-class-${klass.classId}`}
              className="space-y-4 p-5"
            >
              <div className="space-y-1">
                <h3 className="text-xl font-bold">{klass.className}</h3>
                <p className="text-sm opacity-70">{text.classTitle}</p>
              </div>

              {klass.strengths.length === 0 ? (
                <p className="text-sm opacity-70">{text.classEmpty}</p>
              ) : (
                <TopStrengthCards items={klass.strengths} lang={lang} size="sm" />
              )}
            </StickyNote>
          ))}
        </div>
      )}
    </div>
  );
}
