/**
 * @lovable-new 2026-08-05 — Builds the authenticated student's OWN strength
 * collection timeline (autosaved responses + received gifts) as ReportEvents so
 * the shared growth chart can be reused without exposing peer/class data.
 * Every query is scoped to the signed-in user and relies on existing RLS.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { strengthIdsFromResponses } from "@/lib/strength-jar-data";
import type { ReportEvent } from "@/lib/report-series";

export function useStudentStrengthEvents() {
  const [events, setEvents] = useState<ReportEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id;
        if (!uid) {
          if (!cancelled) setEvents([]);
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
          const id = Number(g.strength_id);
          if (!(id >= 1 && id <= 26)) continue;
          out.push({
            userId: uid,
            classId: null,
            at: g.created_at,
            strengths: 1,
            strengthIds: [id],
          });
        }
        if (!cancelled) setEvents(out);
      } catch (err) {
        console.error("[student-strength-events]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { events, loading };
}
