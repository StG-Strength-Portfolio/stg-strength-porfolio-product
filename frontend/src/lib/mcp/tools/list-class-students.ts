import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_class_students",
  title: "List class students",
  description:
    "For a signed-in teacher: list students enrolled in one of their classes, with display name, current screen, and number of saved fields.",
  inputSchema: {
    class_id: z.string().uuid().describe("The id of a class the signed-in teacher owns."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ class_id }, ctx: ToolContext) => {
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
    const { data: members, error } = await supabase
      .from("class_members")
      .select("student_id, joined_at")
      .eq("class_id", class_id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const ids = (members ?? []).map((m) => m.student_id);
    if (ids.length === 0) {
      return {
        content: [{ type: "text", text: "[]" }],
        structuredContent: { students: [] },
      };
    }
    const [{ data: profiles }, { data: responses }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, current_screen, updated_at")
        .in("id", ids),
      supabase.from("responses").select("user_id").in("user_id", ids),
    ]);
    const counts = new Map<string, number>();
    for (const r of responses ?? []) counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
    const rows = (members ?? []).map((m) => {
      const p = (profiles ?? []).find((x) => x.id === m.student_id);
      return {
        student_id: m.student_id,
        display_name: p?.display_name ?? null,
        current_screen: p?.current_screen ?? null,
        fields_filled: counts.get(m.student_id) ?? 0,
        joined_at: m.joined_at,
        last_updated: p?.updated_at ?? null,
      };
    });
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { students: rows },
    };
  },
});
