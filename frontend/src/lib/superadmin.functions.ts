import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SchoolRow = {
  id: string;
  name: string;
  code: string;
  language: string;
  is_active: boolean;
  created_at: string;
  billing_start_date: string | null;
  billing_expiry_date: string | null;
  teacherCount: number;
  studentCount: number;
  adminNames: string[];
  codes: string[];
};

export type SchoolUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  joined: string | null;
  lastActive: string | null;
  currentScreen: number | null;
};

export type SchoolCodeRow = {
  id: string;
  code: string;
  is_used: boolean;
  used_by: string | null;
  created_at: string;
};

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();

  // TEMPORARY DIAGNOSTIC — remove once the Forbidden issue is confirmed fixed.
  console.error(
    "[assertSuperAdmin][diag]",
    JSON.stringify({ userId, hasData: !!data, error: error ? error.message : null }),
  );

  if (error) throw new Error(`Forbidden: ${error.message}`);
  if (!data) throw new Error("Forbidden");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function emailMap(db: any): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of data?.users ?? []) map.set(u.id, u.email ?? "");
  return map;
}

function nextCode(existing: string[]): string {
  let max = 0;
  for (const c of existing) {
    const m = /^SCHOOL(\d+)$/.exec(c);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `SCHOOL${String(max + 1).padStart(3, "0")}`;
}

export const listSchools = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SchoolRow[]> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    await db.rpc("check_school_expiry");

    const { data: schools } = await db
      .from("schools")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: profiles } = await db.from("profiles").select("id, display_name, school_id");
    const { data: roles } = await db.from("user_roles").select("user_id, role");
    const { data: codes } = await db.from("school_codes").select("school_id, code");

    const roleOf = new Map<string, string>();
    for (const r of roles ?? []) roleOf.set(r.user_id, r.role);

    // Map class-joined students to their teacher's school so students without a
    // school_id on their profile still show up in the counts.
    const schoolOfProfile = new Map<string, string>();
    for (const p of (profiles ?? []) as any[])
      if (p.school_id) schoolOfProfile.set(p.id, p.school_id);

    const { data: classRows } = await db
      .from("classes")
      .select("id, teacher_id")
      .eq("is_deleted", false);
    const { data: memberRows } = await db.from("class_members").select("class_id, student_id");
    const schoolOfClass = new Map<string, string>();
    for (const c of (classRows ?? []) as any[]) {
      const sid = schoolOfProfile.get(c.teacher_id);
      if (sid) schoolOfClass.set(c.id, sid);
    }
    const extraStudents = new Map<string, Set<string>>();
    for (const m of (memberRows ?? []) as any[]) {
      const sid = schoolOfClass.get(m.class_id);
      if (!sid) continue;
      const set = extraStudents.get(sid) ?? new Set<string>();
      set.add(m.student_id);
      extraStudents.set(sid, set);
    }

    return (schools ?? []).map((s: any) => {
      const members = (profiles ?? []).filter((p: any) => p.school_id === s.id);
      const studentIds = new Set<string>(
        members.filter((p: any) => roleOf.get(p.id) === "student").map((p: any) => p.id),
      );
      for (const id of extraStudents.get(s.id) ?? []) {
        if ((roleOf.get(id) ?? "student") === "student") studentIds.add(id);
      }
      return {
        ...s,
        teacherCount: members.filter((p: any) => roleOf.get(p.id) === "teacher").length,
        studentCount: studentIds.size,
        adminNames: members
          .filter((p: any) => roleOf.get(p.id) === "school_admin")
          .map((p: any) => p.display_name ?? "—"),
        codes: (codes ?? []).filter((c: any) => c.school_id === s.id).map((c: any) => c.code),
      };
    });
  });

export const createSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; language: string; start: string; expiry: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: existing } = await db.from("schools").select("code");
    const code = nextCode(((existing ?? []) as any[]).map((r) => r.code));
    const { data: school, error } = await db
      .from("schools")
      .insert({
        name: data.name.trim(),
        code,
        language: data.language,
        is_active: true,
        billing_start_date: data.start,
        billing_expiry_date: data.expiry || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await db.from("school_codes").insert({
      school_id: school.id,
      code,
      created_by_super_admin_id: context.userId,
    });
    return { code, id: school.id as string };
  });

export const updateSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      name?: string;
      language?: string;
      start?: string;
      expiry?: string;
      isActive?: boolean;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.language !== undefined) patch.language = data.language;
    if (data.start !== undefined) patch.billing_start_date = data.start;
    if (data.expiry !== undefined) patch.billing_expiry_date = data.expiry || null;
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    const { error } = await db.from("schools").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renewSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; expiry: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db
      .from("schools")
      .update({ billing_expiry_date: data.expiry, is_active: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateSchoolCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { schoolId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: existing } = await db.from("school_codes").select("code");
    const { data: schoolCodes } = await db.from("schools").select("code");
    const code = nextCode([
      ...((existing ?? []) as any[]).map((r) => r.code),
      ...((schoolCodes ?? []) as any[]).map((r) => r.code),
    ]);
    const { error } = await db.from("school_codes").insert({
      school_id: data.schoolId,
      code,
      created_by_super_admin_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { code };
  });

export const revokeSchoolCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    await db.from("school_codes").delete().eq("id", data.id);
    return { ok: true };
  });

