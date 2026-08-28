import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isStrongStaffPassword, isWorkEmail } from "@/lib/staff-registration.functions";

const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TRIAL_DAYS = 30;
const REFERRAL_DAYS = 30;
const RETENTION_DAYS_AFTER_EXPIRY = 90;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

function randomBytesHex(size: number): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function secureIndex(max: number): number {
  const limit = Math.floor(256 / max) * max;
  const byte = new Uint8Array(1);
  do crypto.getRandomValues(byte); while (byte[0] >= limit);
  return byte[0] % max;
}

function randomCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) code += REFERRAL_ALPHABET[secureIndex(REFERRAL_ALPHABET.length)];
  return code;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeLanguage(value: string): "fi" | "en" | "sv" {
  return value === "sv" ? "sv" : value === "en" ? "en" : "fi";
}

function plusDays(value: Date, days: number): string {
  return new Date(value.getTime() + days * 86_400_000).toISOString();
}

async function uniqueReferralCode(db: any): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = randomCode(6);
    const { data } = await db
      .from("free_trial_workspaces")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("Could not generate a unique referral code");
}

async function uniqueTrialSchoolCode(db: any): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = `TRIAL-${randomCode(8)}`;
    const { data } = await db.from("schools").select("id").eq("code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Could not generate a unique trial school code");
}

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export type FreeTrialRegistrationInput = {
  name: string;
  email: string;
  password: string;
  schoolName: string;
  city: string;
  country: string;
  role: "teacher" | "school_admin";
  language: string;
  referralCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  marketingConsent?: boolean;
};

