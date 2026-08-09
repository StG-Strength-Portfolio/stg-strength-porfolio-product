import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Autosaves a single field_key to public.responses for the current user.
 * Debounced; serializes value as JSON text. RLS ensures user_id = auth.uid().
 */
export function useAutosave<T>(
  fieldKey: string,
  value: T,
  opts?: { debounceMs?: number; enabled?: boolean },
) {
  const debounceMs = opts?.debounceMs ?? 700;
  const enabled = opts?.enabled ?? true;
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
