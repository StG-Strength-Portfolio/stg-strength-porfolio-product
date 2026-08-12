import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ClassroomTeacher {
  id: string;
  name: string | null;
  email: string | null;
  role: "owner" | "co_teacher";
}

export interface AvailableClassroomTeacher {
  id: string;
  name: string | null;
  email: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function teacherContext(supabase: any, userId: string) {
  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (role?.role !== "teacher") throw new Error("Forbidden");

  const db = await admin();
  const { data: profile } = await db
    .from("profiles")
    .select("school_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.school_id) throw new Error("No school assigned");
  return { db, schoolId: profile.school_id as string };
}

async function emailsFor(db: any, ids: string[]) {
  const emails = new Map<string, string | null>();
  if (!ids.length) return emails;
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of data?.users ?? []) {
    if (ids.includes(user.id)) emails.set(user.id, user.email ?? null);
  }
  return emails;
}

export const getClassTeacherManagement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { classId: string }) => d)
  .handler(async ({ data, context }) => {
    const { db, schoolId } = await teacherContext(context.supabase, context.userId);
    const { data: klass } = await db
      .from("classes")
      .select("id, teacher_id")
      .eq("id", data.classId)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!klass) throw new Error("Class not found");

    const { data: membership } = await db
      .from("class_teachers")
      .select("teacher_id, role")
      .eq("class_id", data.classId)
      .eq("teacher_id", context.userId)
      .maybeSingle();
    if (!membership) throw new Error("Forbidden");

    const { data: assignments } = await db
      .from("class_teachers")
      .select("teacher_id, role")
      .eq("class_id", data.classId);
    const assignedIds = (assignments ?? []).map((x: any) => x.teacher_id as string);

    const { data: schoolProfiles } = await db
      .from("profiles")
      .select("id, display_name")
      .eq("school_id", schoolId);
    const schoolIds = (schoolProfiles ?? []).map((p: any) => p.id as string);
    const { data: roles } = schoolIds.length
      ? await db.from("user_roles").select("user_id, role").in("user_id", schoolIds)
      : { data: [] as any[] };
    const teacherIds = new Set(
      (roles ?? []).filter((r: any) => r.role === "teacher").map((r: any) => r.user_id as string),
    );
    const profileById = new Map(
      (schoolProfiles ?? []).map((p: any) => [p.id as string, p.display_name as string | null]),
    );
    const relevantIds = Array.from(new Set([...assignedIds, ...Array.from(teacherIds)]));
    const emails = await emailsFor(db, relevantIds);

    const teachers: ClassroomTeacher[] = (assignments ?? []).map((a: any) => ({
      id: a.teacher_id,
      name: profileById.get(a.teacher_id) ?? null,
      email: emails.get(a.teacher_id) ?? null,
      role: a.teacher_id === klass.teacher_id ? "owner" : "co_teacher",
    }));
    teachers.sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : (a.name ?? "").localeCompare(b.name ?? "")));

    const assigned = new Set(assignedIds);
    const available: AvailableClassroomTeacher[] = Array.from(teacherIds)
      .filter((id) => !assigned.has(id))
      .map((id) => ({ id, name: profileById.get(id) ?? null, email: emails.get(id) ?? null }))
      .sort((a, b) => (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? ""));

    return {
      isOwner: klass.teacher_id === context.userId,
      teachers,
      available,
    };
  });

export const addClassTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { classId: string; teacherId: string }) => d)
  .handler(async ({ data, context }) => {
    await teacherContext(context.supabase, context.userId);
    const { data: result, error } = await context.supabase.rpc("add_class_teacher", {
      p_class_id: data.classId,
      p_teacher_id: data.teacherId,
    });
    if (error) throw new Error(error.message);
    return result as { ok: boolean };
  });

export const removeClassTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { classId: string; teacherId: string }) => d)
  .handler(async ({ data, context }) => {
    await teacherContext(context.supabase, context.userId);
    const { data: result, error } = await context.supabase.rpc("remove_class_teacher", {
      p_class_id: data.classId,
      p_teacher_id: data.teacherId,
    });
    if (error) throw new Error(error.message);
    return result as { ok: boolean };
  });

export const transferClassOwnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { classId: string; teacherId: string }) => d)
  .handler(async ({ data, context }) => {
    await teacherContext(context.supabase, context.userId);
    const { data: result, error } = await context.supabase.rpc("transfer_class_ownership", {
      p_class_id: data.classId,
      p_new_owner_id: data.teacherId,
    });
    if (error) throw new Error(error.message);
    return result as { ok: boolean };
  });
