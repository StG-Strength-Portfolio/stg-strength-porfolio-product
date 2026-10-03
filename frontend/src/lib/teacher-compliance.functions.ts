import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface TeacherManagedClass {
  id: string;
  name: string;
  ownerId: string;
}

export interface TeacherManagedStudent {
  id: string;
  name: string | null;
  email: string | null;
  classId: string;
  className: string;
}

export interface TeacherManagementData {
  classes: TeacherManagedClass[];
  students: TeacherManagedStudent[];
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const getTeacherManagementData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeacherManagementData> => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (role?.role !== "teacher") throw new Error("Forbidden");

    // RLS returns only classes where the caller is owner or assigned co-teacher.
    const { data: classes, error: classError } = await context.supabase
      .from("classes" as never)
      .select("id, name, teacher_id")
      .eq("is_deleted", false)
      .order("name", { ascending: true });
    if (classError) throw new Error(classError.message);

    const classRows = (classes ?? []) as unknown as Array<{
      id: string;
      name: string;
      teacher_id: string;
    }>;
    const classIds = classRows.map((cls) => cls.id);
    if (!classIds.length) return { classes: [], students: [] };

    const { data: memberships, error: memberError } = await context.supabase
      .from("class_members" as never)
      .select("class_id, student_id")
      .in("class_id", classIds as never);
    if (memberError) throw new Error(memberError.message);

    const memberRows = (memberships ?? []) as unknown as Array<{
      class_id: string;
      student_id: string;
    }>;
    const studentIds = [...new Set(memberRows.map((row) => row.student_id))];
    const db = await admin();

    const { data: profiles, error: profileError } = studentIds.length
      ? await db.from("profiles").select("id, display_name").in("id", studentIds)
      : { data: [] as any[], error: null };
    if (profileError) throw new Error(profileError.message);

    const emailOf = new Map<string, string>();
    const { data: authUsers, error: authError } = await db.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authError) throw new Error(authError.message);
    for (const user of authUsers?.users ?? []) {
      if (studentIds.includes(user.id)) emailOf.set(user.id, user.email ?? "");
    }

    const nameOf = new Map<string, string | null>(
      ((profiles ?? []) as Array<{ id: string; display_name: string | null }>).map((row) => [
        row.id,
        row.display_name,
      ]),
    );
    const classNameOf = new Map(classRows.map((cls) => [cls.id, cls.name]));

    return {
      classes: classRows.map((cls) => ({
        id: cls.id,
        name: cls.name,
        ownerId: cls.teacher_id,
      })),
      students: memberRows
        .map((row) => ({
          id: row.student_id,
          name: nameOf.get(row.student_id) ?? null,
          email: emailOf.get(row.student_id) || null,
          classId: row.class_id,
          className: classNameOf.get(row.class_id) ?? "",
        }))
        .sort((a, b) => (a.name ?? a.email ?? a.id).localeCompare(b.name ?? b.email ?? b.id)),
    };
  });
