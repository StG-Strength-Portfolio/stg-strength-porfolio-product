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

function randomSchoolAdminCode(): string {
  // 20 hexadecimal characters = 80 bits of entropy, plus a role-specific prefix.
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase();
  return `ADMIN-${token}`;
}

export const validateSchoolAdminCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
    if (!/^ADMIN-[A-F0-9]{20}$/.test(code)) return { valid: false as const };

    const db = await admin();
    const { data: invite, error } = await db
      .from("school_codes")
      .select("school_id, is_used, is_revoked, schools!inner(name, is_active)")
      .eq("code", code)
      .eq("code_type", "school")
      .maybeSingle();

    if (error || !invite || invite.is_used || invite.is_revoked) {
      return { valid: false as const };
    }

    const school = Array.isArray(invite.schools) ? invite.schools[0] : invite.schools;
    if (!school?.is_active) return { valid: false as const };

    return { valid: true as const, schoolName: school.name as string };
  });

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

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomSchoolAdminCode();
      const { error } = await db.from("school_codes").insert({
        school_id: data.schoolId,
        code,
        code_type: "school",
        created_by_super_admin_id: context.userId,
        created_by: context.userId,
        is_used: false,
        is_revoked: false,
      });

      if (!error) return { code };
      if ((error as { code?: string }).code !== "23505") throw new Error(error.message);
    }

    throw new Error("Could not generate a unique school admin code");
  });
