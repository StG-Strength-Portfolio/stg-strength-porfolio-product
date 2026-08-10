import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { matchStrengthId, strengthIdsFromResponses } from "@/lib/strength-jar-data";
import type { ReportEvent } from "@/lib/report-series";

export function useStudentStrengthEvents() {
  const [events, setEvents] = useState<ReportEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) {
        setEvents([]);
        return;
      }

      const [{ data: responses }, { data: gifts }] = await Promise.all([
        supabase
          .from("responses" as never)
          .select("field_key,value,updated_at")
          .eq("user_id", uid),
        supabase.rpc("get_my_received_strengths" as never),
      ]);

      const out: ReportEvent[] = [];
      for (const r of (responses ?? []) as unknown as Array<{
        field_key: string;
        value: string;
        updated_at: string;
      }>) {
        const ids = strengthIdsFromResponses([{ field_key: r.field_key, value: r.value }]);
        if (ids.length === 0) continue;
        out.push({
          userId: uid,
          classId: null,
          at: r.updated_at,
          strengths: ids.length,
          strengthIds: ids,
        });
      }

      for (const g of (gifts ?? []) as unknown as Array<{
        strength_id: string;
        created_at: string;
      }>) {
        const numeric = Number(g.strength_id);
        const id =
          Number.isInteger(numeric) && numeric >= 1 && numeric <= 26
            ? numeric
            : matchStrengthId(g.strength_id);
        if (!id) continue;
        out.push({
          userId: uid,
          classId: null,
          at: g.created_at,
          strengths: 1,
          strengthIds: [id],
        });
      }

      setEvents(out);
    } catch (err) {
      console.error("[student-strength-events]", err);
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
        .channel(`student-strength-events:${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "responses",
            filter: `user_id=eq.${uid}`,
          },
          () => void refresh(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "teacher_assigned_strengths",
            filter: `student_id=eq.${uid}`,
          },
          () => void refresh(),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { events, loading, refresh };
}
