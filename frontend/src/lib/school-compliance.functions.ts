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

export interface SchoolManagedClass {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string | null;
}

export interface SchoolManagedUser {
  id: string;
  name: string | null;
  email: string | null;
  role: "student" | "teacher" | "school_admin";
  deactivatedAt: string | null;
  locked: boolean;
  classId: string | null;
  className: string | null;
  ownedClasses: Array<{ id: string; name: string }>;
}

export interface SchoolManagementData {
  currentUserId: string;
  users: SchoolManagedUser[];
  classes: SchoolManagedClass[];
}

export interface StudentComplianceResponse {
  fieldKey: string;
  value: unknown;
  updatedAt: string | null;
}

export interface StudentReceivedStrength {
  id: string;
  strengthId: number;
  message: string | null;
  createdAt: string;
  fromName: string;
  fromRole: string;
  sprintId: string | null;
}

export interface StudentComplianceDetail {
  id: string;
  name: string | null;
  email: string | null;
  responses: StudentComplianceResponse[];
  receivedStrengths: StudentReceivedStrength[];
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

async function authEmails(db: any): Promise<Map<string, string>> {
  const emailOf = new Map<string, string>();
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(error.message);
  for (const user of data?.users ?? []) emailOf.set(user.id, user.email ?? "");
  return emailOf;
}

async function schoolOfUser(db: any, userId: string): Promise<string | null> {
  const { data, error } = await db.rpc("user_school_id", { _user_id: userId });
  if (error) throw new Error(error.message);
  return data ? String(data) : null;
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

    // Keep Supabase Auth aligned with the product lifecycle state. A profile
    // marked inactive/deleted must not be able to start or refresh sessions.
    // The database remains the source of truth for authorization checks.
    const db = await admin();
    if (data.action === "deactivate" || data.action === "delete") {
      const { error: banError } = await db.auth.admin.updateUserById(data.userId, {
        ban_duration: "876000h",
      });
      if (banError) {
        // Best-effort rollback so the visible lifecycle state does not claim
        // the account is blocked when Auth could not be blocked.
        const rollbackAction = data.action === "delete" ? "restore" : "reactivate";
        await context.supabase.rpc("school_admin_manage_user" as never, {
          p_user_id: data.userId,
          p_action: rollbackAction,
          p_replacement_teacher_id: null,
        } as never);
        throw new Error(banError.message);
      }
    } else if (data.action === "reactivate" || data.action === "restore") {
      const { error: unbanError } = await db.auth.admin.updateUserById(data.userId, {
        ban_duration: "none",
      });
      if (unbanError) throw new Error(unbanError.message);
    }

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

/** Active + deactivated school users and active classes for the admin controls. */
export const getSchoolManagementData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SchoolManagementData> => {
    const schoolId = await assertSchoolAdmin(context.supabase, context.userId);
    const db = await admin();

    const { data: staffProfiles, error: staffError } = await db
      .from("profiles")
      .select("id, display_name, deactivated_at, deleted_at, locked")
      .eq("school_id", schoolId);
    if (staffError) throw new Error(staffError.message);

    const staffRows = (staffProfiles ?? []) as Array<{
      id: string;
      display_name: string | null;
      deactivated_at: string | null;
      deleted_at: string | null;
      locked: boolean | null;
    }>;
    const staffIds = staffRows.map((profile) => profile.id);

    const { data: classes, error: classError } = staffIds.length
      ? await db
          .from("classes")
          .select("id, name, teacher_id")
          .in("teacher_id", staffIds)
          .eq("is_deleted", false)
      : { data: [] as any[], error: null };
    if (classError) throw new Error(classError.message);

    const classRows = (classes ?? []) as Array<{ id: string; name: string; teacher_id: string }>;
    const classIds = classRows.map((cls) => cls.id);
    const { data: memberships, error: membershipError } = classIds.length
      ? await db
          .from("class_members")
          .select("class_id, student_id")
          .in("class_id", classIds)
      : { data: [] as any[], error: null };
    if (membershipError) throw new Error(membershipError.message);

    const membershipRows = (memberships ?? []) as Array<{ class_id: string; student_id: string }>;
    const studentIds = [...new Set(membershipRows.map((row) => row.student_id))];
    const { data: studentProfiles, error: studentError } = studentIds.length
      ? await db
          .from("profiles")
          .select("id, display_name, deactivated_at, deleted_at, locked")
          .in("id", studentIds)
      : { data: [] as any[], error: null };
    if (studentError) throw new Error(studentError.message);

    const allProfiles = [
      ...staffRows,
      ...((studentProfiles ?? []) as typeof staffRows),
    ];
    const allIds = [...new Set(allProfiles.map((profile) => profile.id))];
    const { data: roles, error: roleError } = allIds.length
      ? await db.from("user_roles").select("user_id, role").in("user_id", allIds)
      : { data: [] as any[], error: null };
    if (roleError) throw new Error(roleError.message);

    const roleOf = new Map<string, string>(
      ((roles ?? []) as Array<{ user_id: string; role: string }>).map((row) => [row.user_id, row.role]),
    );
    const profileOf = new Map(allProfiles.map((profile) => [profile.id, profile]));
    const emailOf = await authEmails(db);
    const classNameOf = new Map(classRows.map((cls) => [cls.id, cls.name]));
    const activeClassOf = new Map<string, { id: string; name: string }>();
    for (const row of membershipRows) {
      activeClassOf.set(row.student_id, {
        id: row.class_id,
        name: classNameOf.get(row.class_id) ?? "",
      });
    }

    const ownedBy = new Map<string, Array<{ id: string; name: string }>>();
    for (const cls of classRows) {
      const list = ownedBy.get(cls.teacher_id) ?? [];
      list.push({ id: cls.id, name: cls.name });
      ownedBy.set(cls.teacher_id, list);
    }

    const users: SchoolManagedUser[] = allIds
      .map((id) => {
        const profile = profileOf.get(id);
        const role = roleOf.get(id) ?? "student";
        if (role !== "student" && role !== "teacher" && role !== "school_admin") return null;
        if (profile?.deleted_at) return null;
        const activeClass = activeClassOf.get(id) ?? null;
        return {
          id,
          name: profile?.display_name ?? null,
          email: emailOf.get(id) || null,
          role,
          deactivatedAt: profile?.deactivated_at ?? null,
          locked: Boolean(profile?.locked),
          classId: activeClass?.id ?? null,
          className: activeClass?.name ?? null,
          ownedClasses: ownedBy.get(id) ?? [],
        } satisfies SchoolManagedUser;
      })
      .filter((user): user is SchoolManagedUser => Boolean(user))
      .sort((a, b) =>
        (a.name ?? a.email ?? a.id).localeCompare(b.name ?? b.email ?? b.id),
      );

    const nameOf = new Map(users.map((user) => [user.id, user.name]));
    const activeClasses: SchoolManagedClass[] = classRows
      .map((cls) => ({
        id: cls.id,
        name: cls.name,
        ownerId: cls.teacher_id,
        ownerName: nameOf.get(cls.teacher_id) ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { currentUserId: context.userId, users, classes: activeClasses };
  });

/**
 * Student responses + received-strength messages for an assigned teacher or
 * same-school admin. This is intentionally server-side because auth emails and
 * cross-user messages must never be exposed by broad client queries.
 */
export const getStudentComplianceDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { studentId: string }) => data)
  .handler(async ({ data, context }): Promise<StudentComplianceDetail> => {
    const db = await admin();
    const { data: actorRoleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    const actorRole = actorRoleRow?.role as string | undefined;

    const { data: targetRoleRow } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", data.studentId)
      .maybeSingle();
    if ((targetRoleRow?.role ?? "student") !== "student") throw new Error("Student not found");

    if (actorRole === "school_admin") {
      const actorSchool = await assertSchoolAdmin(context.supabase, context.userId);
      const studentSchool = await schoolOfUser(db, data.studentId);
      if (!studentSchool || studentSchool !== actorSchool) throw new Error("Forbidden");
    } else if (actorRole === "teacher") {
      const { data: allowed, error: allowedError } = await context.supabase.rpc(
        "is_teacher_of" as never,
        { _student_id: data.studentId } as never,
      );
      if (allowedError) throw new Error(allowedError.message);
      if (!allowed) throw new Error("Forbidden");
    } else {
      throw new Error("Forbidden");
    }

    const [{ data: profile, error: profileError }, { data: responses, error: responseError }] =
      await Promise.all([
        db
          .from("profiles")
          .select("id, display_name")
          .eq("id", data.studentId)
          .maybeSingle(),
        db
          .from("responses")
          .select("field_key, value, updated_at")
          .eq("user_id", data.studentId)
          .order("updated_at", { ascending: false }),
      ]);
    if (profileError) throw new Error(profileError.message);
    if (!profile) throw new Error("Student not found");
    if (responseError) throw new Error(responseError.message);

    const { data: gifts, error: giftError } = await db
      .from("teacher_assigned_strengths")
      .select("id, strength_id, message, created_at, from_user_id, from_role, sprint_id, student_id, to_user_id")
      .or(`to_user_id.eq.${data.studentId},student_id.eq.${data.studentId}`)
      .order("created_at", { ascending: false });
    if (giftError) throw new Error(giftError.message);

    const giftRows = (gifts ?? []) as Array<{
      id: string;
      strength_id: string;
      message: string | null;
      created_at: string;
      from_user_id: string | null;
      from_role: string | null;
      sprint_id: string | null;
    }>;
    const giverIds = [...new Set(giftRows.map((row) => row.from_user_id).filter(Boolean))] as string[];
    const giverNames = new Map<string, string>();
    if (giverIds.length) {
      const { data: giverProfiles, error: giverError } = await db
        .from("profiles")
        .select("id, display_name")
        .in("id", giverIds);
      if (giverError) throw new Error(giverError.message);
      for (const giver of (giverProfiles ?? []) as Array<{ id: string; display_name: string | null }>) {
        giverNames.set(giver.id, giver.display_name?.trim() || "—");
      }
    }

    const emailOf = await authEmails(db);
    return {
      id: data.studentId,
      name: profile.display_name ?? null,
      email: emailOf.get(data.studentId) || null,
      responses: ((responses ?? []) as Array<{
        field_key: string;
        value: unknown;
        updated_at: string | null;
      }>).map((row) => ({
        fieldKey: row.field_key,
        value: row.value,
        updatedAt: row.updated_at,
      })),
      receivedStrengths: giftRows.map((row) => ({
        id: row.id,
        strengthId: Number(row.strength_id),
        message: row.message,
        createdAt: row.created_at,
        fromName: row.from_user_id ? giverNames.get(row.from_user_id) ?? "—" : "—",
        fromRole: row.from_role ?? "",
        sprintId: row.sprint_id,
      })),
    };
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

    const emailOf = await authEmails(db);

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
