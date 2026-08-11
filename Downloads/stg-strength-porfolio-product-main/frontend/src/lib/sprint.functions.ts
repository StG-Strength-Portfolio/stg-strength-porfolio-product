/**
 * @lovable-new 2026-07-31
 * Strength Sprint server functions — peer names and result collection.
 * Students may not read each other's profiles directly, so name lookups and
 * the auto-collection of received strengths run server-side after verifying
 * that the caller really takes part in the sprint.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export interface SprintPlayer {
  studentId: string;
  name: string;
  isCompleted: boolean;
}

export interface SprintReceived {
  strengthId: number;
  count: number;
  names: string[];
}

async function loadSprint(db: any, sprintId: string, userId: string) {
  const { data: sprint } = await db
    .from("sprint_sessions")
    .select("id, teacher_id, status")
    .eq("id", sprintId)
    .maybeSingle();
  if (!sprint) throw new Error("Sprint not found");
  const { data: players } = await db
    .from("sprint_players")
    .select("student_id, is_completed, joined_at")
    .eq("sprint_id", sprintId)
    .order("joined_at", { ascending: true });
  const rows = (players ?? []) as Array<{
    student_id: string;
    is_completed: boolean;
  }>;
  const isHost = sprint.teacher_id === userId;
  const isPlayer = rows.some((r) => r.student_id === userId);
  if (!isHost && !isPlayer) throw new Error("Forbidden");
  return { sprint, rows };
}

async function namesFor(db: any, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await db.from("profiles").select("id, display_name").in("id", ids);
  return new Map(
    ((data ?? []) as Array<{ id: string; display_name: string | null }>).map((p) => [
      p.id,
      p.display_name ?? "—",
    ]),
  );
}

/** Players of a sprint with display names (host or participant only). */
export const listSprintPlayers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sprintId: string }) => d)
  .handler(async ({ data, context }): Promise<SprintPlayer[]> => {
    const db = await admin();
    const { rows } = await loadSprint(db, data.sprintId, context.userId);
    const names = await namesFor(
      db,
      rows.map((r) => r.student_id),
    );
    return rows.map((r) => ({
      studentId: r.student_id,
      name: names.get(r.student_id) ?? "—",
      isCompleted: !!r.is_completed,
    }));
  });

/**
 * Strengths the signed-in student received in this sprint, grouped by
 * strength with the giver names. Also collects them into the student's own
 * strength collection exactly once per sprint.
 */
export const collectSprintResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sprintId: string }) => d)
  .handler(async ({ data, context }): Promise<SprintReceived[]> => {
    const db = await admin();
    await loadSprint(db, data.sprintId, context.userId);
    const me = context.userId;

    const { data: received } = await db
      .from("sprint_strengths")
      .select("from_student_id, strength_id")
      .eq("sprint_id", data.sprintId)
      .eq("to_student_id", me);
    const rows = (received ?? []) as Array<{ from_student_id: string; strength_id: string }>;

    const names = await namesFor(db, [...new Set(rows.map((r) => r.from_student_id))]);

    const { data: alreadyRows } = await db
      .from("teacher_assigned_strengths")
      .select("from_user_id, strength_id")
      .eq("to_user_id", me)
      .eq("from_role", "student");
    const have = new Set(
      ((alreadyRows ?? []) as Array<{ from_user_id: string; strength_id: string }>).map(
        (r) => `${r.from_user_id}|${r.strength_id}`,
      ),
    );
    const toInsert = rows.filter((r) => !have.has(`${r.from_student_id}|${r.strength_id}`));
    if (toInsert.length > 0) {
      await db.from("teacher_assigned_strengths").insert(
        toInsert.map((r) => ({
          teacher_id: r.from_student_id,
          student_id: me,
          from_user_id: r.from_student_id,
          to_user_id: me,
          from_role: "student",
          to_role: "student",
          strength_id: r.strength_id,
          message: null,
        })),
      );
    }

    const grouped = new Map<number, SprintReceived>();
    for (const r of rows) {
      const id = Number(r.strength_id);
      const entry = grouped.get(id) ?? { strengthId: id, count: 0, names: [] };
      entry.count += 1;
      entry.names.push(names.get(r.from_student_id) ?? "—");
      grouped.set(id, entry);
    }
    return [...grouped.values()].sort((a, b) => b.count - a.count || a.strengthId - b.strengthId);
  });
