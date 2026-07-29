// Admin-only server actions: list every user, and lock/unlock an account.
//
// Security model:
//  - Every call is authenticated via `requireSupabaseAuth` (verifies the
//    caller's Supabase JWT from the Authorization header).
//  - The caller's admin status is then re-checked *server-side* against the
//    `admins` table using the service-role client (never trust a client
//    flag). Non-admins get a plain "Forbidden" error.
//  - Locking a user does two things: (1) flips `profiles.locked` (shown in
//    the dashboard, also enforced client-side as a belt-and-suspenders
//    check), and (2) bans the account via the real Supabase Auth admin API
//    (`ban_duration`), which is what actually prevents the user from ever
//    logging in again. Unlocking reverses both.
//  - `supabaseAdmin` (the service-role client) is only ever imported
//    dynamically, inside the server-only `handler`, so the service role
//    key never ends up in the browser bundle.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminUserRow {
  id: string;
  displayName: string | null;
  email: string | null;
  role: "student" | "teacher";
  language: string | null;
  locked: boolean;
  isAdmin: boolean;
  createdAt: string | null;
}

async function assertCallerIsAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: adminRow } = await supabaseAdmin
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!adminRow) {
    throw new Error("Forbidden: admin only");
  }
  return supabaseAdmin;
}

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    const supabaseAdmin = await assertCallerIsAdmin(context.userId);

    const [{ data: profiles }, { data: roles }, { data: admins }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, language, locked, created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("admins").select("user_id"),
    ]);

    const roleByUser = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
    const adminSet = new Set((admins ?? []).map((a) => a.user_id));

    // GoTrue admin API is paginated; walk pages to build an id -> email map.
    const emailByUser = new Map<string, string | null>();
    let page = 1;
    const perPage = 200;
    for (let i = 0; i < 25; i++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error || !data) break;
      for (const u of data.users) emailByUser.set(u.id, u.email ?? null);
      if (data.users.length < perPage) break;
      page += 1;
    }

    const rows: AdminUserRow[] = (profiles ?? []).map((p) => ({
      id: p.id,
      displayName: p.display_name,
      email: emailByUser.get(p.id) ?? null,
      role: (roleByUser.get(p.id) as "student" | "teacher") ?? "student",
      language: p.language,
      locked: !!p.locked,
      isAdmin: adminSet.has(p.id),
      createdAt: p.created_at,
    }));

    rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return rows;
  });

export const adminSetLocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { userId: string; locked: boolean }) => data)
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const supabaseAdmin = await assertCallerIsAdmin(context.userId);

    if (data.userId === context.userId) {
      throw new Error("You cannot lock your own account");
    }

    const { data: targetIsAdmin } = await supabaseAdmin
      .from("admins")
      .select("user_id")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (targetIsAdmin) {
      throw new Error("Another admin cannot be locked");
    }

    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({ locked: data.locked })
      .eq("id", data.userId);
    if (profileErr) throw profileErr;

    const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.locked ? "876000h" : "none",
    });
    if (banErr) throw banErr;

    return { ok: true };
  });