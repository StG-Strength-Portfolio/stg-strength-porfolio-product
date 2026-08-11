import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KARKKIKAUPPA_KEY, strengthIdsFromResponses } from "@/lib/strength-jar-data";
import { getSuperAdminPreview } from "@/lib/superadmin-preview";
import { getDemoStudentJar, onDemoStateChange } from "@/lib/demo-store";

const SCREEN6_CHOSEN_STRENGTHS_KEY = "screen_6_known_strengths";

/**
 * Reads the student's current strength collection from autosaved responses.
 * Demo mode uses the fictional student's session-only jar.
 */
export function useStrengthJar() {
  const [selected, setSelected] = useState<number[]>([]);
  const [collected, setCollected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      if (getSuperAdminPreview().mode === "student") {
        const demo = getDemoStudentJar();
        setSelected(demo.selected);
        setCollected(demo.collected);
        setLoading(false);
        return;
      }

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
      const chosenRows = rows.filter(
        (row) =>
          row.field_key === KARKKIKAUPPA_KEY ||
          row.field_key === SCREEN6_CHOSEN_STRENGTHS_KEY,
      );
      const otherRows = rows.filter(
        (row) =>
          row.field_key !== KARKKIKAUPPA_KEY &&
          row.field_key !== SCREEN6_CHOSEN_STRENGTHS_KEY,
      );

      setSelected(strengthIdsFromResponses(chosenRows));
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

      if (getSuperAdminPreview().mode === "student") return;

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
    const offDemo = onDemoStateChange(() => void refresh());
    window.addEventListener("focus", onFocus);
    window.addEventListener("strength-jar:refresh", onManualRefresh);

    return () => {
      cancelled = true;
      offDemo();
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
