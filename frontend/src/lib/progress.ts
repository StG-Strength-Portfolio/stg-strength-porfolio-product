// Live student progress hook: tracks which screens have at least one
// completed field, subscribed to realtime so the world map updates as
// autosave fires.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { REQUIREMENTS } from "@/lib/screen-completion";
import { WORLDS, TOTAL_SCREENS, type WorldId } from "@/lib/screens";

export interface ScreenProgress {
  filledKeys: Set<string>;
  currentScreen: number;
  /** screens for which all REQUIREMENTS keys are present (or which have none) */
  completedScreens: Set<number>;
  /** per-world: how many screens of the world are completed */
  byWorld: Record<WorldId, { completed: number; total: number }>;
}

function compute(filled: Set<string>, current: number): ScreenProgress {
  const completedScreens = new Set<number>();
  for (let n = 1; n <= TOTAL_SCREENS; n++) {
    const req = REQUIREMENTS[n];
    if (!req || req.length === 0) continue; // purely informational screens don't count
    if (req.every((k) => filled.has(k))) completedScreens.add(n);
  }
  const byWorld = {} as Record<WorldId, { completed: number; total: number }>;
  for (const w of WORLDS) {
    let total = 0, done = 0;
    for (let n = w.start; n <= w.end; n++) {
      const req = REQUIREMENTS[n];
      if (!req || req.length === 0) continue;
      total++;
      if (completedScreens.has(n)) done++;
    }
    byWorld[w.id] = { completed: done, total };
  }
  return { filledKeys: filled, currentScreen: current, completedScreens, byWorld };
}

export function useStudentProgress(userId: string | null): ScreenProgress | null {
  const [progress, setProgress] = useState<ScreenProgress | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadAll() {
      const { data } = await supabase
        .from("responses" as never)
        .select("field_key,value")
        .eq("user_id", userId as never);
      const filled = new Set<string>();
      for (const row of (data ?? []) as Array<{ field_key: string; value: unknown }>) {
        if (isFilled(row.value)) filled.add(row.field_key);
      }
      const { data: prof } = await supabase
        .from("profiles" as never)
        .select("current_screen")
        .eq("id", userId as never)
        .maybeSingle();
      const cur = (prof as { current_screen?: number } | null)?.current_screen ?? 1;
      if (!cancelled) setProgress(compute(filled, cur));
    }
    loadAll();

    const ch = supabase
      .channel(`responses:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "responses", filter: `user_id=eq.${userId}` },
        () => { loadAll(); },
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };

  }, [userId]);

  return progress;
}

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '""' || trimmed === "null") return false;
    // Saved JSON arrays appear as strings in some paths
    if (trimmed.startsWith("[")) {
      try { const arr = JSON.parse(trimmed); return Array.isArray(arr) && arr.length > 0; } catch { return true; }
    }
    return true;
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
