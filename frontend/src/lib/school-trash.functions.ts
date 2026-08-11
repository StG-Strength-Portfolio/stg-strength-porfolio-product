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

async function schoolUserIds(db: any, schoolId: string): Promise<string[]> {
  const { data: profiles } = await db.from("profiles").select("id").eq("school_id", schoolId);
  const ids = ((profiles ?? []) as Array<{ id: string }>).map((p) => p.id);
  if (!ids.length) return [];
  const { data: roles } = await db.from("user_roles").select("user_id,role").in("user_id", ids);
  const roleById = new Map(
    ((roles ?? []) as Array<{ user_id: string; role: string }>).map((r) => [r.user_id, r.role]),
  );
  // A Superadmin account must never be deleted or demoted merely because an
  // old profile row happens to reference a school.
  return ids.filter((id) => roleById.get(id) !== "super_admin");
}

async function purgeSchool(db: any, schoolId: string) {
  const userIds = await schoolUserIds(db, schoolId);

  if (userIds.length) {
    const { data: classRows } = await db.from("classes").select("id").in("teacher_id", userIds);
    const classIds = ((classRows ?? []) as Array<{ id: string }>).map((c) => c.id);
    if (classIds.length) {
      await db.from("class_members").delete().in("class_id", classIds);
      await db.from("classes").delete().in("id", classIds);
    }
  }

  await db.from("school_deleted_roles").delete().eq("school_id", schoolId);
  await db.from("school_codes").delete().eq("school_id", schoolId);

  // After the 90-day recovery window, accounts attached exclusively to this
  // school are permanently removed together with their profile-owned data.
  for (const userId of userIds) {
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
  }

  // Any protected Superadmin profile that referenced this school is detached
  // so the school row can be deleted without violating the foreign key.
  await db.from("profiles").update({ school_id: null }).eq("school_id", schoolId);

  const { error: schoolError } = await db.from("schools").delete().eq("id", schoolId);
  if (schoolError) throw new Error(schoolError.message);
}

export const trashSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { schoolId: string; confirmName: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: school, error: schoolError } = await db
      .from("schools")
      .select("id,name,deleted_at")
      .eq("id", data.schoolId)
      .maybeSingle();
    if (schoolError) throw new Error(schoolError.message);
    if (!school) throw new Error("School not found");
    if (school.name !== data.confirmName.trim()) throw new Error("School name does not match");
    if (school.deleted_at) return { ok: true };

    const userIds = await schoolUserIds(db, data.schoolId);
    if (userIds.length) {
      const { data: roles } = await db.from("user_roles").select("user_id,role").in("user_id", userIds);
      if ((roles ?? []).length) {
        await db.from("school_deleted_roles").upsert(
          (roles ?? []).map((r: { user_id: string; role: string }) => ({
            school_id: data.schoolId,
            user_id: r.user_id,
            role: r.role,
            captured_at: new Date().toISOString(),
          })),
          { onConflict: "school_id,user_id" },
        );
      }
      // Suspend all school-bound accounts during the recovery window without
      // deleting them, so restoring the school can restore the original roles.
      await db.from("user_roles").update({ role: "student" }).in("user_id", userIds);
    }

    const now = new Date().toISOString();
    if (userIds.length) {
      await db
        .from("classes")
        .update({ is_deleted: true, deleted_at: now, school_deleted_at: now })
        .in("teacher_id", userIds);
    }

    const { error } = await db
      .from("schools")
      .update({ is_active: false, deleted_at: now, deleted_by: context.userId })
      .eq("id", data.schoolId);
    if (error) throw new Error(error.message);
    return { ok: true, restoreUntil: new Date(Date.now() + 90 * 86400000).toISOString() };
  });

export const restoreSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { schoolId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: school, error: schoolError } = await db
      .from("schools")
      .select("id,deleted_at,billing_expiry_date")
      .eq("id", data.schoolId)
      .maybeSingle();
    if (schoolError) throw new Error(schoolError.message);
    if (!school?.deleted_at) throw new Error("School is not in trash");
    const deletedAt = new Date(school.deleted_at).getTime();
    if (Date.now() - deletedAt > 90 * 86400000) throw new Error("Restore period has expired");

    const { data: savedRoles } = await db
      .from("school_deleted_roles")
      .select("user_id,role")
      .eq("school_id", data.schoolId);
    for (const row of (savedRoles ?? []) as Array<{ user_id: string; role: string }>) {
      await db
        .from("user_roles")
        .upsert({ user_id: row.user_id, role: row.role }, { onConflict: "user_id" });
    }

    const userIds = ((savedRoles ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
    if (userIds.length) {
      await db
        .from("classes")
        .update({ is_deleted: false, deleted_at: null, school_deleted_at: null })
        .in("teacher_id", userIds)
        .not("school_deleted_at", "is", null);
    }

    const stillCurrent =
      !school.billing_expiry_date || new Date(school.billing_expiry_date).getTime() >= Date.now();
    const { error } = await db
      .from("schools")
      .update({ is_active: stillCurrent, deleted_at: null, deleted_by: null })
      .eq("id", data.schoolId);
    if (error) throw new Error(error.message);
    await db.from("school_deleted_roles").delete().eq("school_id", data.schoolId);
    return { ok: true };
  });

export const purgeExpiredSchools = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data: expired, error } = await db
      .from("schools")
      .select("id")
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff);
    if (error) throw new Error(error.message);
    for (const row of (expired ?? []) as Array<{ id: string }>) await purgeSchool(db, row.id);
    return { purged: (expired ?? []).length };
  });
