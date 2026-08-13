import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { matchStrengthId, strengthIdsFromResponses } from "@/lib/strength-jar-data";
import { createStaffCode } from "@/lib/staff-registration.functions";
import type { ReportEvent } from "@/lib/report-series";

export interface SchoolAdminStudent {
  id: string;
  name: string | null;
  email: string | null;
  className: string | null;
  classId: string | null;
  strengthIds: number[];
  currentScreen: number;
  lastActive: string | null;
  filledKeys: string[];
}

export interface SchoolAdminTeacher {
  id: string;
  name: string | null;
  email: string | null;
  classCount: number;
  studentCount: number;
  lastActive: string | null;
  role: string;
  classNames: string[];
}

export interface SchoolAdminCode {
  id: string;
  code: string;
  code_type: string;
  is_used: boolean;
  is_revoked: boolean;
  used_by: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface SchoolAdminClass {
  id: string;
  name: string;
  teacherName: string | null;
  joinCode?: string | null;
  language?: string | null;
}

export interface SchoolAdminData {
  school: { id: string; name: string } | null;
  students: SchoolAdminStudent[];
  teachers: SchoolAdminTeacher[];
  classes: SchoolAdminClass[];
  codes: SchoolAdminCode[];
  strengthCounts: { strengthId: string; count: number }[];
  events: ReportEvent[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

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

/** Read access for a real principal or a Superadmin principal preview. */
async function resolveReadSchool(supabase: any, userId: string): Promise<string> {
  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (role?.role === "school_admin") return assertSchoolAdmin(supabase, userId);
  if (role?.role !== "super_admin") throw new Error("Forbidden");

  const db = await admin();
  const { data: school, error } = await db
    .from("schools")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!school?.id) throw new Error("No active school available for preview");
  return school.id as string;
}

export const getSchoolAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SchoolAdminData> => {
    const schoolId = await resolveReadSchool(context.supabase, context.userId);
    const db = await admin();

    const [{ data: school }, { data: profiles }, { data: roles }, { data: codes }] =
      await Promise.all([
        db.from("schools").select("id, name").eq("id", schoolId).maybeSingle(),
        db
          .from("profiles")
          .select("id, display_name, current_screen, updated_at")
          .eq("school_id", schoolId),
        db.from("user_roles").select("user_id, role"),
        db
          .from("school_codes")
          .select("id, code, code_type, is_used, is_revoked, used_by_admin_id, created_at, expires_at")
          .eq("school_id", schoolId)
          .eq("code_type", "staff")
          .order("created_at", { ascending: false }),
      ]);

    const roleOf = new Map<string, string>();
    for (const r of roles ?? []) roleOf.set(r.user_id, r.role);

    const memberIds = ((profiles ?? []) as any[]).map((p) => p.id);
    const nameOf = new Map<string, string | null>(
      ((profiles ?? []) as any[]).map((p) => [p.id, p.display_name]),
    );

    const teacherIds = memberIds.filter((id) => roleOf.get(id) === "teacher");
    const adminIds = memberIds.filter((id) => roleOf.get(id) === "school_admin");

    const { data: classes } = await db
      .from("classes")
      .select("id, name, teacher_id, join_code, language")
      .eq("is_deleted", false)
      .in("teacher_id", teacherIds.length ? teacherIds : ["00000000-0000-0000-0000-000000000000"]);

    const classIds = ((classes ?? []) as any[]).map((c) => c.id);
    const { data: members } = classIds.length
      ? await db.from("class_members").select("class_id, student_id").in("class_id", classIds)
      : { data: [] as any[] };

    const classOfStudent = new Map<string, string>();
    const classIdOfStudent = new Map<string, string>();
    const classNameById = new Map<string, string>(
      ((classes ?? []) as any[]).map((c) => [c.id, c.name]),
    );
    const studentsPerClass = new Map<string, number>();
    for (const m of (members ?? []) as any[]) {
      classOfStudent.set(m.student_id, classNameById.get(m.class_id) ?? "");
      classIdOfStudent.set(m.student_id, m.class_id);
      studentsPerClass.set(m.class_id, (studentsPerClass.get(m.class_id) ?? 0) + 1);
    }

    const studentIdSet = new Set<string>(memberIds.filter((id) => roleOf.get(id) === "student"));
    for (const m of (members ?? []) as any[]) {
      if ((roleOf.get(m.student_id) ?? "student") === "student") studentIdSet.add(m.student_id);
    }
    const studentIds = Array.from(studentIdSet);
    const communityIdSet = new Set<string>([...memberIds, ...studentIds]);

    const extraProfiles: any[] = [];
    const missingIds = studentIds.filter((id) => !nameOf.has(id));
    if (missingIds.length) {
      const { data: extra } = await db
        .from("profiles")
        .select("id, display_name, current_screen, updated_at")
        .in("id", missingIds);
      for (const p of (extra ?? []) as any[]) {
        nameOf.set(p.id, p.display_name);
        extraProfiles.push(p);
      }
    }

    const { data: responses } = studentIds.length
      ? await db
          .from("responses")
          .select("user_id, field_key, value, updated_at")
          .in("user_id", studentIds)
      : { data: [] as any[] };

    const filledPer = new Map<string, Set<string>>();
    const lastPer = new Map<string, string>();
    for (const r of (responses ?? []) as any[]) {
      const v = r.value;
      const filled =
        v !== null &&
        v !== undefined &&
        !(typeof v === "string" && (!v.trim() || v === '""' || v === "null"));
      if (filled) {
        let s = filledPer.get(r.user_id);
        if (!s) {
          s = new Set();
          filledPer.set(r.user_id, s);
        }
        s.add(r.field_key);
      }
      const prev = lastPer.get(r.user_id);
      if (r.updated_at && (!prev || r.updated_at > prev)) lastPer.set(r.user_id, r.updated_at);
    }

    const emails = new Map<string, string>();
    const { data: authUsers } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of authUsers?.users ?? []) emails.set(u.id, u.email ?? "");

