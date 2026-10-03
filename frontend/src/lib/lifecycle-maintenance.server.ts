import { supabaseAdmin } from "@/integrations/supabase/client.server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type LifecycleMaintenanceResult = {
  usersPurged: number;
  classesPurged: boolean;
};

/**
 * Permanently remove soft-deleted user accounts after the 90-day restore
 * window and invoke the matching class cleanup. This uses Supabase Auth Admin
 * so the auth identity and its cascading product records are removed together.
 */
export async function purgeExpiredLifecycleData(now = new Date()): Promise<LifecycleMaintenanceResult> {
  const db = supabaseAdmin as any;
  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: profiles, error: profileError } = await db
    .from("profiles")
    .select("id, deleted_at")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff);
  if (profileError) throw new Error(profileError.message);

  let usersPurged = 0;
  for (const profile of (profiles ?? []) as Array<{ id: string; deleted_at: string }>) {
    const { error } = await db.auth.admin.deleteUser(profile.id);
    if (error) {
      console.error("[lifecycle-purge] user", profile.id, error.message);
      continue;
    }
    usersPurged += 1;
  }

  const { error: classError } = await db.rpc("cleanup_deleted_classes");
  if (classError) throw new Error(classError.message);

  return { usersPurged, classesPurged: true };
}
