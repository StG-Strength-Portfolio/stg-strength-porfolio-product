import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type DemoSprintStatus = "waiting" | "active" | "completed";

export interface DemoSprintHostParticipant {
  id: string;
  name: string;
  sent: number;
  total: number;
  finished: boolean;
}

export interface DemoSprintHostState {
  id: string;
  passcode: string;
  status: DemoSprintStatus;
  joinLocked: boolean;
  participants: DemoSprintHostParticipant[];
  sent: number;
  total: number;
  results: Array<{ strengthId: number; count: number }>;
  endedAt: string | null;
}

export interface DemoSprintGuestAssignment {
  participantId: string;
  name: string;
  position: number;
  strengthId: number | null;
}

export interface DemoSprintGuestResult {
  strengthId: number;
  count: number;
  names: string[];
}

export interface DemoSprintGuestState {
  sprintId: string;
  participantId: string;
  name: string;
  status: DemoSprintStatus;
  joinLocked: boolean;
  participants: string[];
  assignments: DemoSprintGuestAssignment[];
  finished: boolean;
  results: DemoSprintGuestResult[];
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomPasscode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function randomToken(): string {
  return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
}

async function cleanupExpired(db: any) {
  await db.from("demo_sprint_sessions").delete().lt("purge_at", new Date().toISOString());
}

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

async function sessionForHost(db: any, sprintId: string, userId: string) {
  const { data, error } = await db
    .from("demo_sprint_sessions")
    .select("id, host_user_id, passcode, status, join_locked, ended_at")
    .eq("id", sprintId)
    .eq("host_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Demo Sprint not found");
  return data as {
    id: string;
    host_user_id: string;
    passcode: string;
    status: DemoSprintStatus;
    join_locked: boolean;
    ended_at: string | null;
  };
}

async function buildHostState(db: any, session: any): Promise<DemoSprintHostState> {
  const { data: participantRows, error: participantError } = await db
    .from("demo_sprint_participants")
    .select("id, full_name, finished_at, joined_at")
    .eq("sprint_id", session.id)
    .order("joined_at", { ascending: true });
  if (participantError) throw new Error(participantError.message);

  const participants = (participantRows ?? []) as Array<{
    id: string;
    full_name: string;
    finished_at: string | null;
  }>;

  const { data: assignmentRows, error: assignmentError } = await db
    .from("demo_sprint_assignments")
    .select("from_participant_id")
    .eq("sprint_id", session.id);
  if (assignmentError) throw new Error(assignmentError.message);
  const totalByParticipant = new Map<string, number>();
  for (const row of assignmentRows ?? []) {
    const id = String((row as any).from_participant_id);
    totalByParticipant.set(id, (totalByParticipant.get(id) ?? 0) + 1);
  }

  const { data: strengthRows, error: strengthError } = await db
    .from("demo_sprint_strengths")
    .select("from_participant_id, strength_id")
    .eq("sprint_id", session.id);
  if (strengthError) throw new Error(strengthError.message);

  const sentByParticipant = new Map<string, number>();
  const resultCounts = new Map<number, number>();
  for (const row of strengthRows ?? []) {
    const fromId = String((row as any).from_participant_id);
    const strengthId = Number((row as any).strength_id);
    sentByParticipant.set(fromId, (sentByParticipant.get(fromId) ?? 0) + 1);
    resultCounts.set(strengthId, (resultCounts.get(strengthId) ?? 0) + 1);
  }

  const hostParticipants: DemoSprintHostParticipant[] = participants.map((p) => ({
    id: p.id,
    name: p.full_name,
    sent: sentByParticipant.get(p.id) ?? 0,
    total: totalByParticipant.get(p.id) ?? 0,
    finished: !!p.finished_at,
  }));

  const total = [...totalByParticipant.values()].reduce((a, b) => a + b, 0);
  const sent = [...sentByParticipant.values()].reduce((a, b) => a + b, 0);
  const results = [...resultCounts.entries()]
    .map(([strengthId, count]) => ({ strengthId, count }))
    .sort((a, b) => b.count - a.count || a.strengthId - b.strengthId);

  return {
    id: session.id,
    passcode: session.passcode,
    status: session.status,
    joinLocked: !!session.join_locked,
    participants: hostParticipants,
    sent,
    total,
    results,
    endedAt: session.ended_at ?? null,
  };
}

export const getCurrentDemoSprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DemoSprintHostState | null> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    await cleanupExpired(db);
    const { data, error } = await db
      .from("demo_sprint_sessions")
      .select("id, host_user_id, passcode, status, join_locked, ended_at, created_at, purge_at")
      .eq("host_user_id", context.userId)
      .gt("purge_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? buildHostState(db, data) : null;
  });

