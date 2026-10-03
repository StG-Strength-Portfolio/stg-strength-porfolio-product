// Live student progress hook: tracks which screens have at least one
// completed field, subscribed to realtime so the world map updates as
// autosave fires.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type WorldId } from "@/lib/screens";
import { computeScreenProgress } from "@/lib/screen-registry";
import { getSuperAdminPreview } from "@/lib/superadmin-preview";
import { getDemoStudentProgress, onDemoStateChange } from "@/lib/demo-store";

export interface ScreenProgress {
  filledKeys: Set<string>;
  currentScreen: number;
  /** screens counted as complete (all required fields filled, or passed) */
  completedScreens: Set<number>;
  /** per-world: how many screens of the world are completed */
  byWorld: Record<WorldId, { completed: number; total: number }>;
}

function compute(filled: Set<string>, current: number): ScreenProgress {
  const { completedScreens, byWorld } = computeScreenProgress(filled, current);
  return { filledKeys: filled, currentScreen: current, completedScreens, byWorld };
}

export function useStudentProgress(userId: string | null): ScreenProgress | null {
  const [progress, setProgress] = useState<ScreenProgress | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadAll() {
      if (getSuperAdminPreview().mode === "student") {
        const demo = getDemoStudentProgress();
        if (!cancelled) setProgress(compute(demo.filledKeys, demo.currentScreen));
        return;
      }

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

    const onLocalResponseSaved = (event: Event) => {
      const detail = (event as CustomEvent<{ fieldKey?: string; filled?: boolean }>).detail;
      if (!detail?.fieldKey || typeof detail.filled !== "boolean") return;

      setProgress((previous) => {
        if (!previous) return previous;
        const filled = new Set(previous.filledKeys);
        if (detail.filled) filled.add(detail.fieldKey);
        else filled.delete(detail.fieldKey);
        return compute(filled, previous.currentScreen);
      });
    };

    window.addEventListener("student-response-saved", onLocalResponseSaved);

    if (getSuperAdminPreview().mode === "student") {
      const off = onDemoStateChange(() => void loadAll());
      return () => {
        cancelled = true;
        off();
        window.removeEventListener("student-response-saved", onLocalResponseSaved);
      };
    }

    const ch = supabase
      .channel(`responses:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "responses", filter: `user_id=eq.${userId}` },
        () => {
          loadAll();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener("student-response-saved", onLocalResponseSaved);
      supabase.removeChannel(ch);
    };
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
      try {
        const arr = JSON.parse(trimmed);
        return Array.isArray(arr) && arr.length > 0;
      } catch {
        return true;
      }
    }
    return true;
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
