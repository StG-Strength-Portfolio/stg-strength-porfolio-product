/**
 * @lovable-new 2026-08-08 — SINGLE source of truth for portfolio progression.
 *
 * Rules (strict, no grandfathering):
 *   - a screen is complete when its required fields are filled; purely
 *     informational screens count as complete once the student has explicitly
 *     continued past them (`profiles.current_screen > n`).
 *   - the first incomplete screen is the "next available" screen.
 *   - every screen after it is locked, for screens AND levels.
 *   - `profiles.current_screen` never overrides real completion requirements.
 *
 * Only `super_admin` bypasses these rules (explicit role equality — never a
 * broad "admin-ish" check).
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { WORLDS, type WorldMeta, type WorldId } from "@/lib/screens";
import { ACTIVE_SCREENS, isScreenComplete } from "@/lib/screen-registry";
import { useStudentProgress, type ScreenProgress } from "@/lib/progress";
import type { AppRole } from "@/lib/auth-helpers";

export type LevelState = "completed" | "current" | "locked";

/** Explicitly super_admin only. */
export function canBypassProgression(role: AppRole | null | undefined): boolean {
  return role === "super_admin";
}

export function getNextAvailableScreen(
  filledKeys: Set<string>,
  currentScreen: number,
): number {
  for (const n of ACTIVE_SCREENS) {
    if (!isScreenComplete(n, filledKeys, currentScreen)) return n;
  }
  return ACTIVE_SCREENS[ACTIVE_SCREENS.length - 1] ?? 1;
}

export function canAccessScreen(
  n: number,
  nextAvailable: number,
  role?: AppRole | null,
): boolean {
  if (canBypassProgression(role)) return true;
  return n <= nextAvailable;
}

export function canAccessLevel(
  world: WorldMeta,
  nextAvailable: number,
  role?: AppRole | null,
): boolean {
  if (canBypassProgression(role)) return true;
  return world.start <= nextAvailable;
}

export function levelState(
  world: WorldMeta,
  nextAvailable: number,
  role?: AppRole | null,
): LevelState {
  if (!canAccessLevel(world, nextAvailable, role)) return "locked";
  if (nextAvailable > world.end) return "completed";
  return "current";
}

/** Best screen to open inside a level without breaking the lock. */
export function resumeScreenForLevel(
  world: WorldMeta,
  nextAvailable: number,
  role?: AppRole | null,
): number {
  if (canBypassProgression(role)) return world.start;
  return Math.min(Math.max(world.start, nextAvailable), world.end);
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

export interface ProgressionValue {
  role: AppRole | null;
  bypass: boolean;
  /** null while progress is still loading — callers must not gate on it yet. */
  progress: ScreenProgress | null;
  ready: boolean;
  nextAvailable: number;
  canAccessScreen: (n: number) => boolean;
  canAccessLevel: (w: WorldMeta) => boolean;
  levelState: (w: WorldMeta) => LevelState;
  resumeScreenForLevel: (w: WorldMeta) => number;
  completedScreens: Set<number>;
  byWorld: ScreenProgress["byWorld"] | null;
}

const ProgressionContext = createContext<ProgressionValue | null>(null);

export function ProgressionProvider({
  userId,
  role,
  children,
}: {
  userId: string | null;
  role: AppRole | null;
  children: ReactNode;
}) {
  const progress = useStudentProgress(userId);
  const bypass = canBypassProgression(role);

  const value = useMemo<ProgressionValue>(() => {
    const filled = progress?.filledKeys ?? new Set<string>();
    const current = progress?.currentScreen ?? 1;
    const next = progress ? getNextAvailableScreen(filled, current) : 1;
    return {
      role,
      bypass,
      progress,
      ready: bypass || progress != null,
      nextAvailable: next,
      canAccessScreen: (n) => canAccessScreen(n, next, role),
      canAccessLevel: (w) => canAccessLevel(w, next, role),
      levelState: (w) => levelState(w, next, role),
      resumeScreenForLevel: (w) => resumeScreenForLevel(w, next, role),
      completedScreens: progress?.completedScreens ?? new Set<number>(),
      byWorld: progress?.byWorld ?? null,
    };
  }, [progress, role, bypass]);

  return <ProgressionContext.Provider value={value}>{children}</ProgressionContext.Provider>;
}

const FALLBACK: ProgressionValue = {
  role: null,
  bypass: false,
  progress: null,
  ready: false,
  nextAvailable: 1,
  canAccessScreen: (n) => n <= 1,
  canAccessLevel: (w) => w.start <= 1,
  levelState: (w) => (w.start <= 1 ? "current" : "locked"),
  resumeScreenForLevel: (w) => w.start,
  completedScreens: new Set<number>(),
  byWorld: null,
};

export function useProgression(): ProgressionValue {
  return useContext(ProgressionContext) ?? FALLBACK;
}

/* ------------------------------------------------------------------ */
/* Super admin "view as student" — view mode only, never a role write   */
/* ------------------------------------------------------------------ */

const VIEW_AS_STUDENT_KEY = "sa_view_as_student";

export function isStudentViewMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(VIEW_AS_STUDENT_KEY) === "1";
}

export function setStudentViewMode(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.sessionStorage.setItem(VIEW_AS_STUDENT_KEY, "1");
  else window.sessionStorage.removeItem(VIEW_AS_STUDENT_KEY);
}

/** Progress of an arbitrary student, for the teacher/read-only views. */
export function progressFromResponses(
  responses: Map<string, unknown>,
  currentScreen: number | null,
): { filledKeys: Set<string>; nextAvailable: number } {
  const filled = new Set<string>();
  for (const [k, v] of responses) if (isFilled(v)) filled.add(k);
  const next = getNextAvailableScreen(filled, currentScreen ?? 1);
  return { filledKeys: filled, nextAvailable: next };
}

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    const t = value.trim();
    if (!t || t === '""' || t === "null" || t === "[]") return false;
    if (t.startsWith("[")) {
      try {
        const arr = JSON.parse(t);
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

export type { WorldId };
