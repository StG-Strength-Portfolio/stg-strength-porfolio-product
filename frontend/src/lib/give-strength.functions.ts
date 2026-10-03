/**
 * Same-school strength giving and personal received-strength collections.
 *
 * Direct-gift rules:
 * - student -> teacher / school_admin
 * - teacher -> student / teacher / school_admin
 * - school_admin -> student / teacher / school_admin
 *
 * Strength Sprint has its own stricter session-participant boundary. Sprint
 * gifts land in this same permanent collection only when the creator ends the
 * session.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export type SchoolCommunityRole = "student" | "teacher" | "school_admin";

export interface PersonRef {
  id: string;
  name: string;
  role?: SchoolCommunityRole;
}

export interface SchoolStrengthRecipient {
  id: string;
  name: string;
  role: SchoolCommunityRole;
}

export interface ReceivedStrength {
  id: string;
  strengthId: number;
  message: string | null;
  createdAt: string;
  fromName: string;
  fromRole: string;
  sprintId?: string | null;
}

function pickIds(ids: number[] | undefined): number[] {
  const list = [...new Set(ids ?? [])].filter((id) => Number.isInteger(id) && id >= 1 && id <= 26);
  if (list.length === 0) throw new Error("No strengths selected");
  return list.slice(0, 3);
}

async function roleOf(db: any, userId: string): Promise<SchoolCommunityRole> {
  const { data, error } = await db.rpc("sprint_user_role", { _user_id: userId });
  if (error) throw new Error(error.message);
  if (data !== "student" && data !== "teacher" && data !== "school_admin") {
    throw new Error("Unsupported role");
  }
  return data;
}

async function schoolOf(db: any, userId: string): Promise<string> {
  const { data, error } = await db.rpc("user_school_id", { _user_id: userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No school");
  return String(data);
}

async function giveThroughDatabase(
  supabase: any,
  recipientId: string,
  strengthIds: number[],
  message?: string | null,
) {
  const { data, error } = await supabase.rpc("give_school_strength", {
    p_to_user_id: recipientId,
    p_strength_ids: pickIds(strengthIds),
    p_message: message?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return data;
}

async function schoolCommunity(db: any, userId: string): Promise<{
  callerRole: SchoolCommunityRole;
  schoolId: string;
  people: SchoolStrengthRecipient[];
}> {
  const callerRole = await roleOf(db, userId);
  const schoolId = await schoolOf(db, userId);

  const { data: staffProfiles, error: staffError } = await db
    .from("profiles")
    .select("id, display_name")
    .eq("school_id", schoolId);
  if (staffError) throw new Error(staffError.message);

  const staffRows = (staffProfiles ?? []) as Array<{ id: string; display_name: string | null }>;
  const staffIds = staffRows.map((row) => row.id);

  // Students currently inherit school through classroom membership rather than profiles.school_id.
  const { data: ownerProfiles } = await db.from("profiles").select("id").eq("school_id", schoolId);
  const ownerIds = ((ownerProfiles ?? []) as Array<{ id: string }>).map((row) => row.id);
  let studentIds: string[] = [];
  if (ownerIds.length > 0) {
    const { data: classes } = await db
      .from("classes")
      .select("id")
      .in("teacher_id", ownerIds)
      .eq("is_deleted", false);
    const classIds = ((classes ?? []) as Array<{ id: string }>).map((row) => row.id);
    if (classIds.length > 0) {
      const { data: members } = await db
        .from("class_members")
        .select("student_id")
        .in("class_id", classIds);
      studentIds = [...new Set(((members ?? []) as Array<{ student_id: string }>).map((row) => row.student_id))];
    }
  }

  const allIds = [...new Set([...staffIds, ...studentIds])];
  if (allIds.length === 0) return { callerRole, schoolId, people: [] };

  const [{ data: allProfiles }, { data: roleRows }] = await Promise.all([
    db.from("profiles").select("id, display_name").in("id", allIds),
    db.from("user_roles").select("user_id, role").in("user_id", allIds),
  ]);

  const names = new Map(
    ((allProfiles ?? []) as Array<{ id: string; display_name: string | null }>).map((row) => [
      row.id,
      row.display_name?.trim() || "—",
    ]),
  );
  const rolePriority = new Map<string, SchoolCommunityRole>();
  for (const row of (roleRows ?? []) as Array<{ user_id: string; role: string }>) {
    const role = row.role as SchoolCommunityRole;
    const current = rolePriority.get(row.user_id);
    if (role === "school_admin" || (!current && (role === "teacher" || role === "student"))) {
      rolePriority.set(row.user_id, role);
    } else if (role === "teacher" && current === "student") {
      rolePriority.set(row.user_id, role);
    }
  }

  const people = allIds
    .filter((id) => id !== userId)
    .map((id) => ({ id, name: names.get(id) ?? "—", role: rolePriority.get(id) }))
    .filter((person): person is SchoolStrengthRecipient =>
      person.role === "student" || person.role === "teacher" || person.role === "school_admin",
    )
    .filter((person) => callerRole !== "student" || person.role !== "student")
    .sort((a, b) => a.name.localeCompare(b.name));

  return { callerRole, schoolId, people };
}

/** Recipient picker for the signed-in user's same-school direct-gift rules. */
export const listSchoolStrengthRecipients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SchoolStrengthRecipient[]> => {
    const db = await admin();
    return (await schoolCommunity(db, context.userId)).people;
  });

