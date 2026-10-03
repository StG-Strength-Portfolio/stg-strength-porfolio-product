import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ClassroomTeacher {
  id: string;
  name: string | null;
  role: "owner" | "co_teacher";
}

export interface AvailableClassroomTeacher {
  id: string;
  name: string | null;
}

export interface ClassroomTeacherManagement {
  isOwner: boolean;
  teachers: ClassroomTeacher[];
  available: AvailableClassroomTeacher[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function requireTeacher(supabase: any, userId: string) {
  const { data: role, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (role?.role !== "teacher") throw new Error("Forbidden");
}

async function requireOwnedClass(db: any, classId: string, userId: string) {
  const { data: klass, error } = await db
    .from("classes")
    .select("id, teacher_id")
    .eq("id", classId)
    .eq("is_deleted", false)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!klass) throw new Error("Class not found");
  if (klass.teacher_id !== userId) throw new Error("Forbidden");
  return klass as { id: string; teacher_id: string };
}

async function teacherSchoolId(db: any, teacherId: string): Promise<string> {
  const { data: profile, error } = await db
    .from("profiles")
    .select("school_id")
    .eq("id", teacherId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile?.school_id) throw new Error("Teacher is not assigned to a school");
  return profile.school_id as string;
}

function normalizeTeacherTableError(error: any): never {
  const message = String(error?.message ?? "Teacher management database error");
  if (
    error?.code === "42P01" ||
    /class_teachers.*does not exist/i.test(message) ||
    /add_class_teacher|remove_class_teacher|transfer_class_ownership/i.test(message)
  ) {
    throw new Error("class_teachers database migration is not applied");
  }
  throw new Error(message);
}

export const getClassTeacherManagement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classId: string }) => data)
  .handler(async ({ data, context }): Promise<ClassroomTeacherManagement> => {
    await requireTeacher(context.supabase, context.userId);
    const db = await admin();
    const klass = await requireOwnedClass(db, data.classId, context.userId);

    // classes.teacher_id is the source of truth for ownership. Repair the
    // membership row automatically for classrooms created before this feature.
    const { error: ownerUpsertError } = await db
      .from("class_teachers")
      .upsert(
        { class_id: data.classId, teacher_id: klass.teacher_id, role: "owner" },
        { onConflict: "class_id,teacher_id" },
      );
    if (ownerUpsertError) normalizeTeacherTableError(ownerUpsertError);

    const { data: assignments, error: assignmentsError } = await db
      .from("class_teachers")
      .select("teacher_id, role")
      .eq("class_id", data.classId);
    if (assignmentsError) normalizeTeacherTableError(assignmentsError);

    const assignedIds = ((assignments ?? []) as any[]).map((item) => item.teacher_id as string);
    const { data: assignedProfiles, error: assignedProfilesError } = assignedIds.length
      ? await db.from("profiles").select("id, display_name").in("id", assignedIds)
      : { data: [] as any[], error: null };
    if (assignedProfilesError) throw new Error(assignedProfilesError.message);

    const nameById = new Map<string, string | null>(
      ((assignedProfiles ?? []) as any[]).map((profile) => [profile.id, profile.display_name]),
    );

    const teachers: ClassroomTeacher[] = ((assignments ?? []) as any[])
      .map((assignment) => ({
        id: assignment.teacher_id as string,
        name: nameById.get(assignment.teacher_id) ?? null,
        role:
          assignment.teacher_id === klass.teacher_id
            ? ("owner" as const)
            : ("co_teacher" as const),
      }))
      .sort((a, b) => {
        if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
        return (a.name ?? "").localeCompare(b.name ?? "");
      });

    const schoolId = await teacherSchoolId(db, context.userId);
    const { data: schoolProfiles, error: profilesError } = await db
      .from("profiles")
      .select("id, display_name")
      .eq("school_id", schoolId);
    if (profilesError) throw new Error(profilesError.message);

    const schoolIds = ((schoolProfiles ?? []) as any[]).map((profile) => profile.id as string);
    const { data: roles, error: rolesError } = schoolIds.length
      ? await db.from("user_roles").select("user_id, role").in("user_id", schoolIds)
      : { data: [] as any[], error: null };
    if (rolesError) throw new Error(rolesError.message);

    const teacherIds = new Set(
      ((roles ?? []) as any[])
        .filter((role) => role.role === "teacher")
        .map((role) => role.user_id as string),
    );
    const assignedSet = new Set(assignedIds);

    const available: AvailableClassroomTeacher[] = ((schoolProfiles ?? []) as any[])
      .filter((profile) => teacherIds.has(profile.id) && !assignedSet.has(profile.id))
      .map((profile) => ({ id: profile.id, name: profile.display_name ?? null }))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

    return { isOwner: true, teachers, available };
  });

export const addClassTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classId: string; teacherId: string }) => data)
  .handler(async ({ data, context }) => {
    await requireTeacher(context.supabase, context.userId);
    const db = await admin();
    await requireOwnedClass(db, data.classId, context.userId);

    const { data: result, error } = await context.supabase.rpc("add_class_teacher", {
      p_class_id: data.classId,
      p_teacher_id: data.teacherId,
    });
    if (error) normalizeTeacherTableError(error);
    return result as { ok: boolean };
  });

export const removeClassTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classId: string; teacherId: string }) => data)
  .handler(async ({ data, context }) => {
    await requireTeacher(context.supabase, context.userId);
    const db = await admin();
    await requireOwnedClass(db, data.classId, context.userId);

    const { data: result, error } = await context.supabase.rpc("remove_class_teacher", {
      p_class_id: data.classId,
      p_teacher_id: data.teacherId,
    });
    if (error) normalizeTeacherTableError(error);
    return result as { ok: boolean };
  });

export const transferClassOwnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classId: string; teacherId: string }) => data)
  .handler(async ({ data, context }) => {
    await requireTeacher(context.supabase, context.userId);
    const db = await admin();
    await requireOwnedClass(db, data.classId, context.userId);

    const { data: result, error } = await context.supabase.rpc("transfer_class_ownership", {
      p_class_id: data.classId,
      p_new_owner_id: data.teacherId,
    });
    if (error) normalizeTeacherTableError(error);
    return result as { ok: boolean };
  });
