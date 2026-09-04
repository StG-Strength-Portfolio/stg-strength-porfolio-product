import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "list_my_classes",
  title: "List my classes",
  description:
    "For a signed-in teacher: list the classes they own, with join codes and the number of enrolled students.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data: classes, error } = await supabase
      .from("classes")
      .select("id, name, join_code, created_at")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const withCounts = await Promise.all(
      (classes ?? []).map(async (c) => {
        const { count } = await supabase
          .from("class_members")
          .select("student_id", { count: "exact", head: true })
          .eq("class_id", c.id);
        return { ...c, student_count: count ?? 0 };
      }),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(withCounts, null, 2) }],
      structuredContent: { classes: withCounts },
    };
  },
});
