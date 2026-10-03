import { createServerFn } from "@tanstack/react-start";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const checkDemoSprintPasscode = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string }) => d)
  .handler(async ({ data }) => {
    const passcode = data.passcode.trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(passcode)) return { ok: false as const };
    const db = await admin();
    await db.from("demo_sprint_sessions").delete().lt("purge_at", new Date().toISOString());
    const { data: session } = await db
      .from("demo_sprint_sessions")
      .select("id, status, join_locked")
      .eq("passcode", passcode)
      .gt("purge_at", new Date().toISOString())
      .maybeSingle();
    return {
      ok: !!session && session.status === "waiting" && !session.join_locked,
    };
  });