    const profById = new Map<string, any>(
      [...((profiles ?? []) as any[]), ...extraProfiles].map((p) => [p.id, p]),
    );

    const { data: assigned } = await db
      .from("teacher_assigned_strengths")
      .select("strength_id, student_id, teacher_id, from_user_id, to_user_id, created_at");
    const counts = new Map<string, number>();
    const giftsPer = new Map<string, number[]>();
    for (const a of (assigned ?? []) as any[]) {
      const linkedToSchool = [a.from_user_id, a.to_user_id, a.teacher_id, a.student_id]
        .filter(Boolean)
        .some((id) => communityIdSet.has(id));
      if (!linkedToSchool) continue;

      counts.set(a.strength_id, (counts.get(a.strength_id) ?? 0) + 1);
      const id = Number.isFinite(Number(a.strength_id))
        ? Number(a.strength_id)
        : matchStrengthId(String(a.strength_id));
      const recipientId = a.to_user_id ?? a.student_id;
      if (id && id >= 1 && id <= 26 && studentIdSet.has(recipientId)) {
        const list = giftsPer.get(recipientId) ?? [];
        list.push(id);
        giftsPer.set(recipientId, list);
      }
    }

    const events: ReportEvent[] = [];
    for (const r of (responses ?? []) as any[]) {
      if (!studentIdSet.has(r.user_id) || !r.updated_at) continue;
      const v = r.value;
      const filled =
        v !== null &&
        v !== undefined &&
        !(typeof v === "string" && (!v.trim() || v === '""' || v === "null"));
      const rowStrengthIds = strengthIdsFromResponses([{ field_key: r.field_key, value: r.value }]);
      events.push({
        userId: r.user_id,
        classId: classIdOfStudent.get(r.user_id) ?? null,
        at: r.updated_at,
        fieldKey: filled ? r.field_key : undefined,
        strengths: rowStrengthIds.length,
        strengthIds: rowStrengthIds,
      });
    }
    for (const a of (assigned ?? []) as any[]) {
      const recipientId = a.to_user_id ?? a.student_id;
      if (!studentIdSet.has(recipientId) || !a.created_at) continue;
      const giftId = Number.isFinite(Number(a.strength_id))
        ? Number(a.strength_id)
        : matchStrengthId(String(a.strength_id));
      events.push({
        userId: recipientId,
        classId: classIdOfStudent.get(recipientId) ?? null,
        at: a.created_at,
        strengths: 1,
        strengthIds: giftId ? [giftId] : [],
      });
    }

    const responsesPer = new Map<string, Array<{ field_key: string; value: unknown }>>();
    for (const r of (responses ?? []) as any[]) {
      const list = responsesPer.get(r.user_id) ?? [];
      list.push({ field_key: r.field_key, value: r.value });
      responsesPer.set(r.user_id, list);
    }

