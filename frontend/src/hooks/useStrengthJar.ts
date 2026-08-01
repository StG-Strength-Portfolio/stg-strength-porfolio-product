import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { matchStrengthId } from "@/lib/strength-jar-data";

/**
 * Reads the student's strength picks from existing autosaved responses.
 * Read-only: never writes, never changes field keys or save behaviour.
 *
 * selected  = the five candy-shop picks (screen 12)
 * collected = strengths named anywhere else in the adventure
 */
const KARKKIKAUPPA_KEY = "screen_12_karkkikauppa_picks";
const CHIPS_KEY = "screen_6_known_strengths";

function parse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

export function useStrengthJar() {
  const [selected, setSelected] = useState<number[]>([]);
  const [collected, setCollected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setSelected([]);
        setCollected([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("responses" as never)
        .select("field_key,value")
        .eq("user_id", u.user.id);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Array<{ field_key: string; value: string }>;

      const sel: number[] = [];
      const col: number[] = [];

      for (const row of rows) {
        const key = row.field_key;
        if (key === KARKKIKAUPPA_KEY) {
          const picks = parse<number[]>(row.value);
          if (Array.isArray(picks)) {
            for (const i of picks) {
              // Statement order on screen 12 matches the registry order (1–26).
              const id = Number(i) + 1;
              if (id >= 1 && id <= 26 && !sel.includes(id)) sel.push(id);
            }
          }
          continue;
        }
        const isNameField =
          key === CHIPS_KEY || key.endsWith("_karkit") || /^screen_13_karkki_\d+$/.test(key);
        if (!isNameField) continue;
        const v = parse<unknown>(row.value);
        const names = Array.isArray(v) ? v : [v];
        for (const n of names) {
          if (typeof n !== "string" || !n.trim()) continue;
          for (const part of n.split(/[,;/]| ja /i)) {
            const id = matchStrengthId(part);
            if (id && !col.includes(id)) col.push(id);
          }
        }
      }

      setSelected(sel);
      setCollected(col.filter((id) => !sel.includes(id)));
    } catch (err) {
      console.error("[strength-jar]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("strength-jar:refresh", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("strength-jar:refresh", onFocus);
    };
  }, [refresh]);

  return {
    selected,
    collected,
    totalCount: selected.length + collected.length,
    loading,
    refresh,
  };
}
