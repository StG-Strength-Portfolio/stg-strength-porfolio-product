import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
 * Resolve a simple representative target for Superadmin role previews.
 * The last chosen IDs are remembered client-side for the browser session;
 * this server function only provides a safe default when no target is stored.
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
      .order("created_at", { ascending: false });
    if (schoolError) throw new Error(schoolError.message);

    const school = (schools ?? [])[0] as { id: string; name: string } | undefined;
    if (!school) {
      return { schoolId: null, schoolName: null, teacherId: null, teacherName: null };
    }

    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name")
      .eq("school_id", school.id);
    const ids = ((profiles ?? []) as Array<{ id: string }>).map((p) => p.id);

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
      if (teacherId) {
        teacherName =
          ((profiles ?? []) as Array<{ id: string; display_name: string | null }>).find(
            (p) => p.id === teacherId,
          )?.display_name ?? null;
      }
    }

    return {
      schoolId: school.id,
      schoolName: school.name,
      teacherId,
      teacherName,
    };
  });
