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

/**
 * Use the newest active school as the simple role-preview context. Teacher
 * preview uses a teacher from that same school so teacher and principal views
 * remain aligned to one remembered session context.
 */
export const getRolePreviewTarget = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RolePreviewTarget> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();

    const { data: schools, error: schoolError } = await db
      .from("schools")
      .select("id, name, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);
    if (schoolError) throw new Error(schoolError.message);

    const school = (schools ?? [])[0] as { id: string; name: string } | undefined;
    if (!school) {
      return { schoolId: null, schoolName: null, teacherId: null, teacherName: null };
    }

    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name")
      .eq("school_id", school.id);
    const profileRows = (profiles ?? []) as Array<{ id: string; display_name: string | null }>;
    const ids = profileRows.map((p) => p.id);

    let teacherId: string | null = null;
    let teacherName: string | null = null;
    if (ids.length) {
      const { data: roles } = await db
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher")
        .in("user_id", ids)
        .limit(1);
      teacherId = ((roles ?? []) as Array<{ user_id: string }>)[0]?.user_id ?? null;
      teacherName = teacherId
        ? profileRows.find((p) => p.id === teacherId)?.display_name ?? null
        : null;
    }

    return {
      schoolId: school.id,
      schoolName: school.name,
      teacherId,
      teacherName,
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
