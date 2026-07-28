// Localized route slugs.
//
// Canonical (Finnish) paths remain the source of truth internally so we
// don't have to duplicate every route file. Localized English/Swedish
// slugs exist as thin redirect routes (see src/routes/adventure.tsx,
// aventyr.tsx, join-community.tsx, ga-med-i-gemenskapen.tsx,
// teacher.tsx, larare.tsx). Any external link — old or new — resolves
// to the working Finnish canonical path.

import type { Language } from "./index";

export type RouteKey =
  | "adventure"
  | "adventure_screen"
  | "join"
  | "teacher"
  | "worldmap";

const CANON: Record<RouteKey, string> = {
  adventure: "/seikkailu",
  adventure_screen: "/seikkailu/{n}",
  join: "/liity-yhteisoon",
  teacher: "/opettaja",
  worldmap: "/seikkailu",
};

// Localized aliases — used only for pretty-URL redirects and copy in the
// UI. Internal navigation always uses the canonical Finnish path.
export const LOCALIZED_PATHS: Record<Language, Record<RouteKey, string>> = {
  fi: { ...CANON },
  en: {
    adventure: "/adventure",
    adventure_screen: "/adventure/{n}",
    join: "/join-community",
    teacher: "/teacher",
    worldmap: "/adventure",
  },
  sv: {
    adventure: "/aventyr",
    adventure_screen: "/aventyr/{n}",
    join: "/ga-med-i-gemenskapen",
    teacher: "/larare",
    worldmap: "/aventyr",
  },
};

export function getCanonicalPath(key: RouteKey, params?: { n?: number | string }): string {
  const p = CANON[key];
  if (!params) return p;
  return p.replace("{n}", String(params.n ?? ""));
}

export function getLocalizedPath(
  key: RouteKey,
  language: Language,
  params?: { n?: number | string },
): string {
  const p = LOCALIZED_PATHS[language]?.[key] ?? CANON[key];
  if (!params) return p;
  return p.replace("{n}", String(params.n ?? ""));
}
