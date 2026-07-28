import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { REQUIREMENTS } from "@/lib/screen-completion";
import { TOTAL_SCREENS, worldForScreen, WORLDS } from "@/lib/screens";

export interface RosterStudent {
  studentId: string;
  displayName: string | null;
  email: string | null;
  currentScreen: number;
  screensFilled: number;     // count of screens whose REQUIREMENTS are all met
  totalRequiredScreens: number; // denominator
  worldsCompleted: number;   // worlds where every required screen is done
  lastActive: Date | null;
}

const REQUIRED_SCREEN_NUMBERS: number[] = (() => {
  const arr: number[] = [];
  for (let n = 1; n <= TOTAL_SCREENS; n++) {
    const r = REQUIREMENTS[n];
    if (r && r.length > 0) arr.push(n);
  }
  return arr;
})();

const TOTAL_REQUIRED = REQUIRED_SCREEN_NUMBERS.length;

function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t || t === '""' || t === "null") return false;
    return true;
  }
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function computeStudentStats(
  filledKeys: Set<string>,
): { screensFilled: number; worldsCompleted: number } {
  let screensFilled = 0;
  const screenDone = new Set<number>();
  for (const n of REQUIRED_SCREEN_NUMBERS) {
    const req = REQUIREMENTS[n]!;
    if (req.every((k) => filledKeys.has(k))) {
      screensFilled++;
      screenDone.add(n);
    }
  }
  let worldsCompleted = 0;
  for (const w of WORLDS) {
    let total = 0, done = 0;
    for (let n = w.start; n <= w.end; n++) {
      const req = REQUIREMENTS[n];
      if (!req || req.length === 0) continue;
      total++;
      if (screenDone.has(n)) done++;
    }
    if (total > 0 && done === total) worldsCompleted++;
  }
  return { screensFilled, worldsCompleted };
}

export interface ClassStats {
  totalStudents: number;
  avgCurrentScreen: number; // 0 if no students
  avgScreensFilled: number;
  lastActivity: Date | null;
  worldLabel: string;       // e.g. "Maailma 2.3"
}

export function summariseClass(students: RosterStudent[]): ClassStats {
  if (students.length === 0) {
    return { totalStudents: 0, avgCurrentScreen: 0, avgScreensFilled: 0, lastActivity: null, worldLabel: "–" };
  }
  const avgScreen = students.reduce((a, s) => a + s.currentScreen, 0) / students.length;
  const avgFilled = students.reduce((a, s) => a + s.screensFilled, 0) / students.length;
  const last = students.reduce<Date | null>((a, s) => {
    if (!s.lastActive) return a;
    if (!a || s.lastActive > a) return s.lastActive;
    return a;
  }, null);
  // Average world index → "Maailma X.Y" (1-based among WORLDS, treating prologi as 0).
  // We compute a fractional world position from average current_screen.
  const w = worldForScreen(Math.round(avgScreen));
  const idx = WORLDS.findIndex((x) => x.id === w.id);
  const within = (avgScreen - w.start) / Math.max(1, w.end - w.start);
  const decimal = Math.max(0, Math.min(1, within));
  const label = `Maailma ${(idx + decimal).toFixed(1)}`;
  return {
    totalStudents: students.length,
    avgCurrentScreen: avgScreen,
    avgScreensFilled: avgFilled,
    lastActivity: last,
    worldLabel: label,
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

      const [{ data: profs, error: profsError }, { data: resps, error: respsError }] = await Promise.all([
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

      const profMap = new Map<string, { display_name: string | null; current_screen: number | null }>();
      for (const p of (profs ?? []) as Array<{ id: string; display_name: string | null; current_screen: number | null }>) {
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
        const stats = computeStudentStats(filled);
        const prof = profMap.get(id);
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

  useEffect(() => { setStudents(null); load(); }, [load]);

  return { students, loading, refresh: load };
}

export function formatLastActive(d: Date | null): string {
  if (!d) return "Ei aktiivisuutta";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "juuri nyt";
  if (mins < 60) return `${mins} min sitten`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h sitten`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Eilen";
  if (days < 7) return `${days} päivää sitten`;
  return d.toLocaleDateString("fi-FI");
}

export function rosterToCsv(students: RosterStudent[]): string {
  const header = ["Nimi", "Maailmat valmis", "Näytöt täytetty", "Nykyinen näyttö", "Viimeksi aktiivinen"];
  const rows = students.map((s) => [
    s.displayName ?? s.studentId.slice(0, 8),
    String(s.worldsCompleted),
    `${s.screensFilled}/${s.totalRequiredScreens}`,
    String(s.currentScreen),
    s.lastActive ? s.lastActive.toISOString() : "",
  ]);
  const esc = (v: string) => /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
