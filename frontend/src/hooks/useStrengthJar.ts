import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KARKKIKAUPPA_KEY, strengthIdsFromResponses } from "@/lib/strength-jar-data";

/**
 * Reads the student's current strength collection from autosaved responses.
 *
 * selected  = the final candy-shop picks
 * collected = current strength selections from all other supported selectors
 *
 * Repeated strengths are intentionally preserved so the collection can show
 * occurrence counts such as Courage ×3 across three different activities.
 */
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

      const rows = (data ?? []) as unknown as Array<{ field_key: string; value: unknown }>;
      const candyRows = rows.filter((row) => row.field_key === KARKKIKAUPPA_KEY);
      const otherRows = rows.filter((row) => row.field_key !== KARKKIKAUPPA_KEY);

      setSelected(strengthIdsFromResponses(candyRows));
      setCollected(strengthIdsFromResponses(otherRows));
    } catch (err) {
      console.error("[strength-jar]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      await refresh();
      if (cancelled) return;

      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid || cancelled) return;

      channel = supabase
        .channel(`strength-jar:${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "responses",
            filter: `user_id=eq.${uid}`,
          },
          () => {
            void refresh();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "teacher_assigned_strengths",
            filter: `student_id=eq.${uid}`,
          },
          () => {
            window.dispatchEvent(new Event("strength-gifts:refresh"));
          },
        )
        .subscribe();
    })();

    const onFocus = () => void refresh();
    const onManualRefresh = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("strength-jar:refresh", onManualRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("strength-jar:refresh", onManualRefresh);
      if (channel) void supabase.removeChannel(channel);
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
