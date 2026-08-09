import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description:
    "Return the signed-in user's id, email, display name and role (student or teacher) in the Huomaa Hyvä workbook.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const [profile, roles] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, current_screen")
        .eq("id", userId!)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId!),
    ]);
    const data = {
      user_id: userId,
      email: ctx.getUserEmail(),
      display_name: profile.data?.display_name ?? null,
      current_screen: profile.data?.current_screen ?? null,
      roles: (roles.data ?? []).map((r) => r.role),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  },
});