export const createDemoSprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DemoSprintHostState> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    await cleanupExpired(db);

    await db
      .from("demo_sprint_sessions")
      .delete()
      .eq("host_user_id", context.userId)
      .eq("status", "waiting");

    let row: any = null;
    let lastError: any = null;
    for (let attempt = 0; attempt < 6 && !row; attempt++) {
      const passcode = randomPasscode();
      const { data, error } = await db
        .from("demo_sprint_sessions")
        .insert({
          host_user_id: context.userId,
          passcode,
          status: "waiting",
          join_locked: false,
          purge_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        })
        .select("id, host_user_id, passcode, status, join_locked, ended_at")
        .single();
      if (!error) row = data;
      else lastError = error;
    }
    if (!row) throw new Error(lastError?.message ?? "Could not create demo Sprint");
    return buildHostState(db, row);
  });

export const refreshDemoSprintHost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sprintId: string }) => d)
  .handler(async ({ data, context }): Promise<DemoSprintHostState> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    await cleanupExpired(db);
    const session = await sessionForHost(db, data.sprintId, context.userId);
    return buildHostState(db, session);
  });

export const setDemoSprintJoinLocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sprintId: string; locked: boolean }) => d)
  .handler(async ({ data, context }): Promise<DemoSprintHostState> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const session = await sessionForHost(db, data.sprintId, context.userId);
    if (session.status !== "waiting") throw new Error("Joining can only be changed before the Sprint starts");
    const { error } = await db
      .from("demo_sprint_sessions")
      .update({ join_locked: data.locked })
      .eq("id", data.sprintId);
    if (error) throw new Error(error.message);
    return buildHostState(db, { ...session, join_locked: data.locked });
  });

function shuffled<T>(input: T[]): T[] {
  const a = [...input];
  const random = new Uint32Array(Math.max(1, a.length));
  crypto.getRandomValues(random);
  for (let i = a.length - 1; i > 0; i--) {
    const j = random[i] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const startDemoSprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sprintId: string }) => d)
  .handler(async ({ data, context }): Promise<DemoSprintHostState> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const session = await sessionForHost(db, data.sprintId, context.userId);
    if (session.status !== "waiting") return buildHostState(db, session);

    const { data: participantRows, error: participantsError } = await db
      .from("demo_sprint_participants")
      .select("id")
      .eq("sprint_id", data.sprintId)
      .order("joined_at", { ascending: true });
    if (participantsError) throw new Error(participantsError.message);
    const ids = (participantRows ?? []).map((r: any) => String(r.id));
    if (ids.length < 2) throw new Error("At least 2 participants are required");
    if (ids.length > 50) throw new Error("Maximum 50 participants");

    await db.from("demo_sprint_assignments").delete().eq("sprint_id", data.sprintId);
    const order = shuffled(ids);
    const feedbackCount = ids.length <= 5 ? ids.length - 1 : 5;
    const assignments: Array<{
      sprint_id: string;
      from_participant_id: string;
      to_participant_id: string;
      position: number;
    }> = [];

    // Ring assignments are balanced by construction: every participant gives
    // exactly N pieces of feedback and receives exactly N. Shuffling the ring
    // makes the colleague set different on every Sprint.
    for (let i = 0; i < order.length; i++) {
      for (let offset = 1; offset <= feedbackCount; offset++) {
        assignments.push({
          sprint_id: data.sprintId,
          from_participant_id: order[i],
          to_participant_id: order[(i + offset) % order.length],
          position: offset - 1,
        });
      }
    }
    const { error: assignmentError } = await db.from("demo_sprint_assignments").insert(assignments);
    if (assignmentError) throw new Error(assignmentError.message);

    const startedAt = new Date().toISOString();
    const { error: updateError } = await db
      .from("demo_sprint_sessions")
      .update({ status: "active", join_locked: true, started_at: startedAt })
      .eq("id", data.sprintId);
    if (updateError) throw new Error(updateError.message);
    return buildHostState(db, { ...session, status: "active", join_locked: true });
  });

