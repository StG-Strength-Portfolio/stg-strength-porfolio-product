import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStaffCode } from "@/lib/staff-registration.functions";

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

/**
 * Legacy export name kept so existing Superadmin screens stay compatible.
 * It now creates the school's single reusable 28-day staff code.
 */
export async function createSchoolAdminInvitation(
  db: any,
  schoolId: string,
  createdBy: string,
): Promise<string> {
  const result = await createStaffCode(db, schoolId, createdBy);
  return result.code;
}

/** Current active staff code for each school. */
export const getCurrentSchoolAdminCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Record<string, string>> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data, error } = await db
      .from("school_codes")
      .select("school_id, code, created_at, expires_at")
      .eq("code_type", "staff")
      .eq("is_revoked", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const current: Record<string, string> = {};
    for (const row of data ?? []) {
      if (!current[row.school_id]) current[row.school_id] = row.code;
    }
    return current;
  });

/** Validate a staff code without consuming it. Kept under the legacy name for compatibility. */
export const validateSchoolAdminCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
    const db = await admin();
    const { data: invite, error } = await db
      .from("school_codes")
      .select("school_id, is_revoked, expires_at")
      .eq("code", code)
      .eq("code_type", "staff")
      .maybeSingle();

    if (
      error ||
      !invite ||
      invite.is_revoked ||
      !invite.expires_at ||
      new Date(invite.expires_at).getTime() <= Date.now()
    ) {
      return { valid: false as const };
    }

    const { data: school, error: schoolError } = await db
      .from("schools")
      .select("name, is_active")
      .eq("id", invite.school_id)
      .maybeSingle();
    if (schoolError || !school?.is_active) return { valid: false as const };
    return { valid: true as const, schoolName: school.name as string };
  });

/** Legacy export name: Superadmin regenerates the school's shared staff code. */
export const generateSecureSchoolAdminCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { schoolId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();

    const { data: school, error: schoolError } = await db
      .from("schools")
      .select("id, is_active")
      .eq("id", data.schoolId)
      .maybeSingle();
    if (schoolError) throw new Error(schoolError.message);
    if (!school?.id) throw new Error("School not found");
    if (!school.is_active) throw new Error("School is inactive");

    return createStaffCode(db, data.schoolId, context.userId);
  });
