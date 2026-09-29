import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_benchmark_runs",
  title: "List my benchmark runs",
  description:
    "List the signed-in user's saved SortLab benchmark runs, newest first, with distribution, sizes and visibility.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of runs to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("benchmark_runs")
      .select("id, run_name, array_distribution, max_input_size, step_size, repeats, is_public, created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { runs: data ?? [] },
    };
  },
});
