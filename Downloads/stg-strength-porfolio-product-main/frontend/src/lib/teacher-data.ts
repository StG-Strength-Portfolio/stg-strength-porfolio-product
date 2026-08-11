import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { REQUIREMENTS } from "@/lib/screen-completion";
import { TOTAL_SCREENS, worldForScreen, WORLDS } from "@/lib/screens";
import {
  ACTIVE_SCREENS,
  EMPTY_SCREENS,
  TOTAL_ACTIVE_SCREENS,
  computeScreenProgress,
  isScreenComplete,
} from "@/lib/screen-registry";

export interface RosterStudent {
  studentId: string;
  displayName: string | null;
  email: string | null;
  currentScreen: number;
  screensFilled: number; // count of active screens completed
  totalRequiredScreens: number; // denominator (all active screens)
  worldsCompleted: number; // worlds where every active screen is done
  lastActive: Date | null;
}

/** Every screen a student can visit and complete (S1–S70, S77–S106). */
export const REQUIRED_SCREEN_NUMBERS: number[] = ACTIVE_SCREENS;

export const TOTAL_REQUIRED = TOTAL_ACTIVE_SCREENS;

export function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t || t === '""' || t === "null") return false;
    return true;
  }
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function computeStudentStats(
  filledKeys: Set<string>,
  currentScreen = 1,
): { screensFilled: number; worldsCompleted: number } {
  const progress = computeScreenProgress(filledKeys, currentScreen);
  let worldsCompleted = 0;
  for (const w of WORLDS) {
    const stats = progress.byWorld[w.id];
    if (stats && stats.total > 0 && stats.completed === stats.total) worldsCompleted++;
  }
  return { screensFilled: progress.done, worldsCompleted };
}

export interface ClassStats {
  totalStudents: number;
  avgCurrentScreen: number; // 0 if no students
  avgScreensFilled: number;
  lastActivity: Date | null;
  worldLabel: string; // e.g. "Taso 2.3" (Finnish source, translate at render)
  worldNumber: string; // e.g. "2.3" — for tr("Taso {n}", { n })
}

export function summariseClass(students: RosterStudent[]): ClassStats {
  if (students.length === 0) {
    return {
      totalStudents: 0,
      avgCurrentScreen: 0,
      avgScreensFilled: 0,
      lastActivity: null,
      worldLabel: "–",
      worldNumber: "–",
    };
  }
  const avgScreen = students.reduce((a, s) => a + s.currentScreen, 0) / students.length;
  const avgFilled = students.reduce((a, s) => a + s.screensFilled, 0) / students.length;
  const last = students.reduce<Date | null>((a, s) => {
    if (!s.lastActive) return a;
    if (!a || s.lastActive > a) return s.lastActive;
    return a;
  }, null);
  // Average level index → "Taso X.Y" (1-based among WORLDS, treating prologi as 0).
  // We compute a fractional level position from average current_screen.
  const w = worldForScreen(Math.round(avgScreen));
  const idx = WORLDS.findIndex((x) => x.id === w.id);
  const within = (avgScreen - w.start) / Math.max(1, w.end - w.start);
  const decimal = Math.max(0, Math.min(1, within));
  const number = (idx + decimal).toFixed(1);
  return {
    totalStudents: students.length,
    avgCurrentScreen: avgScreen,
    avgScreensFilled: avgFilled,
    lastActivity: last,
    worldLabel: `Taso ${number}`,
    worldNumber: number,
  };
}

