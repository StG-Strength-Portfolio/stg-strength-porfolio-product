import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type CompletionReporter = (fieldKey: string, complete: boolean) => void;

/**
 * @lovable-new 2026-08-08 — per-screen completion gating is ON.
 * A screen with required fields must be filled before "Next" unlocks.
 * Super admins bypass progression through `useProgression()` (role-based),
 * not through this flag.
 */
export const ENABLE_COMPLETION_GATING = true;

type NavGate = {
  currentScreen: number | null;
  required: string[];
  completed: Record<string, boolean>;
  isComplete: boolean;
  setScreen: (n: number | null, required: string[]) => void;
  report: CompletionReporter;
  canNavigateTo: (target: number) => boolean;
};

const fallback: NavGate = {
  currentScreen: null,
  required: [],
  completed: {},
  isComplete: true,
  setScreen: () => {},
  report: () => {},
  canNavigateTo: () => true,
};

const NavGateContext = createContext<NavGate | null>(null);

export function NavGateProvider({ children }: { children: ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<number | null>(null);
  const [required, setRequired] = useState<string[]>([]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const setScreen = useCallback((n: number | null, req: string[]) => {
    setCurrentScreen(n);
    setRequired(req);
    setCompleted({});
  }, []);

  const report = useCallback<CompletionReporter>((key, c) => {
    setCompleted((prev) => (prev[key] === c ? prev : { ...prev, [key]: c }));
  }, []);

  const rawIsComplete = useMemo(
    () => required.length === 0 || required.every((k) => completed[k]),
    [required, completed],
  );
  const isComplete = ENABLE_COMPLETION_GATING ? rawIsComplete : true;

  const canNavigateTo = useCallback(
    (target: number) => {
      if (!ENABLE_COMPLETION_GATING) return true;
      if (currentScreen == null) return true;
      if (target <= currentScreen) return true; // back/revisit always allowed
      return rawIsComplete;
    },
    [currentScreen, rawIsComplete],
  );

  const value = useMemo<NavGate>(
    () => ({
      currentScreen,
      required,
      completed,
      isComplete,
      setScreen,
      report,
      canNavigateTo,
    }),
    [currentScreen, required, completed, isComplete, setScreen, report, canNavigateTo],
  );

  return <NavGateContext.Provider value={value}>{children}</NavGateContext.Provider>;
}

export function useNavGate(): NavGate {
  return useContext(NavGateContext) ?? fallback;
}

export function useReportCompletion(): CompletionReporter {
  return useNavGate().report;
}

// Back-compat: components used to consume a context that returned the reporter
// directly. Keep the export so any leftover imports keep building.
export const CompletionContext = {
  Provider: ({ children }: { children: ReactNode }) => <>{children}</>,
};

/**
 * Screen-level completion requirements.
 * Keys must match the `fieldKey` used by inputs on that screen.
 * Screens with no entry are purely informational and never gated.
 */
export const REQUIREMENTS: Record<number, string[]> = {
  // Module 0 / prologi
  6: ["screen_6_known_strengths"],
  8: [
    "screen_8_s8_love",
    "screen_8_s8_motivate",
    "screen_8_s8_freetime",
    "screen_8_s8_authentic",
    "screen_8_s8_persist",
  ],
  9: ["screen_9_best_sides", "screen_9_strengths", "screen_9_learned", "screen_9_spotted"],
  10: Array.from({ length: 7 }, (_, i) => `screen_10_mina_olen_${i + 1}`),

  // Restored prologi screen
  13: [
    "screen_13_hyva_tanaan",
    "screen_13_kolme_hyvaa",
    "screen_13_vahvuudet_opinnoissa",
    "screen_13_osaan",
    "screen_13_autoin",
    "screen_13_hyvaa_toisissa",
    "screen_13_auttoi_minua",
  ],

  // Module 1
  15: [
    "screen_12_karkkikauppa_picks",
    "screen_15_examples",
    "screen_15_success",
    "screen_15_effect",
  ],
  16: [
    "screen_13_karkki_1",
    "screen_13_karkki_2",
    "screen_13_karkki_3",
    "screen_13_karkki_4",
    "screen_13_karkki_5",
    "screen_13_examples",
    "screen_13_success",
    "screen_13_effect",
  ],
  17: Array.from({ length: 9 }, (_, i) => `screen_14_tiekartta_${i + 1}`),
  19: [
    "screen_16_koulussa",
    "screen_16_vapaa_ajalla",
    "screen_16_kotona",
    "screen_16_kaverisuhteissa",
  ],
  20: ["screen_17_opetukset", "screen_17_kasvu", "screen_17_laheinen"],
  21: ["screen_18_tunne", "screen_18_vaikutus"],
  23: ["screen_20_onnistuminen", "screen_20_ydinvahvuudet", "screen_20_tuki", "screen_20_yhteinen"],
  24: [
    "screen_21_ylpea",
    "screen_21_sinnikas",
    "screen_21_kehut",
    "screen_21_rohkea",
    "screen_21_tavoite",
    "screen_21_tunne",
    "screen_21_vahvuudet",
    "screen_21_uudet",
  ],
  25: ["screen_22_tulevaisuus", "screen_22_oppi"],
  26: Array.from({ length: 10 }, (_, i) => `screen_23_pair_${i + 1}`),
  27: ["screen_24_palaute_1", "screen_24_palaute_2", "screen_24_palaute_3"],
  28: Array.from({ length: 11 }, (_, i) => `screen_25_tassa_${i + 1}`),
  29: Array.from({ length: 14 }, (_, i) => `screen_26_likert_${i + 1}`),

  // Module 2
  32: [
    "screen_29_karkit",
    "screen_29_teit",
    "screen_29_seuraavaksi",
    "screen_29_opit",
    "screen_29_hyodynnat",
  ],
  33: [
    "screen_30_lahjakkuudet",
    "screen_30_taidot",
    "screen_30_kiinnostukset",
    "screen_30_resurssit",
  ],
  34: Array.from({ length: 5 }, (_, i) => `screen_31_tiekartta_${i + 1}`),
  35: Array.from({ length: 6 }, (_, i) => `screen_32_minaopisk_${i + 1}`),
  36: Array.from({ length: 5 }, (_, i) => `screen_33_erityistaito_${i + 1}`),
  37: ["screen_34_oppi", "screen_34_palaute", "screen_34_aiheet", "screen_34_onnistuminen"],
  38: [
    "screen_35_iso_tavoite",
    "screen_35_jaavuori_1",
    "screen_35_jaavuori_2",
    "screen_35_jaavuori_3",
    "screen_35_jaavuori_4",
  ],
  39: ["screen_36_tavoite", "screen_36_vahvuudet", "screen_36_hyodynnan", "screen_36_taidot"],
  40: ["screen_37_arvostan", "screen_37_vahvuuksiani", "screen_37_paikkoja"],
  41: ["screen_38_uutta", "screen_38_tarkeaa", "screen_38_muistetaan", "screen_38_yhteisoon"],
  42: Array.from({ length: 7 }, (_, i) => `screen_39_mina_olen_${i + 1}`),

  // Module 3
  44: ["screen_43_vahvuudet", "screen_43_parasta", "screen_43_kiitollinen", "screen_43_yhdessa"],
  45: ["screen_43_vahvuudet", "screen_43_parasta", "screen_43_kiitollinen", "screen_43_yhdessa"],
  46: ["screen_44_perheenjasenena"],
  47: Array.from({ length: 8 }, (_, i) => `screen_45_vanhemmat_${i + 1}`),

  // Module 4
  50: [
    "screen_48_karkit",
    "screen_48_teit",
    "screen_48_seuraavaksi",
    "screen_48_opit",
    "screen_48_hyodynnat",
  ],
  51: ["screen_49_tykkaat", "screen_49_harrastukset", "screen_49_vahvuudet", "screen_49_enemman"],
  53: Array.from({ length: 5 }, (_, i) => `screen_51_love_${i + 1}`),
  54: ["screen_52_konkreettisesti", "screen_52_vahvuudet"],
  56: ["screen_54_valitsin", "screen_54_kehittaneet", "screen_54_uudet"],

  // Module 5
  58: [
    "screen_56_karkit",
    "screen_56_teit",
    "screen_56_seuraavaksi",
    "screen_56_opit",
    "screen_56_hyodynnat",
  ],
  59: ["screen_57_ystavien", "screen_57_parasta"],
  60: ["screen_58_uutta", "screen_58_tarkeaa", "screen_58_muistavat", "screen_58_parasta"],

  // Module 6
  62: [
    "screen_60_koulusta",
    "screen_60_perheelta",
    "screen_60_vapaa_ajalta",
    "screen_60_ystavilta",
  ],
  63: [
    "screen_61_samaa",
    "screen_61_eroavat",
    "screen_61_huomataan",
    "screen_61_yllatti",
    "screen_61_muistaa",
  ],
  64: Array.from({ length: 5 }, (_, i) => `screen_62_visioni_${i + 1}`),
  65: Array.from({ length: 7 }, (_, i) => `screen_63_kerro_${i + 1}`),
  66: ["screen_64_havainnot", "screen_64_muistaa", "screen_64_tarkeaa"],
  67: ["screen_65_notes"],
  68: ["screen_66_notes"],
  71: [
    "screen_69_kertovat",
    "screen_69_kehittamisesta",
    "screen_69_tilanteissa",
    "screen_69_toimia",
  ],
};

export const COMPLETION_HINT = "Täytä ensin tämän sivun tehtävä, niin pääset jatkamaan.";
