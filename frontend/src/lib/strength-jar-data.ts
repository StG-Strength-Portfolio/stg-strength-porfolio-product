/**
 * Strength Jar data — derived from the canonical trilingual strengths registry.
 * Display-only helper: ids are the registry numbers (1–26), never free text.
 */
import { STRENGTHS, getStrengthColor, type Strength } from "@/lib/strengths-i18n";

export interface JarStrength {
  id: number;
  /** Finnish source name — pass through tr()/getStrengthName for display. */
  name: string;
  fi: string;
  sv: string;
  en: string;
  /** Brand accent color for this strength. */
  color: string;
}

export const ALL_STRENGTHS: JarStrength[] = STRENGTHS.map((s: Strength) => ({
  id: s.nr,
  name: s.fi,
  fi: s.fi,
  sv: s.sv,
  en: s.en,
  color: getStrengthColor(s.nr),
}));

/** Normalize a stored/free-text strength name for matching (case/diacritic tolerant). */
export function normalizeStrengthName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const LOOKUP = new Map<string, number>();
for (const s of ALL_STRENGTHS) {
  for (const n of [s.fi, s.sv, s.en]) LOOKUP.set(normalizeStrengthName(n), s.id);
}
// Spelling variants used elsewhere in the workbook screens.
const VARIANTS: Record<string, string> = {
  Innostus: "Innokkuus",
  Henkisyys: "Hengellisyys",
  Ryhmätyötaidot: "Ryhmätyötaito",
  Harkitsevaisuus: "Harkitsevuus",
  "Kauneuden ja erinomaisuuden arvostus": "Kauneuden ja erinomaisuuden arvostaminen",
};
for (const [variant, canonical] of Object.entries(VARIANTS)) {
  const id = LOOKUP.get(normalizeStrengthName(canonical));
  if (id) LOOKUP.set(normalizeStrengthName(variant), id);
}

/** Match an arbitrary stored name to a registry id, or null when unknown. */
export function matchStrengthId(raw: string): number | null {
  return LOOKUP.get(normalizeStrengthName(raw)) ?? null;
}

export function getJarStrength(id: number): JarStrength | undefined {
  return ALL_STRENGTHS.find((s) => s.id === id);
}

const KARKKIKAUPPA_KEY = "screen_12_karkkikauppa_picks";
const CHIPS_KEY = "screen_6_known_strengths";

function parseValue<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

/**
 * Strength ids collected in a set of autosaved response rows.
 * Mirrors the student jar logic (candy-shop picks + named strengths).
 * Returns one entry per occurrence so callers can count.
 */
export function strengthIdsFromResponses(
  rows: Array<{ field_key: string; value: unknown }>,
): number[] {
  const out: number[] = [];
  for (const row of rows) {
    if (typeof row.value !== "string") continue;
    const key = row.field_key;
    if (key === KARKKIKAUPPA_KEY) {
      const picks = parseValue<number[]>(row.value);
      if (Array.isArray(picks)) {
        for (const i of picks) {
          const id = Number(i) + 1;
          if (id >= 1 && id <= 26) out.push(id);
        }
      }
      continue;
    }
    const isNameField =
      key === CHIPS_KEY || key.endsWith("_karkit") || /^screen_13_karkki_\d+$/.test(key);
    if (!isNameField) continue;
    const v = parseValue<unknown>(row.value);
    const names = Array.isArray(v) ? v : [v];
    for (const n of names) {
      if (typeof n !== "string" || !n.trim()) continue;
      for (const part of n.split(/[,;/]| ja /i)) {
        const id = matchStrengthId(part);
        if (id) out.push(id);
      }
    }
  }
  return out;
}
