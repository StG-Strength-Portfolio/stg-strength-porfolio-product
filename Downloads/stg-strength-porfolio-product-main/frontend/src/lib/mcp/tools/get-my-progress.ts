import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_my_progress",
  title: "Get my progress",
  description:
    "Return the signed-in student's current screen number and the count of workbook fields they have filled in so far.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId()!;
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const [profile, responses] = await Promise.all([
      supabase.from("profiles").select("current_screen, updated_at").eq("id", userId).maybeSingle(),
      supabase
        .from("responses")
        .select("field_key", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);
    const data = {
      current_screen: profile.data?.current_screen ?? 1,
      last_updated: profile.data?.updated_at ?? null,
      fields_filled: responses.count ?? 0,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  },
});
