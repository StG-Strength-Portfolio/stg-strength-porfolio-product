import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STAFF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
]);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

function secureIndex(max: number): number {
  const limit = Math.floor(256 / max) * max;
  const byte = new Uint8Array(1);
  do {
    crypto.getRandomValues(byte);
  } while (byte[0] >= limit);
  return byte[0] % max;
}

function randomStaffCode(): string {
  for (;;) {
    let code = "";
    for (let i = 0; i < 8; i++) code += STAFF_ALPHABET[secureIndex(STAFF_ALPHABET.length)];
    if (/[A-Z]/.test(code) && /[0-9]/.test(code)) return code;
  }
}

export function isStrongStaffPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function isWorkEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1] || !parts[1].includes(".")) return false;
  return !PERSONAL_EMAIL_DOMAINS.has(parts[1]);
}

export async function createStaffCode(
  db: any,
  schoolId: string,
  createdBy?: string | null,
): Promise<{ code: string; expiresAt: string }> {
  const { error: revokeError } = await db
    .from("school_codes")
    .update({ is_revoked: true })
    .eq("school_id", schoolId)
    .eq("code_type", "staff")
    .eq("is_revoked", false);
  if (revokeError) throw new Error(revokeError.message);

  const expiresAt = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString();
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomStaffCode();
    const { error } = await db.from("school_codes").insert({
      school_id: schoolId,
      code,
      code_type: "staff",
      created_by_super_admin_id: createdBy ?? null,
      created_by: createdBy ?? null,
      is_used: false,
      is_revoked: false,
      expires_at: expiresAt,
    });
    if (!error) return { code, expiresAt };
    if ((error as { code?: string }).code !== "23505") throw new Error(error.message);
  }
  throw new Error("Could not generate a unique staff code");
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

async function schoolForSchoolAdmin(supabase: any, userId: string): Promise<string> {
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

export const generateStaffCodeForSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { schoolId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: school, error } = await db
      .from("schools")
      .select("id, is_active")
      .eq("id", data.schoolId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!school?.id) throw new Error("School not found");
    if (!school.is_active) throw new Error("School is inactive");
    return createStaffCode(db, data.schoolId, context.userId);
  });

export const generateStaffCodeForSchoolAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const schoolId = await schoolForSchoolAdmin(context.supabase, context.userId);
    const db = await admin();
    return createStaffCode(db, schoolId, context.userId);
  });

export const registerStaffAccount = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { name: string; email: string; password: string; code: string; language: string }) => d,
  )
  .handler(async ({ data }) => {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const code = data.code.trim().toUpperCase();
    const language = data.language === "sv" ? "sv" : data.language === "en" ? "en" : "fi";

    if (!name) return { ok: false as const, error: "name" as const };
    if (!isWorkEmail(email)) return { ok: false as const, error: "work_email" as const };
    if (!isStrongStaffPassword(data.password)) {
      return { ok: false as const, error: "password" as const };
    }
    if (!/^[A-Z2-9]{8}$/.test(code) || /[IO01]/.test(code)) {
      return { ok: false as const, error: "code" as const };
    }

    const db = await admin();
    const { data: codeRow, error: codeError } = await db
      .from("school_codes")
      .select("school_id, expires_at")
      .eq("code", code)
      .eq("code_type", "staff")
      .eq("is_revoked", false)
      .maybeSingle();
    if (codeError || !codeRow?.school_id || !codeRow.expires_at) {
      return { ok: false as const, error: "code" as const };
    }
    if (new Date(codeRow.expires_at).getTime() <= Date.now()) {
      return { ok: false as const, error: "expired" as const };
    }

    const { data: school, error: schoolError } = await db
      .from("schools")
      .select("id, name, language, is_active")
      .eq("id", codeRow.school_id)
      .maybeSingle();
    if (schoolError || !school?.id || !school.is_active) {
      return { ok: false as const, error: "school" as const };
    }

    const { data: existing } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if ((existing?.users ?? []).some((u: any) => (u.email ?? "").toLowerCase() === email)) {
      return { ok: false as const, error: "email_used" as const };
    }

    const { data: created, error: createError } = await db.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: name, name, role: "teacher" },
    });
    if (createError || !created?.user?.id) {
      throw new Error(createError?.message ?? "Could not create account");
    }

    const userId = created.user.id as string;
    try {
      const { error: profileError } = await db.from("profiles").upsert(
        {
          id: userId,
          display_name: name,
          school_id: school.id,
          language: school.language ?? language,
        },
        { onConflict: "id" },
      );
      if (profileError) throw new Error(profileError.message);

      const { error: roleError } = await db
        .from("user_roles")
        .upsert({ user_id: userId, role: "teacher" }, { onConflict: "user_id" });
      if (roleError) throw new Error(roleError.message);
    } catch (error) {
      await db.auth.admin.deleteUser(userId);
      throw error;
    }

    return {
      ok: true as const,
      schoolName: school.name as string,
      language: (school.language ?? language) as string,
    };
  });
