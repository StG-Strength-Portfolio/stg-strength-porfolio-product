// Vahvuusseikkailu screen registry.
// Mapped from the uploaded workbook PDF "Vahvuusportfolio lukiolaiselle".

export type WorldId = "prologi" | "m1" | "m2" | "m3" | "m4" | "m5" | "m6" | "m7";

export interface WorldMeta {
  id: WorldId;
  title: string;
  subtitle: string;
  start: number; // inclusive
  end: number; // inclusive
  tone: "yellow" | "coral" | "mint" | "teal" | "purple";
}

export const WORLDS: WorldMeta[] = [
  { id: "prologi", title: "Prologi", subtitle: "Tervetuloa", start: 1, end: 13, tone: "yellow" },
  { id: "m1", title: "Taso 1", subtitle: "Omat ydinvahvuudet", start: 14, end: 29, tone: "coral" },
  {
    id: "m2",
    title: "Taso 2",
    subtitle: "Omat vahvuudet lukiossa",
    start: 30,
    end: 42,
    tone: "mint",
  },
  {
    id: "m3",
    title: "Taso 3",
    subtitle: "Omat vahvuudet kotona",
    start: 43,
    end: 48,
    tone: "teal",
  },
  {
    id: "m4",
    title: "Taso 4",
    subtitle: "Omat vahvuudet vapaa-ajalla ja harrastuksissa",
    start: 49,
    end: 56,
    tone: "purple",
  },
  {
    id: "m5",
    title: "Taso 5",
    subtitle: "Omat vahvuudet ystävyyssuhteissa",
    start: 57,
    end: 60,
    tone: "coral",
  },
  {
    id: "m6",
    title: "Taso 6",
    subtitle: "Vahvuusportfolion kokoaminen",
    start: 61,
    end: 76,
    tone: "yellow",
  },
  {
    id: "m7",
    title: "Vahvuusmittari",
    subtitle: "Itsearviointi ja tulokset",
    start: 77,
    end: 106,
    tone: "mint",
  },
];

export const TOTAL_SCREENS = 106;

export function worldForScreen(n: number): WorldMeta {
  return WORLDS.find((w) => n >= w.start && n <= w.end) ?? WORLDS[0];
}

export interface ScreenMeta {
  n: number;
  world: WorldId;
}
export const SCREENS: ScreenMeta[] = Array.from({ length: TOTAL_SCREENS }, (_, i) => {
  const n = i + 1;
  return { n, world: worldForScreen(n).id };
});
