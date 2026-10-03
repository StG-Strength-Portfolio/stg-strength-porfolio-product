import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const getFreeTrialAccessPolicy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: roleRow } = await db.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle();
    const role = roleRow?.role as string | undefined;

    if (role === "teacher" || role === "school_admin") {
      const { data: membership } = await db
        .from("free_trial_members")
        .select("trial_id")
        .eq("user_id", context.userId)
        .order("joined_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!membership) return { isTrialUser: false as const, studentBlocked: false as const };
      const { data: trial } = await db
        .from("free_trial_workspaces")
        .select("id, status, trial_ends_at, authorization_confirmed_at")
        .eq("id", membership.trial_id)
        .maybeSingle();
      if (!trial) return { isTrialUser: false as const, studentBlocked: false as const };
      return {
        isTrialUser: true as const,
        studentBlocked: false as const,
        trialId: trial.id as string,
        status: trial.status as string,
        trialEndsAt: trial.trial_ends_at as string,
        authorizationConfirmed: !!trial.authorization_confirmed_at,
      };
    }

    if (role === "student") {
      const { data: links } = await db.from("free_trial_students").select("trial_id").eq("user_id", context.userId);
      const trialIds = [...new Set((links ?? []).map((row: any) => row.trial_id))];
      if (!trialIds.length) return { isTrialUser: false as const, studentBlocked: false as const };
      const { data: trials } = await db.from("free_trial_workspaces").select("id, status, trial_ends_at").in("id", trialIds);
      const now = Date.now();
      const hasActive = (trials ?? []).some((trial: any) => trial.status === "active" && new Date(trial.trial_ends_at).getTime() > now);
      return {
        isTrialUser: false as const,
        studentBlocked: !hasActive,
        trialId: null,
      };
    }

    return { isTrialUser: false as const, studentBlocked: false as const };
  });
