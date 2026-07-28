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
  { nr: 3, fi: "Arviointikyky", sv: "Omdöme", en: "Judgement / Critical Thinking" },
  { nr: 4, fi: "Oppimisen ilo", sv: "Lärandets glädje", en: "Love of Learning" },
  { nr: 5, fi: "Näkökulmanottokyky", sv: "Perspektivförmåga", en: "Perspective" },

  // COURAGE (Mod)
  { nr: 6, fi: "Rohkeus", sv: "Mod", en: "Bravery" },
  { nr: 7, fi: "Sinnikkyys", sv: "Uthållighet", en: "Perseverance" },
  { nr: 8, fi: "Rehellisyys", sv: "Ärlighet", en: "Honesty" },
  { nr: 9, fi: "Innokkuus", sv: "Entusiasm", en: "Zest" },
  { nr: 10, fi: "Sisukkuus", sv: "Sisu / Ihärdighet", en: "Sisu / Bravery (inner)" },

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
  { nr: 18, fi: "Anteeksiantavuus", sv: "Förlåtelse", en: "Forgiveness" },
  { nr: 19, fi: "Vaatimattomuus", sv: "Anspråkslöshet", en: "Humility" },
  { nr: 20, fi: "Harkitsevuus", sv: "Eftertänksamhet", en: "Prudence" },
  { nr: 21, fi: "Itsesäätely", sv: "Självreglering", en: "Self-Regulation" },

  // TRANSCENDENCE (Transcendens)
  { nr: 22, fi: "Kauneuden ja erinomaisuuden arvostaminen", sv: "Uppskatta skönhet", en: "Appreciation of Beauty & Excellence" },
  { nr: 23, fi: "Kiitollisuus", sv: "Tacksamhet", en: "Gratitude" },
  { nr: 24, fi: "Toiveikkuus", sv: "Hopp", en: "Hope" },
  { nr: 25, fi: "Huumorintaju", sv: "Humor", en: "Humour" },
  { nr: 26, fi: "Hengellisyys", sv: "Andlighet", en: "Spirituality" },
];

/**
 * Get strength name in the specified language.
 * NO FALLBACK — if the language/strength doesn't exist, returns the strength number as fallback.
 */
export function getStrengthName(
  strengthNr: number,
  language: "fi" | "sv" | "en" = "fi"
): string {
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
  language: "fi" | "sv" | "en" = "fi"
): Array<{ nr: number; name: string }> {
  return STRENGTHS.map((s) => ({
    nr: s.nr,
    name: s[language],
  })).sort((a, b) => {
    // Sort by name in the appropriate language
    const collator = new Intl.Collator(language === "sv" ? "sv-SE" : language === "en" ? "en-US" : "fi-FI");
    return collator.compare(a.name, b.name);
  });
}

/**
 * Export strength names as lookup tables for each language.
 * Use these for quick lookups: STRENGTH_NAMES_FI[strengthNr]
 */
export const STRENGTH_NAMES_FI = STRENGTHS.reduce(
  (acc, s) => ({ ...acc, [s.nr]: s.fi }),
  {} as Record<number, string>
);

export const STRENGTH_NAMES_SV = STRENGTHS.reduce(
  (acc, s) => ({ ...acc, [s.nr]: s.sv }),
  {} as Record<number, string>
);

export const STRENGTH_NAMES_EN = STRENGTHS.reduce(
  (acc, s) => ({ ...acc, [s.nr]: s.en }),
  {} as Record<number, string>
);

/**
 * Get the appropriate strength names table for a language.
 */
export function getStrengthNamesTable(
  language: "fi" | "sv" | "en"
): Record<number, string> {
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
