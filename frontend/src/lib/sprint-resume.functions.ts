import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Return the most recently joined waiting/active Sprint for the signed-in user. */
export const getMyOpenSprint = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ sprintId: string } | null> => {
    const db = await admin();
    const { data: memberships, error: membershipError } = await db
      .from("sprint_players")
      .select("sprint_id, joined_at")
      .eq("student_id", context.userId)
      .order("joined_at", { ascending: false })
      .limit(20);
    if (membershipError) throw new Error(membershipError.message);

    const rows = (memberships ?? []) as Array<{ sprint_id: string; joined_at: string }>;
    if (rows.length === 0) return null;

    const { data: sessions, error: sessionError } = await db
      .from("sprint_sessions")
      .select("id, status")
      .in("id", rows.map((row) => row.sprint_id))
      .in("status", ["waiting", "active"]);
    if (sessionError) throw new Error(sessionError.message);

    const openIds = new Set(((sessions ?? []) as Array<{ id: string }>).map((session) => session.id));
    const latest = rows.find((row) => openIds.has(row.sprint_id));
    return latest ? { sprintId: latest.sprint_id } : null;
  });
