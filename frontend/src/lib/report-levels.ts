/**
 * Per-level completion breakdown for report dashboards.
 * Pure display math over the same ReportEvent stream used by the graphs.
 */
import { WORLDS, type WorldId } from "@/lib/screens";
import { REQUIREMENTS } from "@/lib/screen-completion";
import type { RangeDays, ReportEvent } from "@/lib/report-series";

export interface LevelCompletion {
  id: WorldId;
  title: string;
  pct: number;
}

/** field_key -> level id, derived from the canonical requirements registry. */
const KEY_TO_LEVEL = new Map<string, WorldId>();
const KEYS_PER_LEVEL = new Map<WorldId, number>();
for (const w of WORLDS) {
  let n = 0;
  for (let s = w.start; s <= w.end; s++) {
    for (const key of REQUIREMENTS[s] ?? []) {
      KEY_TO_LEVEL.set(key, w.id);
      n++;
    }
  }
  KEYS_PER_LEVEL.set(w.id, n);
}

/**
 * Share of required fields completed per level at the end of the range,
 * averaged over all students.
 */
export function buildLevelCompletion(
  events: ReportEvent[],
  opts: { days?: RangeDays; studentCount: number },
): LevelCompletion[] {
  const seen = new Map<WorldId, Set<string>>();
  for (const w of WORLDS) seen.set(w.id, new Set());

  for (const e of events) {
    if (!e.fieldKey) continue;
    const level = KEY_TO_LEVEL.get(e.fieldKey);
    if (!level) continue;
    seen.get(level)!.add(`${e.userId}|${e.fieldKey}`);
  }

  const students = Math.max(1, opts.studentCount);
  return WORLDS.map((w) => {
    const denom = Math.max(1, (KEYS_PER_LEVEL.get(w.id) ?? 0) * students);
    return {
      id: w.id,
      title: w.title,
      pct: Math.min(100, Math.round(((seen.get(w.id)?.size ?? 0) / denom) * 100)),
    };
  });
}
