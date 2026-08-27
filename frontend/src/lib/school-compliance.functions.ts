import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type SchoolUserAction =
  | "deactivate"
  | "reactivate"
  | "delete"
  | "restore"
  | "demote_to_teacher";

export interface SchoolTrashUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  deletedAt: string;
  restoreUntil: string;
}

export interface SchoolTrashClass {
  id: string;
  name: string;
  teacherName: string | null;
  deletedAt: string;
  restoreUntil: string;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function assertSchoolAdmin(supabase: any, userId: string): Promise<string> {
  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (role?.role !== "school_admin") throw new Error("Forbidden");

  const db = await admin();
  const { data: profile } = await db
    .from("profiles")
    .select("school_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.school_id) throw new Error("No school assigned");
  return profile.school_id as string;
}

export const manageSchoolUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      userId: string;
      action: SchoolUserAction;
      replacementTeacherId?: string | null;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc(
      "school_admin_manage_user" as never,
      {
        p_user_id: data.userId,
        p_action: data.action,
        p_replacement_teacher_id: data.replacementTeacherId ?? null,
      } as never,
    );
    if (error) throw new Error(error.message);
    return result as unknown as { ok?: boolean; action?: string };
  });

export const moveStudentToClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { studentId: string; targetClassId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc(
      "move_student_to_class" as never,
      {
        p_student_id: data.studentId,
        p_target_class_id: data.targetClassId,
      } as never,
    );
    if (error) throw new Error(error.message);
    return result as unknown as { ok?: boolean; class_id?: string; already_member?: boolean };
  });

export const deleteStudentResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { studentId: string; fieldKey: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc(
      "delete_student_response" as never,
      {
        p_student_id: data.studentId,
        p_field_key: data.fieldKey,
      } as never,
    );
    if (error) throw new Error(error.message);
    return result as unknown as { ok?: boolean; error?: string };
  });

export const manageClassLifecycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classId: string; action: "delete" | "restore" }) => data)
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc(
      "manage_class_lifecycle" as never,
      { p_class_id: data.classId, p_action: data.action } as never,
    );
    if (error) throw new Error(error.message);
    return result as unknown as { ok?: boolean; action?: string; class_id?: string };
  });

export const getSchoolTrash = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ users: SchoolTrashUser[]; classes: SchoolTrashClass[] }> => {
    const schoolId = await assertSchoolAdmin(context.supabase, context.userId);
    const db = await admin();

    const { data: schoolProfiles } = await db
      .from("profiles")
      .select("id, display_name, deleted_at, school_id")
      .eq("school_id", schoolId);

    // Students commonly inherit their school through their active/deleted class
    // membership instead of profiles.school_id, so include those profile ids too.
    const { data: schoolTeachers } = await db
      .from("profiles")
      .select("id")
      .eq("school_id", schoolId);
    const teacherIds = ((schoolTeachers ?? []) as any[]).map((p) => p.id);
    const { data: allClasses } = teacherIds.length
      ? await db
          .from("classes")
          .select("id, name, teacher_id, is_deleted, deleted_at")
          .in("teacher_id", teacherIds)
      : { data: [] as any[] };
    const classIds = ((allClasses ?? []) as any[]).map((c) => c.id);
    const { data: memberships } = classIds.length
      ? await db.from("class_members").select("student_id").in("class_id", classIds)
      : { data: [] as any[] };

    const profileIds = new Set<string>([
      ...((schoolProfiles ?? []) as any[]).map((p) => p.id),
      ...((memberships ?? []) as any[]).map((m) => m.student_id),
    ]);

    const { data: profiles } = profileIds.size
      ? await db
          .from("profiles")
          .select("id, display_name, deleted_at")
          .in("id", [...profileIds])
          .not("deleted_at", "is", null)
      : { data: [] as any[] };
    const { data: roles } = profileIds.size
      ? await db.from("user_roles").select("user_id, role").in("user_id", [...profileIds])
      : { data: [] as any[] };
    const roleOf = new Map<string, string>(((roles ?? []) as any[]).map((r) => [r.user_id, r.role]));

    const emailOf = new Map<string, string>();
    const { data: authUsers } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const user of authUsers?.users ?? []) emailOf.set(user.id, user.email ?? "");

    const nameOf = new Map<string, string | null>(
      ((schoolProfiles ?? []) as any[]).map((p) => [p.id, p.display_name]),
    );
    for (const profile of (profiles ?? []) as any[]) nameOf.set(profile.id, profile.display_name);

    const plus90 = (value: string) => {
      const d = new Date(value);
      d.setUTCDate(d.getUTCDate() + 90);
      return d.toISOString();
    };

    const users: SchoolTrashUser[] = ((profiles ?? []) as any[])
      .filter((p) => p.deleted_at)
      .map((p) => ({
        id: p.id,
        name: p.display_name ?? null,
        email: emailOf.get(p.id) || null,
        role: roleOf.get(p.id) ?? "student",
        deletedAt: p.deleted_at,
        restoreUntil: plus90(p.deleted_at),
      }))
      .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

    const classes: SchoolTrashClass[] = ((allClasses ?? []) as any[])
      .filter((c) => c.is_deleted && c.deleted_at)
      .map((c) => ({
        id: c.id,
        name: c.name,
        teacherName: nameOf.get(c.teacher_id) ?? null,
        deletedAt: c.deleted_at,
        restoreUntil: plus90(c.deleted_at),
      }))
      .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

    return { users, classes };
  });
