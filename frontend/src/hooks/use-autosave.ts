import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SaveState = "idle" | "saving" | "saved" | "error";

const AutosaveEnabledContext = createContext(true);

/**
 * Allows a whole subtree to render the real student screen components without
 * persisting changes. Student routes keep the default `enabled=true`; teacher
 * presentation mode sets this to false.
 */
export function AutosaveScope({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return createElement(AutosaveEnabledContext.Provider, { value: enabled }, children);
}

/**
 * Autosaves a single field_key to public.responses for the current user.
 * Debounced; serializes value as JSON text. RLS ensures user_id = auth.uid().
 */
export function useAutosave<T>(
  fieldKey: string,
  value: T,
  opts?: { debounceMs?: number; enabled?: boolean },
) {
  const scopeEnabled = useContext(AutosaveEnabledContext);
  const debounceMs = opts?.debounceMs ?? 700;
  const enabled = scopeEnabled && (opts?.enabled ?? true);
  const [state, setState] = useState<SaveState>("idle");
  const firstRun = useRef(true);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    if (!enabled) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setState("saving");
    const t = setTimeout(async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) {
          setState("error");
          return;
        }
        const payload = {
          user_id: u.user.id,
          field_key: fieldKey,
          value: JSON.stringify(latest.current),
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from("responses" as never)
          .upsert(payload as never, { onConflict: "user_id,field_key" } as never);
        if (error) {
          console.error("[autosave]", error);
          setState("error");
          return;
        }
        setState("saved");

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("student-response-saved", {
              detail: {
                fieldKey,
                filled: isFilledValue(latest.current),
              },
            }),
          );
        }
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

function isFilledValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '\"\"' || trimmed === "null" || trimmed === "[]") return false;
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
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return row.value as unknown as T;
  }
}