export const getSchoolDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { schoolId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: school } = await db.from("schools").select("*").eq("id", data.schoolId).single();
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name, current_screen, created_at, updated_at")
      .eq("school_id", data.schoolId);
    const { data: roles } = await db.from("user_roles").select("user_id, role");
    const { data: codeRows } = await db
      .from("school_codes")
      .select("id, code, is_used, used_by_admin_id, created_at")
      .eq("school_id", data.schoolId)
      .order("created_at", { ascending: false });

    const emails = await emailMap(db);
    const roleOf = new Map<string, string>();
    for (const r of roles ?? []) roleOf.set(r.user_id, r.role);

    // Students who joined through a class code have no school_id on their
    // profile — find them through the classes owned by this school's teachers.
    const allProfiles: any[] = [...((profiles ?? []) as any[])];
    const teacherIds = allProfiles
      .filter((p) => roleOf.get(p.id) === "teacher" || roleOf.get(p.id) === "school_admin")
      .map((p) => p.id);
    if (teacherIds.length) {
      const { data: classes } = await db
        .from("classes")
        .select("id")
        .eq("is_deleted", false)
        .in("teacher_id", teacherIds);
      const classIds = ((classes ?? []) as any[]).map((c) => c.id);
      if (classIds.length) {
        const { data: members } = await db
          .from("class_members")
          .select("student_id")
          .in("class_id", classIds);
        const known = new Set(allProfiles.map((p) => p.id));
        const missing = Array.from(
          new Set(((members ?? []) as any[]).map((m) => m.student_id as string)),
        ).filter((id) => !known.has(id));
        if (missing.length) {
          const { data: extra } = await db
            .from("profiles")
            .select("id, display_name, current_screen, created_at, updated_at")
            .in("id", missing);
          allProfiles.push(...((extra ?? []) as any[]));
        }
      }
    }

    const users: SchoolUser[] = allProfiles.map((p) => ({
      id: p.id,

      name: p.display_name,
      email: emails.get(p.id) ?? null,
      role: roleOf.get(p.id) ?? "student",
      joined: p.created_at,
      lastActive: p.updated_at,
      currentScreen: p.current_screen,
    }));

    const nameOf = new Map(users.map((u) => [u.id, u.name]));
    const codes: SchoolCodeRow[] = ((codeRows ?? []) as any[]).map((c) => ({
      id: c.id,
      code: c.code,
      is_used: c.is_used,
      used_by: c.used_by_admin_id ? (nameOf.get(c.used_by_admin_id) ?? null) : null,
      created_at: c.created_at,
    }));

    const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
    const totalScreens = 106;
    const students = users.filter((u) => u.role === "student");
    return {
      school,
      users,
      codes,
      metrics: {
        teachers: users.filter((u) => u.role === "teacher").length,
        students: students.length,
        admins: users.filter((u) => u.role === "school_admin").length,
        activeThisMonth: users.filter(
          (u) => u.lastActive && new Date(u.lastActive).getTime() > monthAgo,
        ).length,
        avgCompletion: students.length
          ? Math.round(
              (students.reduce((a, s) => a + (s.currentScreen ?? 1), 0) /
                (students.length * totalScreens)) *
                100,
            )
          : 0,
      },
    };
  });

export const updateUserCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; email?: string; password?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const patch: Record<string, unknown> = {};
    if (data.email) patch.email = data.email;
    if (data.password) patch.password = data.password;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await db.auth.admin.updateUserById(data.userId, patch);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "student" | "teacher" | "school_admin" }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { error } = await db
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type SuperAdminRow = {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string | null;
  isSelf: boolean;
};

export const listSuperAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SuperAdminRow[]> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: roles } = await db
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "super_admin");
    const emails = await emailMap(db);
    const ids = ((roles ?? []) as any[]).map((r) => r.user_id);
    const { data: profiles } = ids.length
      ? await db.from("profiles").select("id, display_name").in("id", ids)
      : { data: [] as any[] };
    const nameOf = new Map(((profiles ?? []) as any[]).map((p) => [p.id, p.display_name]));
    return ((roles ?? []) as any[]).map((r) => ({
      id: r.user_id,
      name: nameOf.get(r.user_id) ?? null,
      email: emails.get(r.user_id) ?? null,
      created_at: r.created_at ?? null,
      isSelf: r.user_id === context.userId,
    }));
  });

/** Invite a new super admin: creates the account if needed, then grants the role. */
export const inviteSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; name?: string; password?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();
    const email = data.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Invalid email");

    const emails = await emailMap(db);
    let userId: string | null = null;
    for (const [id, e] of emails) if (e.toLowerCase() === email) userId = id;

    if (!userId) {
      const { data: created, error } = await db.auth.admin.createUser({
        email,
        password: data.password || crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { display_name: data.name || email.split("@")[0] },
      });
      if (error) throw new Error(error.message);
      userId = created.user.id as string;
      await db
        .from("profiles")
        .upsert(
          { id: userId, display_name: data.name || email.split("@")[0] },
          { onConflict: "id" },
        );
    }

    const { error: roleErr } = await db
      .from("user_roles")
      .upsert({ user_id: userId, role: "super_admin" }, { onConflict: "user_id" });
    if (roleErr) throw new Error(roleErr.message);
    return { ok: true, userId };
  });

/** Demote another super admin back to teacher. Never allows self-removal. */
export const removeSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    if (data.userId === context.userId)
      throw new Error("You cannot remove your own super admin role");
    const db = await admin();
    const { count } = await db
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if ((count ?? 0) <= 1) throw new Error("At least one super admin is required");
    const { error } = await db
      .from("user_roles")
      .upsert({ user_id: data.userId, role: "teacher" }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });