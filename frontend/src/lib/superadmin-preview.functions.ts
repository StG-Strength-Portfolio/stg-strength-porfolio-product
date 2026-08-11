import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ReceivedStrength } from "@/lib/give-strength.functions";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
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

export interface RolePreviewTarget {
  schoolId: string | null;
  schoolName: string | null;
  teacherId: string | null;
  teacherName: string | null;
}

export const getRolePreviewTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mode: "teacher" | "principal" }) => d)
  .handler(async ({ data, context }): Promise<RolePreviewTarget> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();

    const { data: schools, error: schoolError } = await db
      .from("schools")
      .select("id, name, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (schoolError) throw new Error(schoolError.message);

    const schoolRows = (schools ?? []) as Array<{ id: string; name: string }>;
    const principalSchool = schoolRows[0];
    if (!principalSchool) {
      return { schoolId: null, schoolName: null, teacherId: null, teacherName: null };
    }

    if (data.mode === "principal") {
      return {
        schoolId: principalSchool.id,
        schoolName: principalSchool.name,
        teacherId: null,
        teacherName: null,
      };
    }

    const activeSchoolIds = new Set(schoolRows.map((s) => s.id));
    const { data: teacherRoles } = await db
      .from("user_roles")
      .select("user_id")
      .eq("role", "teacher");
    const teacherIds = ((teacherRoles ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);

    if (!teacherIds.length) {
      return {
        schoolId: principalSchool.id,
        schoolName: principalSchool.name,
        teacherId: null,
        teacherName: null,
      };
    }

    const { data: teacherProfiles } = await db
      .from("profiles")
      .select("id, display_name, school_id")
      .in("id", teacherIds);
    const teacher = (
      (teacherProfiles ?? []) as Array<{
        id: string;
        display_name: string | null;
        school_id: string | null;
      }>
    ).find((p) => p.school_id && activeSchoolIds.has(p.school_id));

    if (!teacher?.school_id) {
      return {
        schoolId: principalSchool.id,
        schoolName: principalSchool.name,
        teacherId: null,
        teacherName: null,
      };
    }

    const teacherSchool = schoolRows.find((s) => s.id === teacher.school_id) ?? principalSchool;
    return {
      schoolId: teacherSchool.id,
      schoolName: teacherSchool.name,
      teacherId: teacher.id,
      teacherName: teacher.display_name,
    };
  });

export const getPreviewTeacherReceivedStrengths = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { teacherId: string }) => d)
  .handler(async ({ data, context }): Promise<ReceivedStrength[]> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: role } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", data.teacherId)
      .maybeSingle();
    if (role?.role !== "teacher") throw new Error("Teacher not found");

    const { data: rows } = await db
      .from("teacher_assigned_strengths")
      .select("id, strength_id, message, created_at, from_user_id, from_role")
      .eq("to_user_id", data.teacherId)
      .eq("to_role", "teacher")
      .order("created_at", { ascending: false });
    const items = (rows ?? []) as Array<{
      id: string;
      strength_id: string;
      message: string | null;
      created_at: string;
      from_user_id: string;
      from_role: string;
    }>;
    const ids = [...new Set(items.map((r) => r.from_user_id))];
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: profiles } = await db.from("profiles").select("id, display_name").in("id", ids);
      for (const p of (profiles ?? []) as Array<{ id: string; display_name: string | null }>) {
        names.set(p.id, p.display_name ?? "—");
      }
    }
    return items.map((r) => ({
      id: r.id,
      strengthId: Number(r.strength_id),
      message: r.message,
      createdAt: r.created_at,
      fromName: names.get(r.from_user_id) ?? "—",
      fromRole: r.from_role,
    }));
  });

export const getPreviewSchoolTeachers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { schoolId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name")
      .eq("school_id", data.schoolId);
    const rows = (profiles ?? []) as Array<{ id: string; display_name: string | null }>;
    if (!rows.length) return [];
    const { data: roles } = await db
      .from("user_roles")
      .select("user_id")
      .eq("role", "teacher")
      .in("user_id", rows.map((r) => r.id));
    const ids = new Set(((roles ?? []) as Array<{ user_id: string }>).map((r) => r.user_id));
    return rows
      .filter((r) => ids.has(r.id))
      .map((r) => ({ id: r.id, name: r.display_name ?? "—" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