/** Generic direct gift. The database re-checks role + same-school rules atomically. */
export const giveStrengthToSchoolMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { recipientId: string; strengthIds: number[]; message?: string | null }) => data,
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await giveThroughDatabase(
      context.supabase as any,
      data.recipientId,
      data.strengthIds,
      data.message,
    );
    return { ok: true };
  });

/** Every strength received by the signed-in user, regardless of role/source. */
export const getMyReceivedStrengths = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReceivedStrength[]> => {
    const db = await admin();
    const { data, error } = await db
      .from("teacher_assigned_strengths")
      .select("id, strength_id, message, created_at, from_user_id, from_role, sprint_id")
      .eq("to_user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{
      id: string;
      strength_id: string;
      message: string | null;
      created_at: string;
      from_user_id: string;
      from_role: string;
      sprint_id: string | null;
    }>;
    const ids = [...new Set(rows.map((row) => row.from_user_id).filter(Boolean))];
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profiles } = await db.from("profiles").select("id, display_name").in("id", ids);
      for (const profile of (profiles ?? []) as Array<{ id: string; display_name: string | null }>) {
        names.set(profile.id, profile.display_name?.trim() || "—");
      }
    }

    return rows.map((row) => ({
      id: row.id,
      strengthId: Number(row.strength_id),
      message: row.message,
      createdAt: row.created_at,
      fromName: names.get(row.from_user_id) ?? "—",
      fromRole: row.from_role,
      sprintId: row.sprint_id,
    }));
  });

// Backwards-compatible export used by the existing teacher Profile route.
export const getTeacherReceivedStrengths = getMyReceivedStrengths;

/** Backwards-compatible single-teacher lookup for older UI/demo code. */
export const getMyTeacher = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PersonRef | null> => {
    const db = await admin();
    const people = (await schoolCommunity(db, context.userId)).people.filter(
      (person) => person.role === "teacher",
    );
    return people[0] ?? null;
  });

/** Backwards-compatible student -> first available teacher action. */
export const giveStrengthToMyTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { strengthIds: number[]; message?: string | null }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const db = await admin();
    const community = await schoolCommunity(db, context.userId);
    if (community.callerRole !== "student") throw new Error("Forbidden");
    const teacher = community.people.find((person) => person.role === "teacher");
    if (!teacher) throw new Error("No teacher");
    await giveThroughDatabase(
      context.supabase as any,
      teacher.id,
      data.strengthIds,
      data.message,
    );
    return { ok: true };
  });

/** Backwards-compatible school-admin teacher list. */
export const listSchoolTeachers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PersonRef[]> => {
    const db = await admin();
    const community = await schoolCommunity(db, context.userId);
    if (community.callerRole !== "school_admin") throw new Error("Forbidden");
    return community.people.filter((person) => person.role === "teacher");
  });

/** Backwards-compatible principal -> teacher gift action. */
export const giveStrengthToTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { teacherId: string; strengthIds: number[]; message?: string | null }) => data,
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const db = await admin();
    const community = await schoolCommunity(db, context.userId);
    if (community.callerRole !== "school_admin") throw new Error("Forbidden");
    const teacher = community.people.find(
      (person) => person.id === data.teacherId && person.role === "teacher",
    );
    if (!teacher) throw new Error("Forbidden");
    await giveThroughDatabase(
      context.supabase as any,
      teacher.id,
      data.strengthIds,
      data.message,
    );
    return { ok: true };
  });
