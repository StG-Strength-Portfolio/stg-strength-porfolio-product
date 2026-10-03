import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
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

async function trial(db: any, id: string) {
  const { data, error } = await db.from("free_trial_workspaces").select("*").eq("id", id).single();
  if (error || !data) throw new Error("Trial not found");
  return data;
}

export const endFreeTrialForSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { trialId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const row = await trial(db, data.trialId);
    const now = new Date().toISOString();
    await db.from("free_trial_workspaces").update({ status: "ended", trial_ends_at: now, retention_ends_at: new Date(Date.now() + 90 * 86400000).toISOString(), updated_at: now }).eq("id", data.trialId);
    await db.from("schools").update({ is_active: false }).eq("id", row.school_id);
    await db.from("free_trial_events").insert({ trial_id: data.trialId, user_id: context.userId, event_name: "trial_ended_by_superadmin" });
    return { ok: true as const };
  });

export const extendFreeTrialRetentionForSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { trialId: string; days: number }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    if (!Number.isInteger(data.days) || data.days < 1 || data.days > 365) throw new Error("Invalid retention extension");
    const db = await admin();
    const row = await trial(db, data.trialId);
    const base = Math.max(Date.now(), new Date(row.retention_ends_at).getTime());
    const retentionEndsAt = new Date(base + data.days * 86400000).toISOString();
    await db.from("free_trial_workspaces").update({ retention_ends_at: retentionEndsAt, retention_extended_at: new Date().toISOString(), retention_extended_by: context.userId, updated_at: new Date().toISOString() }).eq("id", data.trialId);
    await db.from("free_trial_events").insert({ trial_id: data.trialId, user_id: context.userId, event_name: "retention_extended", event_properties: { days: data.days, retention_ends_at: retentionEndsAt } });
    return { ok: true as const, retentionEndsAt };
  });

export const migrateFreeTrialToPaidSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { trialId: string; paidSchoolId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const row = await trial(db, data.trialId);
    const { data: paidSchool } = await db.from("schools").select("id, account_kind, is_active").eq("id", data.paidSchoolId).maybeSingle();
    if (!paidSchool || paidSchool.account_kind === "trial") throw new Error("Choose a normal paid school");

    // Existing user IDs and class IDs remain unchanged. Moving staff profiles is
    // sufficient because classes are associated with their teachers and class
    // codes stay on the same class rows.
    const { data: trialProfiles, error: profileReadError } = await db.from("profiles").select("id").eq("school_id", row.school_id);
    if (profileReadError) throw new Error(profileReadError.message);
    const profileIds = (trialProfiles ?? []).map((p: any) => p.id);
    if (profileIds.length) {
      const { error } = await db.from("profiles").update({ school_id: data.paidSchoolId }).in("id", profileIds);
      if (error) throw new Error(error.message);
    }

    const now = new Date().toISOString();
    await db.from("free_trial_workspaces").update({ status: "converted", converted_school_id: data.paidSchoolId, converted_at: now, updated_at: now }).eq("id", data.trialId);
    await db.from("schools").update({ is_active: false }).eq("id", row.school_id);
    await db.from("free_trial_events").insert({ trial_id: data.trialId, user_id: context.userId, event_name: "trial_converted", event_properties: { paid_school_id: data.paidSchoolId } });
    return { ok: true as const };
  });

export const permanentlyDeleteFreeTrialForSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { trialId: string; confirmSchoolName: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const row = await trial(db, data.trialId);
    if (row.school_name !== data.confirmSchoolName.trim()) throw new Error("School name does not match");

    // Auth users are deliberately not deleted here because a trial user may
    // already belong to another paid workspace. Cascading deletion of the
    // temporary trial school removes trial-only workspace rows; user-account
    // deletion is handled by the existing account deletion/compliance flow.
    await db.from("schools").delete().eq("id", row.school_id);
    return { ok: true as const };
  });

export const resendFreeTrialVerificationForSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const email = data.email.trim().toLowerCase();
    const { error } = await db.auth.resend({ type: "signup", email, options: { emailRedirectTo: "/confirm-trial" } });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
