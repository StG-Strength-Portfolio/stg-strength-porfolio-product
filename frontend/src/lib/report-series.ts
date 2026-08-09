/**
 * Time-series helpers for principal / teacher report graphs.
 * Pure display math — no data fetching, no business logic changes.
 */

export interface ReportEvent {
  userId: string;
  classId: string | null;
  /** ISO timestamp of the activity. */
  at: string;
  /** Response field key (used for completion %); omit for gifted strengths. */
  fieldKey?: string;
  /** How many strengths this event contributed. */
  strengths: number;
  /** Registry ids (1–26) contributed by this event, for per-strength graphs. */
  strengthIds?: number[];
}

export interface StrengthSeries {
  /** Chart rows: { label, date, "s12": 4, ... } keyed by `s<id>`. */
  rows: Array<Record<string, string | number>>;
  /** Visible strengths, most collected first. */
  legend: Array<{ id: number; key: string; total: number }>;
}

export type RangeDays = 7 | 30 | 90 | 365;

export interface SeriesPoint {
  date: string;
  label: string;
  strengths: number;
  completion: number;
  active: number;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function bucketOf(d: Date, weekly: boolean): string {
  if (!weekly) return dayKey(d);
  const x = new Date(d);
  const dow = (x.getUTCDay() + 6) % 7; // Monday = 0
  x.setUTCDate(x.getUTCDate() - dow);
  return dayKey(x);
}

/**
 * Build cumulative strength growth, average completion % and active-student
 * counts over the selected range.
 */
export function buildReportSeries(
  events: ReportEvent[],
  opts: { days: RangeDays; studentCount: number; totalRequired: number; classId?: string | null },
): SeriesPoint[] {
  const weekly = opts.days > 30;
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - (opts.days - 1));
  start.setUTCHours(0, 0, 0, 0);

  const buckets: string[] = [];
  const cursor = new Date(start);
  while (cursor <= now) {
    const k = bucketOf(cursor, weekly);
    if (buckets[buckets.length - 1] !== k) buckets.push(k);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (buckets.length === 0) buckets.push(bucketOf(now, weekly));

  const scoped = opts.classId ? events.filter((e) => e.classId === opts.classId) : events;

  // Baseline: everything that happened before the range still counts toward
  // the cumulative totals so the curve starts at the real level.
  let cumStrengths = 0;
  const seenKeys = new Set<string>();
  const perBucket = new Map<string, { strengths: number; keys: string[]; active: Set<string> }>();
  for (const b of buckets) perBucket.set(b, { strengths: 0, keys: [], active: new Set() });

  for (const e of scoped) {
    const t = new Date(e.at);
    if (Number.isNaN(t.getTime())) continue;
    if (t < start) {
      cumStrengths += e.strengths;
      if (e.fieldKey) seenKeys.add(`${e.userId}|${e.fieldKey}`);
      continue;
    }
    const b = bucketOf(t, weekly);
    const slot = perBucket.get(b);
    if (!slot) continue;
    slot.strengths += e.strengths;
    if (e.fieldKey) slot.keys.push(`${e.userId}|${e.fieldKey}`);
    slot.active.add(e.userId);
  }

  const denom = Math.max(1, opts.studentCount * opts.totalRequired);

  return buckets.map((b) => {
    const slot = perBucket.get(b)!;
    cumStrengths += slot.strengths;
    for (const k of slot.keys) seenKeys.add(k);
    const d = new Date(`${b}T00:00:00Z`);
    return {
      date: b,
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      strengths: cumStrengths,
      completion: Math.round((seenKeys.size / denom) * 1000) / 10,
      active: slot.active.size,
    };
  });
}

/**
 * Cumulative per-strength growth over the range. Strengths with no
 * collections are omitted; `limit` keeps the chart readable.
 */
export function buildStrengthSeries(
  events: ReportEvent[],
  opts: { days: RangeDays; classId?: string | null; limit?: number },
): StrengthSeries {
  const weekly = opts.days > 30;
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - (opts.days - 1));
  start.setUTCHours(0, 0, 0, 0);

  const buckets: string[] = [];
  const cursor = new Date(start);
  while (cursor <= now) {
    const k = bucketOf(cursor, weekly);
    if (buckets[buckets.length - 1] !== k) buckets.push(k);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (buckets.length === 0) buckets.push(bucketOf(now, weekly));

  const scoped = opts.classId ? events.filter((e) => e.classId === opts.classId) : events;

  const baseline = new Map<number, number>();
  const perBucket = new Map<string, Map<number, number>>();
  for (const b of buckets) perBucket.set(b, new Map());
  const totals = new Map<number, number>();

  for (const e of scoped) {
    const ids = e.strengthIds ?? [];
    if (ids.length === 0) continue;
    const t = new Date(e.at);
    if (Number.isNaN(t.getTime())) continue;
    const target = t < start ? baseline : perBucket.get(bucketOf(t, weekly));
    if (!target) continue;
    for (const id of ids) {
      if (!(id >= 1 && id <= 26)) continue;
      target.set(id, (target.get(id) ?? 0) + 1);
      totals.set(id, (totals.get(id) ?? 0) + 1);
    }
  }

  const ranked = [...totals.entries()]
    .map(([id, total]) => ({ id, key: `s${id}`, total }))
    .sort((a, b) => b.total - a.total || a.id - b.id);
  const legend = opts.limit ? ranked.slice(0, opts.limit) : ranked;
  const visible = new Set(legend.map((l) => l.id));

  const running = new Map<number, number>(baseline);
  const rows = buckets.map((b) => {
    for (const [id, n] of perBucket.get(b)!) running.set(id, (running.get(id) ?? 0) + n);
    const d = new Date(`${b}T00:00:00Z`);
    const row: Record<string, string | number> = {
      date: b,
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    };
    for (const id of visible) row[`s${id}`] = running.get(id) ?? 0;
    return row;
  });

  return { rows, legend };
}