export const endDemoSprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sprintId: string }) => d)
  .handler(async ({ data, context }): Promise<DemoSprintHostState> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const session = await sessionForHost(db, data.sprintId, context.userId);
    const endedAt = new Date().toISOString();
    const purgeAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { error } = await db
      .from("demo_sprint_sessions")
      .update({ status: "completed", join_locked: true, ended_at: endedAt, purge_at: purgeAt })
      .eq("id", data.sprintId);
    if (error) throw new Error(error.message);
    return buildHostState(db, {
      ...session,
      status: "completed",
      join_locked: true,
      ended_at: endedAt,
    });
  });

export const deleteDemoSprintsForHost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db.from("demo_sprint_sessions").delete().eq("host_user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const joinDemoSprint = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string; fullName: string }) => d)
  .handler(async ({ data }): Promise<{ token: string; state: DemoSprintGuestState }> => {
    const db = await admin();
    await cleanupExpired(db);
    const passcode = data.passcode.trim().toUpperCase();
    const fullName = data.fullName.trim().replace(/\s+/g, " ");
    if (!/^[A-Z2-9]{6}$/.test(passcode)) throw new Error("Invalid passcode");
    if (fullName.split(" ").filter(Boolean).length < 2) throw new Error("Please enter your full name");
    if (fullName.length > 80) throw new Error("Name is too long");

    const { data: session, error: sessionError } = await db
      .from("demo_sprint_sessions")
      .select("id, status, join_locked, purge_at")
      .eq("passcode", passcode)
      .gt("purge_at", new Date().toISOString())
      .maybeSingle();
    if (sessionError) throw new Error(sessionError.message);
    if (!session || session.status !== "waiting" || session.join_locked) throw new Error("Sprint is not open for joining");

    const { count } = await db
      .from("demo_sprint_participants")
      .select("id", { count: "exact", head: true })
      .eq("sprint_id", session.id);
    if ((count ?? 0) >= 50) throw new Error("Sprint is full");

    const token = randomToken();
    const tokenHash = await hashToken(token);
    const { data: participant, error: participantError } = await db
      .from("demo_sprint_participants")
      .insert({ sprint_id: session.id, full_name: fullName, guest_token_hash: tokenHash })
      .select("id")
      .single();
    if (participantError) {
      if (participantError.code === "23505") throw new Error("That full name is already in this Sprint");
      throw new Error(participantError.message);
    }
    const state = await guestStateByToken(db, tokenHash);
    return { token, state };
  });

async function guestStateByToken(db: any, tokenHash: string): Promise<DemoSprintGuestState> {
  await cleanupExpired(db);
  const { data: participant, error: participantError } = await db
    .from("demo_sprint_participants")
    .select("id, sprint_id, full_name, finished_at")
    .eq("guest_token_hash", tokenHash)
    .maybeSingle();
  if (participantError) throw new Error(participantError.message);
  if (!participant) throw new Error("Guest session expired");

  const { data: session, error: sessionError } = await db
    .from("demo_sprint_sessions")
    .select("id, status, join_locked, purge_at")
    .eq("id", participant.sprint_id)
    .gt("purge_at", new Date().toISOString())
    .maybeSingle();
  if (sessionError) throw new Error(sessionError.message);
  if (!session) throw new Error("Guest session expired");

  const { data: allParticipants } = await db
    .from("demo_sprint_participants")
    .select("id, full_name, joined_at")
    .eq("sprint_id", session.id)
    .order("joined_at", { ascending: true });
  const names = new Map<string, string>(
    (allParticipants ?? []).map((p: any) => [String(p.id), String(p.full_name)]),
  );

  const { data: assignmentRows } = await db
    .from("demo_sprint_assignments")
    .select("to_participant_id, position")
    .eq("sprint_id", session.id)
    .eq("from_participant_id", participant.id)
    .order("position", { ascending: true });

  const { data: givenRows } = await db
    .from("demo_sprint_strengths")
    .select("to_participant_id, strength_id")
    .eq("sprint_id", session.id)
    .eq("from_participant_id", participant.id);
  const given = new Map<string, number>(
    (givenRows ?? []).map((r: any) => [String(r.to_participant_id), Number(r.strength_id)]),
  );

  const assignments: DemoSprintGuestAssignment[] = (assignmentRows ?? []).map((r: any) => ({
    participantId: String(r.to_participant_id),
    name: names.get(String(r.to_participant_id)) ?? "—",
    position: Number(r.position),
    strengthId: given.get(String(r.to_participant_id)) ?? null,
  }));

  const results: DemoSprintGuestResult[] = [];
  if (session.status === "completed") {
    const { data: receivedRows } = await db
      .from("demo_sprint_strengths")
      .select("from_participant_id, strength_id")
      .eq("sprint_id", session.id)
      .eq("to_participant_id", participant.id);
    const grouped = new Map<number, DemoSprintGuestResult>();
    for (const row of receivedRows ?? []) {
      const id = Number((row as any).strength_id);
      const entry = grouped.get(id) ?? { strengthId: id, count: 0, names: [] };
      entry.count += 1;
      entry.names.push(names.get(String((row as any).from_participant_id)) ?? "—");
      grouped.set(id, entry);
    }
    results.push(...[...grouped.values()].sort((a, b) => b.count - a.count || a.strengthId - b.strengthId));
  }

  return {
    sprintId: String(session.id),
    participantId: String(participant.id),
    name: String(participant.full_name),
    status: session.status as DemoSprintStatus,
    joinLocked: !!session.join_locked,
    participants: [...names.values()],
    assignments,
    finished: !!participant.finished_at,
    results,
  };
}

export const getDemoSprintGuestState = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }): Promise<DemoSprintGuestState> => {
    const db = await admin();
    return guestStateByToken(db, await hashToken(data.token));
  });

