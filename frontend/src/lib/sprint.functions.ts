/**
 * School-community Strength Sprint server functions.
 *
 * The database retains the original column names for safe rollout while this
 * module exposes role-neutral names to the UI. In the legacy schema,
 * teacher_id is the creator id and student_id/from_student_id/to_student_id
 * are profile ids for any Sprint participant role.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export type SprintRole = "student" | "teacher" | "school_admin";
export type SprintStatus = "waiting" | "active" | "completed";

export interface SprintPlayer {
  userId: string;
  name: string;
  role: SprintRole;
  isCompleted: boolean;
}

export interface SprintPodiumItem {
  strengthId: number;
  count: number;
}

export interface SprintSnapshot {
  id: string;
  joinCode: string;
  status: SprintStatus;
  creatorId: string;
  players: SprintPlayer[];
  givenToIds: string[];
  myCompleted: boolean;
  sentCount: number;
  expectedCount: number;
  podium: SprintPodiumItem[];
}

export interface SprintReceivedGiver {
  name: string;
  role: SprintRole;
  message: string | null;
}

export interface SprintReceived {
  strengthId: number;
  count: number;
  givers: SprintReceivedGiver[];
}

async function namesFor(db: any, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await db.from("profiles").select("id, display_name").in("id", ids);
  return new Map(
    ((data ?? []) as Array<{ id: string; display_name: string | null }>).map((profile) => [
      profile.id,
      profile.display_name?.trim() || "—",
    ]),
  );
}

async function loadSprint(db: any, sprintId: string, userId: string) {
  const { data: sprint, error: sprintError } = await db
    .from("sprint_sessions")
    .select("id, teacher_id, join_code, status, school_id")
    .eq("id", sprintId)
    .maybeSingle();
  if (sprintError) throw new Error(sprintError.message);
  if (!sprint) throw new Error("Sprint not found");

  const { data: playerRows, error: playerError } = await db
    .from("sprint_players")
    .select("student_id, role, is_completed, joined_at")
    .eq("sprint_id", sprintId)
    .order("joined_at", { ascending: true });
  if (playerError) throw new Error(playerError.message);

  const rows = (playerRows ?? []) as Array<{
    student_id: string;
    role: SprintRole;
    is_completed: boolean;
  }>;
  const isCreator = sprint.teacher_id === userId;
  const isParticipant = rows.some((row) => row.student_id === userId);
  if (!isCreator && !isParticipant) throw new Error("Forbidden");

  return {
    sprint: sprint as {
      id: string;
      teacher_id: string;
      join_code: string;
      status: SprintStatus;
      school_id: string | null;
    },
    rows,
  };
}

/** One privacy-safe snapshot used by every Sprint screen. */
export const getSprintSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sprintId: string }) => data)
  .handler(async ({ data, context }): Promise<SprintSnapshot> => {
    const db = await admin();
    const { sprint, rows } = await loadSprint(db, data.sprintId, context.userId);
    const names = await namesFor(
      db,
      rows.map((row) => row.student_id),
    );

    const { data: strengthRows, error: strengthsError } = await db
      .from("sprint_strengths")
      .select("from_student_id, to_student_id, strength_id")
      .eq("sprint_id", data.sprintId);
    if (strengthsError) throw new Error(strengthsError.message);

    const strengths = (strengthRows ?? []) as Array<{
      from_student_id: string;
      to_student_id: string;
      strength_id: string;
    }>;
    const givenToIds = strengths
      .filter((row) => row.from_student_id === context.userId)
      .map((row) => row.to_student_id);

    const podiumCounts = new Map<number, number>();
    if (sprint.teacher_id === context.userId || sprint.status === "completed") {
      for (const row of strengths) {
        const id = Number(row.strength_id);
        podiumCounts.set(id, (podiumCounts.get(id) ?? 0) + 1);
      }
    }

    const players = rows.map((row) => ({
      userId: row.student_id,
      name: names.get(row.student_id) ?? "—",
      role: row.role,
      isCompleted: !!row.is_completed,
    }));

    return {
      id: sprint.id,
      joinCode: sprint.join_code,
      status: sprint.status,
      creatorId: sprint.teacher_id,
      players,
      givenToIds,
      myCompleted: players.find((player) => player.userId === context.userId)?.isCompleted ?? false,
      sentCount: strengths.length,
      expectedCount: players.length * Math.max(players.length - 1, 0),
      podium: [...podiumCounts.entries()]
        .map(([strengthId, count]) => ({ strengthId, count }))
        .sort((a, b) => b.count - a.count || a.strengthId - b.strengthId)
        .slice(0, 3),
    };
  });