export const registerFreeTrial = createServerFn({ method: "POST" })
  .inputValidator((d: FreeTrialRegistrationInput) => d)
  .handler(async ({ data }) => {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const schoolName = data.schoolName.trim();
    const city = data.city.trim();
    const country = data.country.trim();
    const language = normalizeLanguage(data.language);
    const referralCode = data.referralCode?.trim().toUpperCase() || null;

    if (!name || !schoolName || !city || !country) return { ok: false as const, error: "required" as const };
    if (!isWorkEmail(email)) return { ok: false as const, error: "work_email" as const };
    if (!isStrongStaffPassword(data.password)) return { ok: false as const, error: "password" as const };
    if (data.role !== "teacher" && data.role !== "school_admin") return { ok: false as const, error: "role" as const };

    const db = await admin();
    const { data: existing } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if ((existing?.users ?? []).some((u: any) => (u.email ?? "").toLowerCase() === email)) {
      return { ok: false as const, error: "email_used" as const };
    }

    if (referralCode) {
      const { data: referrer } = await db
        .from("free_trial_workspaces")
        .select("id, creator_user_id, creator_role, status, trial_ends_at")
        .eq("referral_code", referralCode)
        .maybeSingle();
      if (!referrer || referrer.creator_role !== "teacher" || referrer.status !== "active" || new Date(referrer.trial_ends_at).getTime() <= Date.now()) {
        return { ok: false as const, error: "referral" as const };
      }
    }

    await db.from("pending_free_trial_registrations").delete().eq("email", email);
    const pendingToken = randomBytesHex(32);
    const tokenHash = await sha256(pendingToken);
    const { error } = await db.from("pending_free_trial_registrations").insert({
      token_hash: tokenHash,
      email,
      display_name: name,
      school_name: schoolName,
      city,
      country,
      requested_role: data.role,
      language,
      referral_code: referralCode,
      utm_source: data.utmSource?.slice(0, 200) || null,
      utm_medium: data.utmMedium?.slice(0, 200) || null,
      utm_campaign: data.utmCampaign?.slice(0, 200) || null,
      utm_content: data.utmContent?.slice(0, 200) || null,
      utm_term: data.utmTerm?.slice(0, 200) || null,
      marketing_consent: !!data.marketingConsent,
      expires_at: plusDays(new Date(), 2),
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, pendingToken };
  });

export const finalizeFreeTrialRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: authData, error: authError } = await db.auth.admin.getUserById(context.userId);
    const user = authData?.user;
    if (authError || !user) throw new Error("Account not found");
    if (!user.email_confirmed_at) throw new Error("Email has not been confirmed");

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (metadata.registration_type !== "free_trial") throw new Error("Invalid free trial registration");
    const pendingToken = typeof metadata.pending_trial_token === "string" ? metadata.pending_trial_token : "";
    if (!pendingToken) throw new Error("Trial registration could not be completed");

    const tokenHash = await sha256(pendingToken);
    const { data: pending } = await db
      .from("pending_free_trial_registrations")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!pending) throw new Error("Trial registration link is invalid or already used");
    if (new Date(pending.expires_at).getTime() <= Date.now()) throw new Error("Trial registration has expired");
    if ((user.email ?? "").toLowerCase() !== String(pending.email).toLowerCase()) throw new Error("Trial registration email does not match");

    const startedAt = new Date();
    const initialDays = pending.referral_code ? TRIAL_DAYS + REFERRAL_DAYS : TRIAL_DAYS;
    const trialEndsAt = plusDays(startedAt, initialDays);
    const retentionEndsAt = plusDays(new Date(trialEndsAt), RETENTION_DAYS_AFTER_EXPIRY);
    const schoolCode = await uniqueTrialSchoolCode(db);

    const { data: school, error: schoolError } = await db
      .from("schools")
      .insert({
        name: pending.school_name,
        code: schoolCode,
        language: pending.language,
        is_active: true,
        billing_start_date: startedAt.toISOString(),
        billing_expiry_date: trialEndsAt,
        account_kind: "trial",
      })
      .select("id, name")
      .single();
    if (schoolError) throw new Error(schoolError.message);

    const referralCode = pending.requested_role === "teacher" ? await uniqueReferralCode(db) : null;
    const { data: trial, error: trialError } = await db
      .from("free_trial_workspaces")
      .insert({
        school_id: school.id,
        creator_user_id: context.userId,
        creator_role: pending.requested_role,
        school_name: pending.school_name,
        city: pending.city,
        country: pending.country,
        language: pending.language,
        trial_started_at: startedAt.toISOString(),
        trial_ends_at: trialEndsAt,
        retention_ends_at: retentionEndsAt,
        referral_code: referralCode,
        referred_by_code: pending.referral_code,
        referral_bonus_days: pending.referral_code ? REFERRAL_DAYS : 0,
        utm_source: pending.utm_source,
        utm_medium: pending.utm_medium,
        utm_campaign: pending.utm_campaign,
        utm_content: pending.utm_content,
        utm_term: pending.utm_term,
        marketing_consent: pending.marketing_consent,
      })
      .select("id, trial_ends_at, referral_code")
      .single();
    if (trialError) throw new Error(trialError.message);

    const { error: profileError } = await db.from("profiles").upsert(
      {
        id: context.userId,
        display_name: pending.display_name,
        school_id: school.id,
        language: pending.language,
      },
      { onConflict: "id" },
    );
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await db
      .from("user_roles")
      .upsert({ user_id: context.userId, role: pending.requested_role }, { onConflict: "user_id" });
    if (roleError) throw new Error(roleError.message);

    await db.from("free_trial_members").insert({
      trial_id: trial.id,
      user_id: context.userId,
      role: pending.requested_role,
      membership_kind: "creator",
    });
    await db.from("free_trial_events").insert({
      trial_id: trial.id,
      user_id: context.userId,
      event_name: "trial_registered",
      event_properties: { role: pending.requested_role, initial_days: initialDays },
    });
    await db.from("pending_free_trial_registrations").delete().eq("id", pending.id);
    await db.auth.admin.updateUserById(context.userId, {
      user_metadata: {
        display_name: pending.display_name,
        name: pending.display_name,
        registration_type: "free_trial",
        trial_id: trial.id,
      },
    });

    return {
      ok: true as const,
      role: pending.requested_role as "teacher" | "school_admin",
      language: pending.language as "fi" | "en" | "sv",
      trialId: trial.id as string,
      trialEndsAt: trial.trial_ends_at as string,
      referralCode: trial.referral_code as string | null,
    };
  });

async function trialForUser(db: any, userId: string) {
  const { data: membership } = await db
    .from("free_trial_members")
    .select("trial_id, role, membership_kind")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!membership) return null;
  const { data: trial } = await db.from("free_trial_workspaces").select("*").eq("id", membership.trial_id).maybeSingle();
  return trial ? { ...trial, memberRole: membership.role, membershipKind: membership.membership_kind } : null;
}

async function scoreTrial(db: any, trialId: string) {
  const { data: events } = await db.from("free_trial_events").select("event_name, created_at").eq("trial_id", trialId);
  const names = new Set((events ?? []).map((e: any) => e.event_name));
  const activeDays = new Set((events ?? []).map((e: any) => String(e.created_at).slice(0, 10))).size;
  let score = Math.min(25, activeDays * 5);
  if (names.has("class_created")) score += 15;
  if (names.has("student_joined")) score += 10;
  if (names.has("module_opened")) score += 8;
  if (names.has("activity_opened")) score += 7;
  if (names.has("activity_completed")) score += 10;
  if (names.has("teacher_invited")) score += 8;
  if (names.has("referral_rewarded")) score += 8;
  if (names.has("pricing_clicked") || names.has("contact_requested") || names.has("meeting_requested")) score += 20;
  score = Math.min(100, score);
  const category = score >= 70 ? "high" : score >= 35 ? "medium" : "low";
  await db.from("free_trial_workspaces").update({ engagement_score: score, engagement_category: category, updated_at: new Date().toISOString() }).eq("id", trialId);
  return { score, category };
}

