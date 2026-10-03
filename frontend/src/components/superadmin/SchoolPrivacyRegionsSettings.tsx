import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StickyNote } from "@/components/StickyNote";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import type { PrivacyRegion } from "@/lib/external-content-preferences";

type SchoolRegionRow = {
  id: string;
  name: string;
  privacy_region: PrivacyRegion;
};

const COPY = {
  fi: {
    title: "Koulujen yksityisyysalue",
    description:
      "EU/ETA-kouluissa opettajilta ja koulun admineilta pyydetään hyväksyntä ennen Google Slides -opetusmateriaalien lataamista. Yhdysvaltalaisissa kouluissa tätä eurooppalaista hyväksyntäporttia ei käytetä.",
    europe: "Eurooppa (EU/ETA)",
    us: "Yhdysvallat",
    saved: "Yksityisyysalue päivitetty.",
    loadFailed: "Koulujen yksityisyysalueita ei voitu ladata.",
    saveFailed: "Yksityisyysaluetta ei voitu päivittää.",
    empty: "Ei kouluja.",
  },
  en: {
    title: "School privacy region",
    description:
      "EU/EEA schools require teachers and school admins to accept external content before Google Slides Teaching Materials load. U.S. schools do not use this European consent gate.",
    europe: "Europe (EU/EEA)",
    us: "United States",
    saved: "Privacy region updated.",
    loadFailed: "School privacy regions could not be loaded.",
    saveFailed: "The privacy region could not be updated.",
    empty: "No schools.",
  },
  sv: {
    title: "Skolans integritetsregion",
    description:
      "För skolor inom EU/EES måste lärare och skoladministratörer godkänna externt innehåll innan Google Slides-undervisningsmaterial laddas. Amerikanska skolor använder inte denna europeiska samtyckesport.",
    europe: "Europa (EU/EES)",
    us: "USA",
    saved: "Integritetsregionen har uppdaterats.",
    loadFailed: "Skolornas integritetsregioner kunde inte laddas.",
    saveFailed: "Integritetsregionen kunde inte uppdateras.",
    empty: "Inga skolor.",
  },
} as const;

export function SchoolPrivacyRegionsSettings() {
  const { language } = useLanguage();
  const text = COPY[language];
  const [schools, setSchools] = useState<SchoolRegionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("schools" as never)
        .select("id, name, privacy_region")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      setSchools(
        ((data ?? []) as Array<{ id: string; name: string; privacy_region?: string | null }>).map(
          (school) => ({
            id: school.id,
            name: school.name,
            privacy_region: school.privacy_region === "us" ? "us" : "eu_eea",
          }),
        ),
      );
    } catch (error) {
      console.error("[school-privacy-regions] load", error);
      toast.error(text.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  async function changeRegion(schoolId: string, privacyRegion: PrivacyRegion) {
    setSavingId(schoolId);
    try {
      const { error } = await supabase
        .from("schools" as never)
        .update({ privacy_region: privacyRegion } as never)
        .eq("id", schoolId);
      if (error) throw error;
      setSchools((current) =>
        current.map((school) =>
          school.id === schoolId ? { ...school, privacy_region: privacyRegion } : school,
        ),
      );
      toast.success(text.saved);
    } catch (error) {
      console.error("[school-privacy-regions] save", error);
      toast.error(text.saveFailed);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <StickyNote seed="sa-school-privacy-regions" className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{text.title}</h2>
        <p className="mt-1 max-w-4xl text-sm leading-relaxed opacity-70">{text.description}</p>
      </div>

      {loading ? (
        <p className="text-sm opacity-70">…</p>
      ) : schools.length === 0 ? (
        <p className="text-sm opacity-70">{text.empty}</p>
      ) : (
        <div className="space-y-3">
          {schools.map((school) => (
            <div
              key={school.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/60 p-3"
            >
              <span className="font-semibold">{school.name}</span>
              <select
                value={school.privacy_region}
                disabled={savingId === school.id}
                className="rounded-xl border border-black/20 bg-white px-3 py-2 text-sm"
                onChange={(event) =>
                  void changeRegion(school.id, event.target.value === "us" ? "us" : "eu_eea")
                }
              >
                <option value="eu_eea">{text.europe}</option>
                <option value="us">{text.us}</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </StickyNote>
  );
}
