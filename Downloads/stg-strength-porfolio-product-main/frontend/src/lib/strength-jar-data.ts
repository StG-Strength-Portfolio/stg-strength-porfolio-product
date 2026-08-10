/**
 * Strength collection data — derived from the canonical trilingual strengths registry.
 * Strength ids are the registry numbers (1–26), never translated display text.
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

export const KARKKIKAUPPA_KEY = "screen_12_karkkikauppa_picks";

/**
 * Current selector fields. Future strength selectors should use either
 * `strength_selection_*`, end in `_strength_ids`, or be added here only when
 * preserving a legacy workbook field key is required.
 */
export function isStrengthSelectionFieldKey(key: string): boolean {
  return (
    key === "screen_6_known_strengths" ||
    /^screen_10_mina_olen_\d+$/.test(key) ||
    /^screen_13_karkki_\d+$/.test(key) ||
    key.endsWith("_karkit") ||
    key.startsWith("strength_selection_") ||
    key.endsWith("_strength_ids")
  );
}

function parseValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function strengthIdFromToken(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 1 && value <= 26 ? value : null;
  }
  if (typeof value !== "string") return null;
  const token = value.trim();
  if (!token) return null;
  if (/^\d+$/.test(token)) {
    const id = Number(token);
    return id >= 1 && id <= 26 ? id : null;
  }
  return matchStrengthId(token);
}

/** Parse one saved strength-selector value into registry ids. */
export function strengthIdsFromSelectionValue(value: unknown): number[] {
  const parsed = parseValue(value);
  const values = Array.isArray(parsed) ? parsed : [parsed];
  const out: number[] = [];

  for (const valuePart of values) {
    if (typeof valuePart === "string") {
      for (const token of valuePart.split(/[,;|/]|\s+ja\s+/i)) {
        const id = strengthIdFromToken(token);
        if (id) out.push(id);
      }
      continue;
    }
    const id = strengthIdFromToken(valuePart);
    if (id) out.push(id);
  }

  return out;
}

/**
 * Strength ids represented by autosaved response rows.
 * Returns one entry per current saved occurrence so callers can count repeated
 * strengths across different activities. Changing/clearing a response therefore
 * changes the collection immediately instead of leaving permanent history.
 */
export function strengthIdsFromResponses(
  rows: Array<{ field_key: string; value: unknown }>,
): number[] {
  const out: number[] = [];

  for (const row of rows) {
    const key = row.field_key;

    if (key === KARKKIKAUPPA_KEY) {
      const parsed = parseValue(row.value);
      if (!Array.isArray(parsed)) continue;
      for (const rawIndex of parsed) {
        const index = Number(rawIndex);
        // Candy-shop values are statement indexes (0–25), not registry ids.
        const id = index + 1;
        if (Number.isInteger(index) && id >= 1 && id <= 26) out.push(id);
      }
      continue;
    }

    if (!isStrengthSelectionFieldKey(key)) continue;
    out.push(...strengthIdsFromSelectionValue(row.value));
  }

  return out;
}
