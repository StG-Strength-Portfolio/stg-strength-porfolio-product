/**
 * Vahvuusseikkailu — Complete Trilingual Strengths Registry
 * Finnish, Swedish, English (from corrected Excel workbook)
 *
 * CRITICAL: This is the single source of truth for all strength names.
 * NO fallback logic — each language is complete and atomic.
 * If a language is selected, ONLY that language is used for display.
 */

export interface Strength {
  nr: number;
  fi: string;
  sv: string;
  en: string;
}

export const STRENGTHS: Strength[] = [
  // WISDOM (Visdom & kunskap)
  { nr: 1, fi: "Luovuus", sv: "Kreativitet", en: "Creativity" },
  { nr: 2, fi: "Uteliaisuus", sv: "Nyfikenhet", en: "Curiosity" },
  { nr: 3, fi: "Arviointikyky", sv: "Omdöme", en: "Judgment" },
  { nr: 4, fi: "Oppimisen ilo", sv: "Lärandeglädje", en: "Love of Learning" },
  { nr: 5, fi: "Näkökulmanottokyky", sv: "Perspektivtagande", en: "Perspective" },

  // COURAGE (Mod)
  { nr: 6, fi: "Rohkeus", sv: "Mod", en: "Courage" },
  { nr: 7, fi: "Sinnikkyys", sv: "Uthållighet", en: "Perseverance" },
  { nr: 8, fi: "Rehellisyys", sv: "Ärlighet", en: "Honesty" },
  { nr: 9, fi: "Innokkuus", sv: "Entusiasm", en: "Enthusiasm" },
  { nr: 10, fi: "Sisukkuus", sv: "Sisu", en: "Sisu" },

  // HUMANITY (Mänsklighet)
  { nr: 11, fi: "Myötätunto", sv: "Medkänsla", en: "Compassion" },
  { nr: 12, fi: "Rakkaus", sv: "Kärlek", en: "Love" },
  { nr: 13, fi: "Ystävällisyys", sv: "Vänlighet", en: "Kindness" },
  { nr: 14, fi: "Sosiaalinen älykkyys", sv: "Social intelligens", en: "Social Intelligence" },

  // JUSTICE (Rättvisa)
  { nr: 15, fi: "Ryhmätyötaito", sv: "Samarbetsförmåga", en: "Teamwork" },
  { nr: 16, fi: "Reiluus", sv: "Rättvisa", en: "Fairness" },
  { nr: 17, fi: "Johtajuus", sv: "Ledarskap", en: "Leadership" },

  // TEMPERANCE (Måttfullhet)
  { nr: 18, fi: "Anteeksiantavuus", sv: "Ödmjukhet", en: "Forgiveness" },
  { nr: 19, fi: "Vaatimattomuus", sv: "Anspråkslöshet", en: "Modesty" },
  { nr: 20, fi: "Harkitsevuus", sv: "Eftertänksamhet", en: "Carefulness" },
  { nr: 21, fi: "Itsesäätely", sv: "Självreglering", en: "Self-Regulation" },

  // TRANSCENDENCE (Transcendens)
  {
    nr: 22,
    fi: "Kauneuden ja erinomaisuuden arvostaminen",
    sv: "Uppskattning av skönhet",
    en: "Love of Beauty",
  },
  { nr: 23, fi: "Kiitollisuus", sv: "Tacksamhet", en: "Gratitude" },
  { nr: 24, fi: "Toiveikkuus", sv: "Hoppfullhet", en: "Hope" },
  { nr: 25, fi: "Huumorintaju", sv: "Humor", en: "Humor" },
  { nr: 26, fi: "Hengellisyys", sv: "Andlighet", en: "Spirituality" },
];

/**
 * Get strength name in the specified language.
 * NO FALLBACK — if the language/strength doesn't exist, returns the strength number as fallback.
 */
export function getStrengthName(strengthNr: number, language: "fi" | "sv" | "en" = "fi"): string {
  const strength = STRENGTHS.find((s) => s.nr === strengthNr);
  if (!strength) {
    console.warn(`Strength #${strengthNr} not found`);
    return `Strength ${strengthNr}`;
  }

  const name = strength[language];
  if (!name) {
    console.warn(`Missing ${language} translation for strength #${strengthNr}`);
    return `Strength ${strengthNr}`;
  }

  return name;
}

/**
 * Get all strengths with names in the specified language.
 * Returns array of { nr, name } sorted by name in that language.
 */
export function getStrengthsByLanguage(
  language: "fi" | "sv" | "en" = "fi",
): Array<{ nr: number; name: string }> {
  return STRENGTHS.map((s) => ({
    nr: s.nr,
    name: s[language],
  })).sort((a, b) => {
    // Sort by name in the appropriate language
    const collator = new Intl.Collator(
      language === "sv" ? "sv-SE" : language === "en" ? "en-US" : "fi-FI",
    );
    return collator.compare(a.name, b.name);
  });
}

/**
 * Export strength names as lookup tables for each language.
 * Use these for quick lookups: STRENGTH_NAMES_FI[strengthNr]
 */
export const STRENGTH_NAMES_FI = STRENGTHS.reduce(
  (acc, s) => ({ ...acc, [s.nr]: s.fi }),
  {} as Record<number, string>,
);

export const STRENGTH_NAMES_SV = STRENGTHS.reduce(
  (acc, s) => ({ ...acc, [s.nr]: s.sv }),
  {} as Record<number, string>,
);

export const STRENGTH_NAMES_EN = STRENGTHS.reduce(
  (acc, s) => ({ ...acc, [s.nr]: s.en }),
  {} as Record<number, string>,
);

/**
 * Get the appropriate strength names table for a language.
 */
export function getStrengthNamesTable(language: "fi" | "sv" | "en"): Record<number, string> {
  switch (language) {
    case "sv":
      return STRENGTH_NAMES_SV;
    case "en":
      return STRENGTH_NAMES_EN;
    case "fi":
    default:
      return STRENGTH_NAMES_FI;
  }
}

/** Brand hex color per strength number (1–26). Same in every language. */
export const STRENGTH_COLORS: Record<number, string> = {
  1: "#2899B8",
  2: "#FF9D6C",
  3: "#FF4143",
  4: "#8FC7D7",
  5: "#FFC7CC",
  6: "#FFE77A",
  7: "#97D9D6",
  8: "#A2E3D9",
  9: "#FFE9DF",
  10: "#FFE2E1",
  11: "#D1CBDD",
  12: "#FF772A",
  13: "#FF6C6B",
  14: "#ADA2C4",
  15: "#FFC300",
  16: "#D9EFDE",
  17: "#85B0E0",
  18: "#29C7B4",
  19: "#FFEBB2",
  20: "#D2ECD4",
  21: "#FFD446",
  22: "#FFCAAF",
  23: "#A1D7AE",
  24: "#00B8A1",
  25: "#9BA5B3",
  26: "#88CD99",
};

export function getStrengthColor(nr: number): string {
  return STRENGTH_COLORS[nr] ?? "var(--purple)";
}