export const markFreeTrialEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    await db.rpc("process_free_trial_lifecycle");
    const trial = await trialForUser(db, context.userId);
    if (!trial) return { isTrial: false as const };

    const now = new Date().toISOString();
    const nextLoginCount = Number(trial.login_count ?? 0) + 1;
    await db.from("free_trial_workspaces").update({ login_count: nextLoginCount, last_active_at: now, updated_at: now }).eq("id", trial.id);
    await db.from("free_trial_events").insert({ trial_id: trial.id, user_id: context.userId, event_name: "login", event_properties: { login_count: nextLoginCount } });

    // Referral is rewarded only after the referred teacher has verified email and actually enters the product.
    if (trial.referred_by_code) {
      const { data: existingReward } = await db.from("free_trial_referrals").select("id").eq("referred_user_id", context.userId).maybeSingle();
      if (!existingReward) {
        const { data: referrer } = await db
          .from("free_trial_workspaces")
          .select("id, creator_user_id, trial_ends_at, status")
          .eq("referral_code", trial.referred_by_code)
          .maybeSingle();
        if (referrer && referrer.creator_user_id !== context.userId && referrer.status === "active") {
          const newReferrerEnd = plusDays(new Date(referrer.trial_ends_at), REFERRAL_DAYS);
          await db.from("free_trial_workspaces").update({
            trial_ends_at: newReferrerEnd,
            retention_ends_at: plusDays(new Date(newReferrerEnd), RETENTION_DAYS_AFTER_EXPIRY),
            referral_bonus_days: Number((await db.from("free_trial_workspaces").select("referral_bonus_days").eq("id", referrer.id).single()).data?.referral_bonus_days ?? 0) + REFERRAL_DAYS,
            updated_at: now,
          }).eq("id", referrer.id);
          await db.from("free_trial_referrals").insert({
            referrer_trial_id: referrer.id,
            referred_trial_id: trial.id,
            referred_user_id: context.userId,
            referral_code: trial.referred_by_code,
          });
          await db.from("free_trial_events").insert([
            { trial_id: referrer.id, user_id: referrer.creator_user_id, event_name: "referral_rewarded", event_properties: { days: REFERRAL_DAYS, referred_trial_id: trial.id } },
            { trial_id: trial.id, user_id: context.userId, event_name: "referral_activated", event_properties: { days: REFERRAL_DAYS } },
          ]);
        }
      }
    }

    const engagement = await scoreTrial(db, trial.id);
    const end = new Date(trial.trial_ends_at);
    const daysLeft = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
    return {
      isTrial: true as const,
      trialId: trial.id as string,
      status: trial.status as string,
      role: trial.memberRole as string,
      creatorRole: trial.creator_role as string,
      referralCode: trial.referral_code as string | null,
      referralBonusDays: Number(trial.referral_bonus_days ?? 0),
      daysLeft,
      trialEndsAt: trial.trial_ends_at as string,
      loginCount: nextLoginCount,
      thirdLoginIntent: trial.third_login_intent as string | null,
      engagementScore: engagement.score,
      engagementCategory: engagement.category,
      authorizationConfirmed: !!trial.authorization_confirmed_at,
    };
  });

export const recordFreeTrialEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventName: string; properties?: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    const allowed = new Set([
      "module_opened", "activity_opened", "activity_completed", "class_created", "student_joined",
      "teacher_invited", "pricing_clicked", "contact_requested", "meeting_requested", "referral_link_copied",
    ]);
    if (!allowed.has(data.eventName)) throw new Error("Unsupported trial event");
    const db = await admin();
    const trial = await trialForUser(db, context.userId);
    if (!trial) return { ok: false as const };
    await db.from("free_trial_events").insert({ trial_id: trial.id, user_id: context.userId, event_name: data.eventName, event_properties: data.properties ?? {} });
    const engagement = await scoreTrial(db, trial.id);
    return { ok: true as const, ...engagement };
  });

export const saveFreeTrialIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { intent: string }) => d)
  .handler(async ({ data, context }) => {
    const allowed = new Set(["students", "evaluate_school", "explore", "recommend_leadership", "other"]);
    if (!allowed.has(data.intent)) throw new Error("Invalid intent");
    const db = await admin();
    const trial = await trialForUser(db, context.userId);
    if (!trial) throw new Error("Trial not found");
    await db.from("free_trial_workspaces").update({ third_login_intent: data.intent, updated_at: new Date().toISOString() }).eq("id", trial.id);
    await db.from("free_trial_events").insert({ trial_id: trial.id, user_id: context.userId, event_name: "intent_answered", event_properties: { intent: data.intent } });
    return { ok: true as const };
  });

