/**
 * @lovable-new 2026-07-31
 * Bidirectional strength assignment: student → teacher, school admin → teacher,
 * plus the teacher's "received strengths" feed. All reads/writes are verified
 * server-side; students and teachers never read each other's tables directly.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export interface PersonRef {
  id: string;
  name: string;
}

export interface ReceivedStrength {
  id: string;
  strengthId: number;
  message: string | null;
  createdAt: string;
  fromName: string;
  fromRole: string;
}

/** The signed-in student's class teacher (first active class). */
export const getMyTeacher = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PersonRef | null> => {
    const db = await admin();
    const { data: memberships } = await db
      .from("class_members")
      .select("class_id")
      .eq("student_id", context.userId);
    const classIds = ((memberships ?? []) as Array<{ class_id: string }>).map((m) => m.class_id);
    if (classIds.length === 0) return null;
    const { data: classes } = await db
      .from("classes")
      .select("teacher_id, created_at")
      .in("id", classIds)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(1);
    const teacherId = ((classes ?? []) as Array<{ teacher_id: string }>)[0]?.teacher_id;
    if (!teacherId) return null;
    const { data: profile } = await db
      .from("profiles")
      .select("display_name")
      .eq("id", teacherId)
      .maybeSingle();
    return { id: teacherId, name: (profile?.display_name as string) ?? "—" };
  });

/** 1–3 unique strength ids per gift. */
function pickIds(ids: number[] | undefined): number[] {
  const list = [...new Set(ids ?? [])].filter((n) => Number.isFinite(n));
  if (list.length === 0) throw new Error("No strengths selected");
  return list.slice(0, 3);
}

async function insertStrength(
  db: any,
  args: {
    fromId: string;
    toId: string;
    strengthId: number;
    message: string | null;
    fromRole: string;
    toRole: string;
  },
) {
  const { error } = await db.from("teacher_assigned_strengths").insert({
    teacher_id: args.toRole === "teacher" ? args.toId : args.fromId,
    student_id: args.toRole === "teacher" ? args.fromId : args.toId,
    from_user_id: args.fromId,
    to_user_id: args.toId,
    from_role: args.fromRole,
    to_role: args.toRole,
    strength_id: String(args.strengthId),
    message: args.message,
  });
  if (error) throw new Error(error.message);
}

/** Student gifts a strength to their own class teacher. */
export const giveStrengthToMyTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { strengthIds: number[]; message?: string | null }) => d)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const db = await admin();
    const { data: memberships } = await db
      .from("class_members")
      .select("class_id")
      .eq("student_id", context.userId);
    const classIds = ((memberships ?? []) as Array<{ class_id: string }>).map((m) => m.class_id);
    if (classIds.length === 0) throw new Error("No class");
    const { data: classes } = await db
      .from("classes")
      .select("teacher_id")
      .in("id", classIds)
      .eq("is_deleted", false)
      .limit(1);
    const teacherId = ((classes ?? []) as Array<{ teacher_id: string }>)[0]?.teacher_id;
    if (!teacherId) throw new Error("No teacher");
    for (const strengthId of pickIds(data.strengthIds)) {
      await insertStrength(db, {
        fromId: context.userId,
        toId: teacherId,
        strengthId,
        message: data.message?.trim() || null,
        fromRole: "student",
        toRole: "teacher",
      });
    }
    return { ok: true };
  });

/** Teachers of the signed-in school admin's school. */
export const listSchoolTeachers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PersonRef[]> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "school_admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const db = await admin();
    const { data: me } = await db
      .from("profiles")
      .select("school_id")
      .eq("id", context.userId)
      .maybeSingle();
    const schoolId = me?.school_id as string | undefined;
    if (!schoolId) return [];
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name")
      .eq("school_id", schoolId);
    const rows = (profiles ?? []) as Array<{ id: string; display_name: string | null }>;
    if (rows.length === 0) return [];
    const { data: roles } = await db
      .from("user_roles")
      .select("user_id, role")
      .in(
        "user_id",
        rows.map((r) => r.id),
      )
      .eq("role", "teacher");
    const teacherIds = new Set(((roles ?? []) as Array<{ user_id: string }>).map((r) => r.user_id));
    return rows
      .filter((r) => teacherIds.has(r.id))
      .map((r) => ({ id: r.id, name: r.display_name ?? "—" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

/** School admin (principal) gifts a strength to a teacher of their school. */
export const giveStrengthToTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { teacherId: string; strengthIds: number[]; message?: string | null }) => d)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "school_admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const db = await admin();
    const { data: me } = await db
      .from("profiles")
      .select("school_id")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: target } = await db
      .from("profiles")
      .select("school_id")
      .eq("id", data.teacherId)
      .maybeSingle();
    if (!me?.school_id || me.school_id !== target?.school_id) throw new Error("Forbidden");
    for (const strengthId of pickIds(data.strengthIds)) {
      await insertStrength(db, {
        fromId: context.userId,
        toId: data.teacherId,
        strengthId,
        message: data.message?.trim() || null,
        fromRole: "school_admin",
        toRole: "teacher",
      });
    }
    return { ok: true };
  });

/** Everything the signed-in teacher has received (from students and principal). */
export const getTeacherReceivedStrengths = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReceivedStrength[]> => {
    const db = await admin();
    const { data } = await db
      .from("teacher_assigned_strengths")
      .select("id, strength_id, message, created_at, from_user_id, from_role")
      .eq("to_user_id", context.userId)
      .eq("to_role", "teacher")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Array<{
      id: string;
      strength_id: string;
      message: string | null;
      created_at: string;
      from_user_id: string;
      from_role: string;
    }>;
    const ids = [...new Set(rows.map((r) => r.from_user_id))];
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profiles } = await db.from("profiles").select("id, display_name").in("id", ids);
      for (const p of (profiles ?? []) as Array<{ id: string; display_name: string | null }>) {
        names.set(p.id, p.display_name ?? "—");
      }
    }
    return rows.map((r) => ({
      id: r.id,
      strengthId: Number(r.strength_id),
      message: r.message,
      createdAt: r.created_at,
      fromName: names.get(r.from_user_id) ?? "—",
      fromRole: r.from_role,
    }));
  });
