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
  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (role?.role !== "teacher") throw new Error("Forbidden");
}

export const getClassTeacherManagement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classId: string }) => data)
  .handler(async ({ data, context }): Promise<ClassroomTeacherManagement> => {
    await requireTeacher(context.supabase, context.userId);
    const db = await admin();

    const { data: klass, error: classError } = await db
      .from("classes")
      .select("id, teacher_id")
      .eq("id", data.classId)
      .eq("is_deleted", false)
      .maybeSingle();
    if (classError) throw new Error(classError.message);
    if (!klass) throw new Error("Class not found");

    const { data: callerMembership } = await db
      .from("class_teachers")
      .select("teacher_id")
      .eq("class_id", data.classId)
      .eq("teacher_id", context.userId)
      .maybeSingle();
    if (!callerMembership) throw new Error("Forbidden");

    const { data: assignments, error: assignmentsError } = await db
      .from("class_teachers")
      .select("teacher_id, role")
      .eq("class_id", data.classId);
    if (assignmentsError) throw new Error(assignmentsError.message);

    const assignedIds = ((assignments ?? []) as any[]).map((item) => item.teacher_id as string);
    const { data: assignedProfiles } = assignedIds.length
      ? await db.from("profiles").select("id, display_name").in("id", assignedIds)
      : { data: [] as any[] };
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

    const isOwner = klass.teacher_id === context.userId;
    if (!isOwner) return { isOwner, teachers, available: [] };

    const { data: ownerProfile } = await db
      .from("profiles")
      .select("school_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!ownerProfile?.school_id) return { isOwner, teachers, available: [] };

    const { data: schoolProfiles, error: profilesError } = await db
      .from("profiles")
      .select("id, display_name")
      .eq("school_id", ownerProfile.school_id);
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

    return { isOwner, teachers, available };
  });

export const addClassTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classId: string; teacherId: string }) => data)
  .handler(async ({ data, context }) => {
    await requireTeacher(context.supabase, context.userId);
    const { data: result, error } = await context.supabase.rpc("add_class_teacher", {
      p_class_id: data.classId,
      p_teacher_id: data.teacherId,
    });
    if (error) throw new Error(error.message);
    return result as { ok: boolean };
  });

export const removeClassTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classId: string; teacherId: string }) => data)
  .handler(async ({ data, context }) => {
    await requireTeacher(context.supabase, context.userId);
    const { data: result, error } = await context.supabase.rpc("remove_class_teacher", {
      p_class_id: data.classId,
      p_teacher_id: data.teacherId,
    });
    if (error) throw new Error(error.message);
    return result as { ok: boolean };
  });

export const transferClassOwnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classId: string; teacherId: string }) => data)
  .handler(async ({ data, context }) => {
    await requireTeacher(context.supabase, context.userId);
    const { data: result, error } = await context.supabase.rpc("transfer_class_ownership", {
      p_class_id: data.classId,
      p_new_owner_id: data.teacherId,
    });
    if (error) throw new Error(error.message);
    return result as { ok: boolean };
  });