/** Backwards-compatible player list used by demo-adjacent code. */
export const listSprintPlayers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sprintId: string }) => data)
  .handler(async ({ data, context }): Promise<SprintPlayer[]> => {
    const db = await admin();
    const { rows } = await loadSprint(db, data.sprintId, context.userId);
    const names = await namesFor(
      db,
      rows.map((row) => row.student_id),
    );
    return rows.map((row) => ({
      userId: row.student_id,
      name: names.get(row.student_id) ?? "—",
      role: row.role,
      isCompleted: !!row.is_completed,
    }));
  });

export const createSprintSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ sprintId: string; joinCode: string }> => {
    const { data, error } = await context.supabase.rpc("create_sprint_session" as never);
    if (error) throw new Error(error.message);
    const result = data as unknown as {
      ok?: boolean;
      sprint_id?: string;
      join_code?: string;
    };
    if (!result?.ok || !result.sprint_id || !result.join_code) {
      throw new Error("Sprint could not be created");
    }
    return { sprintId: result.sprint_id, joinCode: result.join_code };
  });

export const joinSprintSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data, context }): Promise<{ sprintId: string; status: SprintStatus }> => {
    const { data: resultData, error } = await context.supabase.rpc(
      "join_sprint" as never,
      { p_code: data.code.trim().toUpperCase() } as never,
    );
    if (error) throw new Error(error.message);
    const result = resultData as unknown as {
      ok?: boolean;
      error?: string;
      sprint_id?: string;
      status?: SprintStatus;
    };
    if (!result?.ok || !result.sprint_id) {
      if (result?.error === "different_school") {
        throw new Error("This Sprint belongs to another school");
      }
      throw new Error("Invalid code or Sprint has ended");
    }
    return { sprintId: result.sprint_id, status: result.status ?? "waiting" };
  });

async function runSprintRpc(
  supabase: any,
  name: "start_sprint" | "end_sprint" | "cancel_sprint" | "complete_sprint_player",
  sprintId: string,
) {
  const { data, error } = await supabase.rpc(name, { p_sprint_id: sprintId });
  if (error) throw new Error(error.message);
  return data;
}

export const startSprintSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sprintId: string }) => data)
  .handler(async ({ data, context }) =>
    runSprintRpc(context.supabase, "start_sprint", data.sprintId),
  );

export const endSprintSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sprintId: string }) => data)
  .handler(async ({ data, context }) =>
    runSprintRpc(context.supabase, "end_sprint", data.sprintId),
  );

export const cancelSprintSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sprintId: string }) => data)
  .handler(async ({ data, context }) =>
    runSprintRpc(context.supabase, "cancel_sprint", data.sprintId),
  );

export const completeSprintPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sprintId: string }) => data)
  .handler(async ({ data, context }) =>
    runSprintRpc(context.supabase, "complete_sprint_player", data.sprintId),
  );

export const giveSprintStrength = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { sprintId: string; toUserId: string; strengthId: number; message?: string | null }) => data,
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc(
      "give_sprint_strength" as never,
      {
        p_sprint_id: data.sprintId,
        p_to_user_id: data.toUserId,
        p_strength_id: String(data.strengthId),
        p_message: data.message?.trim() || null,
      } as never,
    );
    if (error) throw new Error(error.message);
    return result;
  });

/** Read-only results. Permanent collection storage happens atomically in end_sprint(). */
export const collectSprintResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sprintId: string }) => data)
  .handler(async ({ data, context }): Promise<SprintReceived[]> => {
    const db = await admin();
    await loadSprint(db, data.sprintId, context.userId);

    const { data: received, error } = await db
      .from("sprint_strengths")
      .select("from_student_id, from_role, strength_id, message")
      .eq("sprint_id", data.sprintId)
      .eq("to_student_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const rows = (received ?? []) as Array<{
      from_student_id: string;
      from_role: SprintRole;
      strength_id: string;
      message: string | null;
    }>;
    const names = await namesFor(db, [...new Set(rows.map((row) => row.from_student_id))]);

    const grouped = new Map<number, SprintReceived>();
    for (const row of rows) {
      const strengthId = Number(row.strength_id);
      const entry = grouped.get(strengthId) ?? { strengthId, count: 0, givers: [] };
      entry.count += 1;
      entry.givers.push({
        name: names.get(row.from_student_id) ?? "—",
        role: row.from_role,
        message: row.message,
      });
      grouped.set(strengthId, entry);
    }

    return [...grouped.values()].sort(
      (a, b) => b.count - a.count || a.strengthId - b.strengthId,
    );
  });
