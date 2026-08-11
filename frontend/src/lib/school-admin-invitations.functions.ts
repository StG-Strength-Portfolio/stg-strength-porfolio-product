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

function secureIndex(max: number): number {
  const limit = Math.floor(256 / max) * max;
  const byte = new Uint8Array(1);
  do {
    crypto.getRandomValues(byte);
  } while (byte[0] >= limit);
  return byte[0] % max;
}

function randomSchoolAdminCode(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += letters[secureIndex(letters.length)];
  for (let i = 0; i < 2; i++) code += digits[secureIndex(digits.length)];
  return code;
}

export const validateSchoolAdminCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
    if (!/^[A-Z]{6}[0-9]{2}$/.test(code)) return { valid: false as const };

    const db = await admin();
    const { data: invite, error } = await db
      .from("school_codes")
      .select("school_id, is_used, is_revoked")
      .eq("code", code)
      .eq("code_type", "school")
      .maybeSingle();

    if (error || !invite || invite.is_used || invite.is_revoked) {
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
