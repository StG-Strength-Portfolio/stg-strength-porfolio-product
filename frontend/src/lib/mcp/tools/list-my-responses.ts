import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_my_responses",
  title: "List my responses",
  description:
    "List the signed-in student's saved workbook responses (field_key + value). Optionally filter by a field_key prefix (e.g. a screen id like 's14').",
  inputSchema: {
    prefix: z
      .string()
      .trim()
      .max(64)
      .optional()
      .describe("Optional field_key prefix to filter by, e.g. 's14'."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe("Max rows to return (default 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ prefix, limit }, ctx: ToolContext) => {
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
    let q = supabase
      .from("responses")
      .select("field_key, value, updated_at")
      .eq("user_id", userId)
      .order("field_key", { ascending: true })
      .limit(limit ?? 200);
    if (prefix) q = q.like("field_key", `${prefix}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { responses: data ?? [] },
    };
  },
});