    const students: SchoolAdminStudent[] = studentIds.map((id) => ({
      id,
      name: nameOf.get(id) ?? null,
      email: emails.get(id) ?? null,
      className: classOfStudent.get(id) ?? null,
      classId: classIdOfStudent.get(id) ?? null,
      strengthIds: [
        ...strengthIdsFromResponses(responsesPer.get(id) ?? []),
        ...(giftsPer.get(id) ?? []),
      ],
      currentScreen: profById.get(id)?.current_screen ?? 1,
      lastActive: lastPer.get(id) ?? profById.get(id)?.updated_at ?? null,
      filledKeys: Array.from(filledPer.get(id) ?? []),
    }));

    const teachers: SchoolAdminTeacher[] = [...teacherIds, ...adminIds].map((id) => {
      const own = ((classes ?? []) as any[]).filter((c) => c.teacher_id === id);
      return {
        id,
        name: nameOf.get(id) ?? null,
        email: emails.get(id) ?? null,
        classCount: own.length,
        studentCount: own.reduce((a, c) => a + (studentsPerClass.get(c.id) ?? 0), 0),
        lastActive: profById.get(id)?.updated_at ?? null,
        role: roleOf.get(id) ?? "teacher",
        classNames: own.map((c) => c.name),
      };
    });

    const classList: SchoolAdminClass[] = ((classes ?? []) as any[]).map((c) => ({
      id: c.id,
      name: c.name,
      teacherName: nameOf.get(c.teacher_id) ?? null,
      joinCode: c.join_code ?? null,
      language: c.language ?? null,
    }));

    return {
      school: (school as any) ?? null,
      students,
      teachers,
      classes: classList,
      codes: ((codes ?? []) as any[]).map((c) => ({
        id: c.id,
        code: c.code,
        code_type: c.code_type,
        is_used: c.is_used,
        is_revoked: c.is_revoked,
        used_by: c.used_by_admin_id ? (nameOf.get(c.used_by_admin_id) ?? null) : null,
        created_at: c.created_at,
        expires_at: c.expires_at ?? null,
      })),
      events,
      strengthCounts: Array.from(counts, ([strengthId, count]) => ({ strengthId, count })).sort(
        (a, b) => b.count - a.count,
      ),
    };
  });

/** Legacy export name kept for the existing dashboard; now regenerates the shared staff code. */
export const createTeacherCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const schoolId = await assertSchoolAdmin(context.supabase, context.userId);
    return createStaffCode(await admin(), schoolId, context.userId);
  });

export const revokeTeacherCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const schoolId = await assertSchoolAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db
      .from("school_codes")
      .update({ is_revoked: true })
      .eq("id", data.id)
      .eq("school_id", schoolId)
      .eq("code_type", "staff");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const promoteToSchoolAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    const schoolId = await assertSchoolAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: target } = await db
      .from("profiles")
      .select("school_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (target?.school_id !== schoolId) throw new Error("Forbidden");
    const { error } = await db
      .from("user_roles")
      .upsert({ user_id: data.userId, role: "school_admin" }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Read one student's raw responses for the school-admin portfolio drill-down. */
export const getStudentPortfolio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      name: string | null;
      currentScreen: number | null;
      responses: { field_key: string; value: string | null }[];
    }> => {
      const schoolId = await resolveReadSchool(context.supabase, context.userId);
      const db = await admin();

      const { data: profile } = await db
        .from("profiles")
        .select("id, display_name, current_screen, school_id")
        .eq("id", data.userId)
        .maybeSingle();
      if (!profile) throw new Error("Not found");

      let allowed = profile.school_id === schoolId;
      if (!allowed) {
        const { data: teachers } = await db.from("profiles").select("id").eq("school_id", schoolId);
        const teacherIds = ((teachers ?? []) as any[]).map((t) => t.id);
        const { data: classes } = teacherIds.length
          ? await db.from("classes").select("id").in("teacher_id", teacherIds)
          : { data: [] as any[] };
        const classIds = ((classes ?? []) as any[]).map((c) => c.id);
        if (classIds.length) {
          const { data: member } = await db
            .from("class_members")
            .select("class_id")
            .eq("student_id", data.userId)
            .in("class_id", classIds)
            .maybeSingle();
          allowed = Boolean(member);
        }
      }
      if (!allowed) throw new Error("Forbidden");

      const { data: rows } = await db
        .from("responses")
        .select("field_key, value")
        .eq("user_id", data.userId);

      return {
        name: profile.display_name ?? null,
        currentScreen: profile.current_screen ?? null,
        responses: ((rows ?? []) as any[]).map((r) => ({
          field_key: r.field_key as string,
          value: (r.value ?? null) as string | null,
        })),
      };
    },
  );
