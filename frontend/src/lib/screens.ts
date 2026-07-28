// Vahvuusseikkailu screen registry.
// Mapped from the uploaded workbook PDF "Vahvuusportfolio lukiolaiselle".

export type WorldId = "prologi" | "m1" | "m2" | "m3" | "m4" | "m5" | "m6" | "m7";

export interface WorldMeta {
  id: WorldId;
  title: string;
  subtitle: string;
  emoji: string;
  start: number; // inclusive
  end: number;   // inclusive
  tone: "yellow" | "coral" | "mint" | "teal" | "purple";
}

export const WORLDS: WorldMeta[] = [
  { id: "prologi", title: "Prologi",   subtitle: "Tervetuloa",                                       emoji: "✨", start:  1, end: 10, tone: "yellow" },
  { id: "m1",      title: "Moduuli 1", subtitle: "Omat ydinvahvuudet",                               emoji: "🌟", start: 11, end: 27, tone: "coral"  },
  { id: "m2",      title: "Moduuli 2", subtitle: "Omat vahvuudet lukiossa",                          emoji: "🎓", start: 28, end: 40, tone: "mint"   },
  { id: "m3",      title: "Moduuli 3", subtitle: "Omat vahvuudet kotona",                            emoji: "🏠", start: 41, end: 46, tone: "teal"   },
  { id: "m4",      title: "Moduuli 4", subtitle: "Omat vahvuudet vapaa-ajalla ja harrastuksissa",    emoji: "🎨", start: 47, end: 54, tone: "purple" },
  { id: "m5",      title: "Moduuli 5", subtitle: "Omat vahvuudet ystävyyssuhteissa",                 emoji: "🤝", start: 55, end: 58, tone: "coral"  },
  { id: "m6",      title: "Moduuli 6", subtitle: "Vahvuusportfolion kokoaminen",                     emoji: "🏆", start: 59, end: 76, tone: "yellow" },
  { id: "m7",      title: "Vahvuusmittari", subtitle: "Itsearviointi ja tulokset",                   emoji: "📏", start: 77, end: 106, tone: "mint" },
];

export const TOTAL_SCREENS = 106;

export function worldForScreen(n: number): WorldMeta {
  return WORLDS.find((w) => n >= w.start && n <= w.end) ?? WORLDS[0];
}

export interface ScreenMeta { n: number; world: WorldId; }
export const SCREENS: ScreenMeta[] = Array.from({ length: TOTAL_SCREENS }, (_, i) => {
  const n = i + 1;
  return { n, world: worldForScreen(n).id };
});