export function useClassRoster(classId: string | null): {
  students: RosterStudent[] | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [students, setStudents] = useState<RosterStudent[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const { data: members, error: membersError } = await supabase
        .from("class_members" as never)
        .select("student_id, joined_at")
        .eq("class_id", classId as never);

      if (membersError) {
        console.error("Roster: class_members query failed", membersError);
        setStudents([]);
        return;
      }

      const rows = (members ?? []) as Array<{ student_id: string; joined_at: string }>;

      if (rows.length === 0) {
        setStudents([]);
        return;
      }

      const ids = rows.map((m) => m.student_id);

      const [{ data: profs, error: profsError }, { data: resps, error: respsError }] =
        await Promise.all([
          supabase
            .from("profiles" as never)
            .select("id, display_name, current_screen")
            .in("id", ids as never),
          supabase
            .from("responses" as never)
            .select("user_id,field_key,value,updated_at")
            .in("user_id", ids as never),
        ]);

      if (profsError) console.error("Roster: profiles query failed", profsError);
      if (respsError) console.error("Roster: responses query failed", respsError);

      const profMap = new Map<
        string,
        { display_name: string | null; current_screen: number | null }
      >();
      for (const p of (profs ?? []) as Array<{
        id: string;
        display_name: string | null;
        current_screen: number | null;
      }>) {
        profMap.set(p.id, { display_name: p.display_name, current_screen: p.current_screen });
      }

      const filledPerStudent = new Map<string, Set<string>>();
      const lastActivePerStudent = new Map<string, Date>();
      for (const r of (resps ?? []) as Array<{
        user_id: string;
        field_key: string;
        value: unknown;
        updated_at: string;
      }>) {
        if (isFilled(r.value)) {
          let s = filledPerStudent.get(r.user_id);
          if (!s) {
            s = new Set();
            filledPerStudent.set(r.user_id, s);
          }
          s.add(r.field_key);
        }
        if (r.updated_at) {
          const d = new Date(r.updated_at);
          const cur = lastActivePerStudent.get(r.user_id);
          if (!cur || d > cur) lastActivePerStudent.set(r.user_id, d);
        }
      }

      const out: RosterStudent[] = rows.map((m) => {
        const id = m.student_id;
        const filled = filledPerStudent.get(id) ?? new Set<string>();
        const prof = profMap.get(id);
        const stats = computeStudentStats(filled, prof?.current_screen ?? 1);

        return {
          studentId: id,
          displayName: prof?.display_name ?? null,
          email: null,
          currentScreen: prof?.current_screen ?? 1,
          screensFilled: stats.screensFilled,
          totalRequiredScreens: TOTAL_REQUIRED,
          worldsCompleted: stats.worldsCompleted,
          lastActive: lastActivePerStudent.get(id) ?? null,
        };
      });
      setStudents(out);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    setStudents(null);
    load();
  }, [load]);

  return { students, loading, refresh: load };
}

type Translate = (s: string, vars?: Record<string, string | number>) => string;

/**
 * Relative "last active" label. Pass `tr` (from useTr) to localise it;
 * without it the Finnish source strings are returned.
 */
export function formatLastActive(d: Date | null, tr?: Translate): string {
  const t: Translate =
    tr ?? ((s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : s));
  if (!d) return t("Ei aktiivisuutta");
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return t("juuri nyt");
  if (mins < 60) return t("{n} min sitten", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("{n} t sitten", { n: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t("Eilen");
  if (days < 7) return t("{n} päivää sitten", { n: days });
  return d.toLocaleDateString();
}

export type StudentStatus = "not_started" | "in_progress" | "completed" | "at_risk";

/** Finnish source labels — pass through tr() at the call site. */
export const STATUS_LABEL: Record<StudentStatus, string> = {
  not_started: "Ei aloitettu",
  in_progress: "Kesken",
  completed: "Valmis",
  at_risk: "Vaarassa jäädä jälkeen",
};

export const STATUS_TONE: Record<StudentStatus, string> = {
  not_started: "bg-black/10 text-foreground/70",
  in_progress: "bg-yellow-500/25 text-yellow-900",
  completed: "bg-green-600/15 text-green-800",
  at_risk: "bg-red-600/15 text-red-800",
};

/**
 * Status rules:
 *  - completed  : 100 % of required screens filled
 *  - at_risk    : last active more than 14 days ago and not complete
 *  - not_started: nothing filled and still on screen 1 (or never opened)
 *  - in_progress: anything in between
 */
export function studentStatus(input: {
  pct: number;
  currentScreen?: number | null;
  lastActive?: Date | string | null;
}): StudentStatus {
  const pct = Math.max(0, Math.min(100, Math.round(input.pct)));
  if (pct >= 100) return "completed";
  const last = input.lastActive
    ? input.lastActive instanceof Date
      ? input.lastActive
      : new Date(input.lastActive)
    : null;
  const started = pct > 0 || (input.currentScreen ?? 1) > 1;
  if (!started && !last) return "not_started";
  if (last && Date.now() - last.getTime() > 14 * 24 * 3600 * 1000) return "at_risk";
  if (!started) return "not_started";
  return "in_progress";
}

export function rosterToCsv(students: RosterStudent[]): string {
  const header = [
    "Nimi",
    "Maailmat valmis",
    "Näytöt täytetty",
    "Nykyinen näyttö",
    "Viimeksi aktiivinen",
  ];
  const rows = students.map((s) => [
    s.displayName ?? s.studentId.slice(0, 8),
    String(s.worldsCompleted),
    `${s.screensFilled}/${s.totalRequiredScreens}`,
    String(s.currentScreen),
    s.lastActive ? s.lastActive.toISOString() : "",
  ]);
  const esc = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Per-world completion for one student's filled field keys. */
export function worldCompletion(
  filledKeys: Set<string>,
  currentScreen = 1,
): Array<{ id: string; done: number; total: number }> {
  const progress = computeScreenProgress(filledKeys, currentScreen);
  return WORLDS.map((w) => ({
    id: w.id,
    done: progress.byWorld[w.id]?.completed ?? 0,
    total: progress.byWorld[w.id]?.total ?? 0,
  }));
}
