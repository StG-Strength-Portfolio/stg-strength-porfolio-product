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

const STAFF_DOMAIN_LANGUAGE = {
  "vahvuusportfolio.fi": "fi",
  "strengthportfolio.com": "en",
  "styrkeportfolj.com": "sv",
} as const;

type StaffRegistrationDomain = keyof typeof STAFF_DOMAIN_LANGUAGE;
type StaffLanguage = (typeof STAFF_DOMAIN_LANGUAGE)[StaffRegistrationDomain];

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

function randomPendingToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeRegistrationDomain(value: string | null | undefined): StaffRegistrationDomain | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/^www\./, "");
  return normalized in STAFF_DOMAIN_LANGUAGE ? (normalized as StaffRegistrationDomain) : null;
}

function normalizeLanguage(value: string): StaffLanguage {
  return value === "sv" ? "sv" : value === "en" ? "en" : "fi";
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

/**
 * Validate onboarding details before Supabase creates an unconfirmed auth user.
 * The three production domains determine a staff user's initial language.
 * Unknown hosts (local/preview) may use the supplied UI language for testing.
 */
export const registerStaffAccount = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      name: string;
      email: string;
      password: string;
      code: string;
      language: string;
      registrationDomain?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const code = data.code.trim().toUpperCase();
    const registrationDomain = normalizeRegistrationDomain(data.registrationDomain);
    const registrationLanguage = registrationDomain
      ? STAFF_DOMAIN_LANGUAGE[registrationDomain]
      : normalizeLanguage(data.language);

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
      .select("id, name, is_active")
      .eq("id", codeRow.school_id)
      .maybeSingle();
    if (schoolError || !school?.id || !school.is_active) {
      return { ok: false as const, error: "school" as const };
    }

    const { data: existing } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if ((existing?.users ?? []).some((u: any) => (u.email ?? "").toLowerCase() === email)) {
      return { ok: false as const, error: "email_used" as const };
    }

    await db.from("pending_staff_registrations").delete().eq("email", email);

    const pendingToken = randomPendingToken();
    const tokenHash = await sha256(pendingToken);
    const { error: pendingError } = await db.from("pending_staff_registrations").insert({
      token_hash: tokenHash,
      email,
      display_name: name,
      school_id: school.id,
      language: registrationLanguage,
      registration_language: registrationLanguage,
      registration_domain: registrationDomain,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    });
    if (pendingError) throw new Error(pendingError.message);

    return {
      ok: true as const,
      pendingToken,
      schoolName: school.name as string,
      language: registrationLanguage,
      registrationDomain,
    };
  });

/**
 * Called from /confirm-staff after Supabase has verified the email and created
 * a real session. This is the only point where the teacher role and school are
 * granted. The staff profile language comes from the registration domain, not
 * from the school's classroom language setting.
 */
export const finalizeStaffRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: authData, error: authError } = await db.auth.admin.getUserById(context.userId);
    const user = authData?.user;
    if (authError || !user) throw new Error("Account not found");
    if (!user.email_confirmed_at) throw new Error("Email has not been confirmed");

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (metadata.registration_type !== "staff") throw new Error("Invalid staff registration");
    const pendingToken = typeof metadata.pending_staff_token === "string" ? metadata.pending_staff_token : "";
    if (!pendingToken) throw new Error("Staff registration could not be completed");

    const tokenHash = await sha256(pendingToken);
    const { data: pending, error: pendingError } = await db
      .from("pending_staff_registrations")
      .select("id, email, display_name, school_id, language, registration_language, registration_domain, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (pendingError || !pending) throw new Error("Staff registration link is invalid or already used");
    if (new Date(pending.expires_at).getTime() <= Date.now()) {
      await db.from("pending_staff_registrations").delete().eq("id", pending.id);
      throw new Error("Staff registration has expired. Please register again.");
    }
    if ((user.email ?? "").toLowerCase() !== String(pending.email).toLowerCase()) {
      throw new Error("Staff registration email does not match");
    }

    const { data: school, error: schoolError } = await db
      .from("schools")
      .select("id, name, is_active")
      .eq("id", pending.school_id)
      .maybeSingle();
    if (schoolError || !school?.id || !school.is_active) throw new Error("School is inactive");

    const language = normalizeLanguage(pending.registration_language ?? pending.language ?? "fi");
    const registrationDomain = normalizeRegistrationDomain(pending.registration_domain);

    const { error: profileError } = await db.from("profiles").upsert(
      {
        id: context.userId,
        display_name: pending.display_name,
        school_id: school.id,
        language,
        registration_language: language,
        registration_domain: registrationDomain,
      },
      { onConflict: "id" },
    );
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await db
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "teacher" }, { onConflict: "user_id" });
    if (roleError) throw new Error(roleError.message);

    await db.from("pending_staff_registrations").delete().eq("id", pending.id);
    await db.auth.admin.updateUserById(context.userId, {
      user_metadata: {
        display_name: pending.display_name,
        name: pending.display_name,
        registration_type: "staff",
        registration_language: language,
        registration_domain: registrationDomain,
      },
    });

    return {
      ok: true as const,
      schoolName: school.name as string,
      language,
      registrationDomain,
    };
  });
