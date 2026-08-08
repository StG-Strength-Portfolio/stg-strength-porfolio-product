/**
 * @lovable-new 2026-08-05 — Renderer-scoped portfolio data mode.
 *
 * The previous implementation used a module-global `portfolioPreviewMode`
 * boolean that was mutated during render. That could leak between renderers,
 * routes and lifecycles. It is replaced by a React context provider so the
 * mode is scoped to the subtree that renders the portfolio screens:
 *
 *   mode="student"         → reads + writes enabled (unchanged behaviour)
 *   mode="teacher-preview" → reads + writes disabled, every control empty
 *
 * Consumers use `useResponseReader()` instead of importing `loadResponse`
 * directly, so no screen control can accidentally bypass the mode.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SaveState = "idle" | "saving" | "saved" | "error";

export type PortfolioMode = "student" | "teacher-preview";

export interface PortfolioDataMode {
  mode: PortfolioMode;
  readEnabled: boolean;
  writeEnabled: boolean;
}

const STUDENT_MODE: PortfolioDataMode = {
  mode: "student",
  readEnabled: true,
  writeEnabled: true,
};

const PortfolioModeContext = createContext<PortfolioDataMode>(STUDENT_MODE);

export function PortfolioDataProvider({
  mode,
  children,
}: {
  mode: PortfolioMode;
  children: ReactNode;
}) {
  const value = useMemo<PortfolioDataMode>(
    () =>
      mode === "teacher-preview"
        ? { mode, readEnabled: false, writeEnabled: false }
        : STUDENT_MODE,
    [mode],
  );
  return <PortfolioModeContext.Provider value={value}>{children}</PortfolioModeContext.Provider>;
}

export function usePortfolioMode(): PortfolioDataMode {
  return useContext(PortfolioModeContext);
}

/** Raw read — only for callers that already know they are in student mode. */
export async function loadResponse<T = unknown>(fieldKey: string): Promise<T | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase
    .from("responses" as never)
    .select("value")
    .eq("user_id", u.user.id)
    .eq("field_key", fieldKey)
    .maybeSingle();
  const row = data as { value: string } | null;
  if (!row) return null;
  try { return JSON.parse(row.value) as T; } catch { return row.value as unknown as T; }
}

export type ResponseReader = <T = unknown>(fieldKey: string) => Promise<T | null>;

/**
 * @lovable-new 2026-08-05 — Mode-aware read.
 * In teacher preview this resolves to null without touching the network, so
 * every control renders empty and no student answer is ever fetched.
 */
export function useResponseReader(): ResponseReader {
  const { readEnabled } = usePortfolioMode();
  return useMemo<ResponseReader>(
    () => (readEnabled ? loadResponse : async () => null),
    [readEnabled],
  );
}

/**
 * Autosaves a single field_key to public.responses for the current user.
 * Debounced; serializes value as JSON text. RLS ensures user_id = auth.uid().
 */
export function useAutosave<T>(fieldKey: string, value: T, opts?: { debounceMs?: number; enabled?: boolean }) {
  const debounceMs = opts?.debounceMs ?? 700;
  const { writeEnabled } = usePortfolioMode();
  const enabled = (opts?.enabled ?? true) && writeEnabled;
  const [state, setState] = useState<SaveState>("idle");
  const firstRun = useRef(true);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    if (!enabled) return;
    if (firstRun.current) { firstRun.current = false; return; }
    setState("saving");
    const t = setTimeout(async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) { setState("error"); return; }
        const payload = {
          user_id: u.user.id,
          field_key: fieldKey,
          value: JSON.stringify(latest.current),
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from("responses" as never)
          .upsert(payload as never, { onConflict: "user_id,field_key" } as never);
        if (error) { console.error("[autosave]", error); setState("error"); return; }
        setState("saved");
      } catch (e) {
        console.error("[autosave]", e);
        setState("error");
      }
    }, debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), fieldKey, debounceMs, enabled]);

  return state;
}