export const confirmFreeTrialAuthorization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const trial = await trialForUser(db, context.userId);
    if (!trial) throw new Error("Trial not found");
    const at = new Date().toISOString();
    await db.from("free_trial_workspaces").update({ authorization_confirmed_at: at, updated_at: at }).eq("id", trial.id);
    await db.from("free_trial_events").insert({ trial_id: trial.id, user_id: context.userId, event_name: "school_authorization_confirmed" });
    return { ok: true as const };
  });

export type FreeTrialAdminRow = {
  id: string;
  schoolName: string;
  contactName: string;
  email: string;
  role: string;
  city: string;
  country: string;
  language: string;
  status: string;
  registeredAt: string;
  trialEndsAt: string;
  daysLeft: number;
  referralBonusDays: number;
  engagementScore: number;
  engagementCategory: string;
  loginCount: number;
  lastActiveAt: string | null;
  referralCode: string | null;
  successfulReferrals: number;
  classCount: number;
  studentCount: number;
  utmSource: string | null;
  utmCampaign: string | null;
  convertedSchoolId: string | null;
};

export const listFreeTrialsForSuperAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FreeTrialAdminRow[]> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    await db.rpc("process_free_trial_lifecycle");
    const { data: trials } = await db.from("free_trial_workspaces").select("*").order("trial_ends_at", { ascending: true });
    const { data: profiles } = await db.from("profiles").select("id, display_name, school_id");
    const { data: classes } = await db.from("classes").select("id, teacher_id");
    const { data: members } = await db.from("class_members").select("class_id, student_id");
    const { data: referrals } = await db.from("free_trial_referrals").select("referrer_trial_id");
    const emails = new Map<string, string>();
    const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of users?.users ?? []) emails.set(u.id, u.email ?? "");

    return (trials ?? []).map((t: any) => {
      const creator = (profiles ?? []).find((p: any) => p.id === t.creator_user_id);
      const teacherIds = new Set((profiles ?? []).filter((p: any) => p.school_id === t.school_id).map((p: any) => p.id));
      const trialClasses = (classes ?? []).filter((c: any) => teacherIds.has(c.teacher_id));
      const classIds = new Set(trialClasses.map((c: any) => c.id));
      const studentCount = new Set((members ?? []).filter((m: any) => classIds.has(m.class_id)).map((m: any) => m.student_id)).size;
      return {
        id: t.id,
        schoolName: t.school_name,
        contactName: creator?.display_name ?? "—",
        email: emails.get(t.creator_user_id) ?? "",
        role: t.creator_role,
        city: t.city,
        country: t.country,
        language: t.language,
        status: t.status,
        registeredAt: t.registered_at,
        trialEndsAt: t.trial_ends_at,
        daysLeft: Math.max(0, Math.ceil((new Date(t.trial_ends_at).getTime() - Date.now()) / 86_400_000)),
        referralBonusDays: Number(t.referral_bonus_days ?? 0),
        engagementScore: Number(t.engagement_score ?? 0),
        engagementCategory: t.engagement_category,
        loginCount: Number(t.login_count ?? 0),
        lastActiveAt: t.last_active_at,
        referralCode: t.referral_code,
        successfulReferrals: (referrals ?? []).filter((r: any) => r.referrer_trial_id === t.id).length,
        classCount: trialClasses.length,
        studentCount,
        utmSource: t.utm_source,
        utmCampaign: t.utm_campaign,
        convertedSchoolId: t.converted_school_id,
      };
    });
  });

export const listFreeTrialTimelineForSuperAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { trialId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: events, error } = await db.from("free_trial_events").select("id, event_name, event_properties, created_at").eq("trial_id", data.trialId).order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return events ?? [];
  });

export const extendFreeTrialForSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { trialId: string; days: number }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    if (!Number.isInteger(data.days) || data.days < 1 || data.days > 365) throw new Error("Invalid extension");
    const db = await admin();
    const { data: trial } = await db.from("free_trial_workspaces").select("trial_ends_at, referral_bonus_days, school_id").eq("id", data.trialId).single();
    const newEnd = plusDays(new Date(trial.trial_ends_at), data.days);
    await db.from("free_trial_workspaces").update({ status: "active", trial_ends_at: newEnd, retention_ends_at: plusDays(new Date(newEnd), RETENTION_DAYS_AFTER_EXPIRY), updated_at: new Date().toISOString() }).eq("id", data.trialId);
    await db.from("schools").update({ is_active: true, billing_expiry_date: newEnd }).eq("id", trial.school_id);
    await db.from("free_trial_events").insert({ trial_id: data.trialId, user_id: context.userId, event_name: "trial_extended_by_superadmin", event_properties: { days: data.days } });
    return { ok: true as const, trialEndsAt: newEnd };
  });
