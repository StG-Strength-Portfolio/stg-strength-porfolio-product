/**
 * Canonical registry of the screens a student can actually visit and complete.
 *
 * Screens 71–76 are placeholders with no content and are never counted.
 * The Strength Meter (77–106) is part of the adventure, so its screens count
 * towards progress just like the workbook screens.
 *
 * Pure display/progress math — no data fetching, no business-logic changes.
 */
import { WORLDS, TOTAL_SCREENS, type WorldId } from "@/lib/screens";
import { REQUIREMENTS } from "@/lib/screen-completion";
import { METER_STRENGTHS, METER_STRENGTH_FIRST, fieldKeyFor } from "@/lib/meter-data";

/** No screens are excluded — the adventure counts all 106 screens. */
export const EMPTY_SCREENS = new Set<number>();

/** Every screen a student can open, in order (106 screens). */
export const ACTIVE_SCREENS: number[] = Array.from(
  { length: TOTAL_SCREENS },
  (_, i) => i + 1,
).filter((n) => !EMPTY_SCREENS.has(n));

export const TOTAL_ACTIVE_SCREENS = ACTIVE_SCREENS.length;

/**
 * Required field keys per screen: the workbook requirements plus the two
 * meter statements on each Strength Meter screen (78–103).
 */
export const SCREEN_REQUIREMENTS: Record<number, string[]> = (() => {
  const out: Record<number, string[]> = { ...REQUIREMENTS };
  METER_STRENGTHS.forEach((s, i) => {
    out[METER_STRENGTH_FIRST + i] = [fieldKeyFor(s.id, 0), fieldKeyFor(s.id, 1)];
  });
  return out;
})();

/** How many active screens each level contains. */
export const SCREENS_PER_WORLD: Record<WorldId, number> = (() => {
  const out = {} as Record<WorldId, number>;
  for (const w of WORLDS) {
    let n = 0;
    for (let s = w.start; s <= w.end; s++) if (!EMPTY_SCREENS.has(s)) n++;
    out[w.id] = n;
  }
  return out;
})();

/**
 * A screen counts as done when every required field is filled. Purely
 * informational screens (no fields) count once the student has moved past them.
 */
export function isScreenComplete(
  n: number,
  filledKeys: Set<string>,
  currentScreen: number,
): boolean {
  if (EMPTY_SCREENS.has(n)) return false;
  const req = SCREEN_REQUIREMENTS[n];
  if (req && req.length > 0) return req.every((k) => filledKeys.has(k));
  return currentScreen > n;
}

export interface ScreenProgressSummary {
  completedScreens: Set<number>;
  done: number;
  total: number;
  byWorld: Record<WorldId, { completed: number; total: number }>;
}

export function computeScreenProgress(
  filledKeys: Set<string>,
  currentScreen: number,
): ScreenProgressSummary {
  const completedScreens = new Set<number>();
  for (const n of ACTIVE_SCREENS) {
    if (isScreenComplete(n, filledKeys, currentScreen)) completedScreens.add(n);
  }
  const byWorld = {} as Record<WorldId, { completed: number; total: number }>;
  for (const w of WORLDS) {
    let total = 0;
    let completed = 0;
    for (let n = w.start; n <= w.end; n++) {
      if (EMPTY_SCREENS.has(n)) continue;
      total++;
      if (completedScreens.has(n)) completed++;
    }
    byWorld[w.id] = { completed, total };
  }
  return {
    completedScreens,
    done: completedScreens.size,
    total: TOTAL_ACTIVE_SCREENS,
    byWorld,
  };
}
