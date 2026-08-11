import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ReceivedStrength } from "@/lib/give-strength.functions";
import {
  DEMO_SCHOOL_ID,
  DEMO_SCHOOL_NAME,
  DEMO_TEACHER_ID,
  demoTeacherName,
} from "@/lib/demo-store";

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
 * Superadmin demos always use a deterministic fictional school and teacher.
 * No customer school or teacher record is needed to enter demo mode.
 */
export const getRolePreviewTarget = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RolePreviewTarget> => {
    await assertSuperAdmin(context.supabase, context.userId);
    return {
      schoolId: DEMO_SCHOOL_ID,
      schoolName: DEMO_SCHOOL_NAME,
      teacherId: DEMO_TEACHER_ID,
      teacherName: demoTeacherName("en"),
    };
  });

export const getPreviewTeacherReceivedStrengths = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { teacherId: string }) => d)
  .handler(async ({ data, context }): Promise<ReceivedStrength[]> => {
    await assertSuperAdmin(context.supabase, context.userId);
    if (data.teacherId === DEMO_TEACHER_ID) {
      return [
        {
          id: "demo-teacher-strength-1",
          strengthId: 13,
          message: "You create a welcoming atmosphere for students.",
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          fromName: "Maya Rivera",
          fromRole: "student",
        },
        {
          id: "demo-teacher-strength-2",
          strengthId: 17,
          message: "Thank you for helping our team move forward together.",
          createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
          fromName: "Michael Anderson",
          fromRole: "school_admin",
        },
      ];
    }

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
    if (data.schoolId === DEMO_SCHOOL_ID) {
      return [
        { id: DEMO_TEACHER_ID, name: "Emma Johnson" },
        { id: "demo-teacher-2", name: "David Miller" },
        { id: "demo-teacher-3", name: "Olivia Brown" },
        { id: "demo-teacher-4", name: "James Wilson" },
        { id: "demo-teacher-5", name: "Sophia Martinez" },
        { id: "demo-teacher-6", name: "Daniel Lee" },
      ];
    }

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
