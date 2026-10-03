import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPERADMIN_SETUP_URL =
  "https://www.strengthportfolio.com/reset-password?source=superadmin";

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

export const inviteSuperAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; name?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const db = await admin();

    const email = data.email.trim().toLowerCase();
    const displayName = data.name?.trim() || email.split("@")[0];
    if (!email.includes("@")) throw new Error("Invalid email");

    const { data: usersPage, error: usersError } = await db.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersError) throw new Error(usersError.message);

    const existingUser = (usersPage?.users ?? []).find(
      (user: { email?: string | null }) => user.email?.toLowerCase() === email,
    );

    let userId: string;
    let emailKind: "invite" | "password-reset";

    if (existingUser) {
      userId = existingUser.id as string;
      emailKind = "password-reset";

      // A confirmed Supabase user cannot be invited again. Promote the
      // existing account and send a password-setup/reset email instead so the
      // person still receives a usable email from the Superadmin invitation UI.
      const { error: resetError } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: SUPERADMIN_SETUP_URL,
      });
      if (resetError) throw new Error(resetError.message);
    } else {
      const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
        redirectTo: SUPERADMIN_SETUP_URL,
        data: { display_name: displayName },
      });
      if (inviteError) throw new Error(inviteError.message);
      if (!invited.user?.id) throw new Error("Invitation user was not created");

      userId = invited.user.id as string;
      emailKind = "invite";
    }

    if (!existingUser || data.name?.trim()) {
      const { error: profileError } = await db.from("profiles").upsert(
        { id: userId, display_name: displayName },
        { onConflict: "id" },
      );
      if (profileError) throw new Error(profileError.message);
    }

    const { error: roleError } = await db
      .from("user_roles")
      .upsert({ user_id: userId, role: "super_admin" }, { onConflict: "user_id" });
    if (roleError) throw new Error(roleError.message);

    return { ok: true, userId, emailKind };
  });