export const saveDemoSprintStrength = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; toParticipantId: string; strengthId: number }) => d)
  .handler(async ({ data }): Promise<DemoSprintGuestState> => {
    if (!Number.isInteger(data.strengthId) || data.strengthId < 1 || data.strengthId > 26) {
      throw new Error("Invalid strength");
    }
    const db = await admin();
    const tokenHash = await hashToken(data.token);
    const { data: participant } = await db
      .from("demo_sprint_participants")
      .select("id, sprint_id, finished_at")
      .eq("guest_token_hash", tokenHash)
      .maybeSingle();
    if (!participant) throw new Error("Guest session expired");
    if (participant.finished_at) throw new Error("Feedback has already been submitted");

    const { data: session } = await db
      .from("demo_sprint_sessions")
      .select("status, purge_at")
      .eq("id", participant.sprint_id)
      .gt("purge_at", new Date().toISOString())
      .maybeSingle();
    if (!session || session.status !== "active") throw new Error("Sprint is not active");

    const { data: assignment } = await db
      .from("demo_sprint_assignments")
      .select("id")
      .eq("sprint_id", participant.sprint_id)
      .eq("from_participant_id", participant.id)
      .eq("to_participant_id", data.toParticipantId)
      .maybeSingle();
    if (!assignment) throw new Error("This colleague is not assigned to you");

    const now = new Date().toISOString();
    const { error } = await db.from("demo_sprint_strengths").upsert(
      {
        sprint_id: participant.sprint_id,
        from_participant_id: participant.id,
        to_participant_id: data.toParticipantId,
        strength_id: data.strengthId,
        updated_at: now,
      },
      { onConflict: "sprint_id,from_participant_id,to_participant_id" },
    );
    if (error) throw new Error(error.message);
    return guestStateByToken(db, tokenHash);
  });

export const finishDemoSprintGuest = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }): Promise<DemoSprintGuestState> => {
    const db = await admin();
    const tokenHash = await hashToken(data.token);
    const state = await guestStateByToken(db, tokenHash);
    if (state.status !== "active") throw new Error("Sprint is not active");
    if (state.assignments.length === 0 || state.assignments.some((a) => a.strengthId == null)) {
      throw new Error("Please give feedback to every assigned colleague first");
    }
    const { error } = await db
      .from("demo_sprint_participants")
      .update({ finished_at: new Date().toISOString() })
      .eq("id", state.participantId);
    if (error) throw new Error(error.message);
    return guestStateByToken(db, tokenHash);
  });
