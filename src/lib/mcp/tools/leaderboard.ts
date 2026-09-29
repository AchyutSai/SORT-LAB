import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

export default defineTool({
  name: "list_public_runs",
  title: "List public benchmark runs",
  description:
    "Browse the public SortLab leaderboard: benchmark runs other users published, optionally filtered by data distribution.",
  inputSchema: {
    distribution: z
      .enum(["random", "nearly", "reversed", "duplicates"])
      .optional()
      .describe("Only return runs generated with this data distribution."),
    limit: z.number().int().min(1).max(100).default(20).describe("Maximum number of runs to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ distribution, limit }) => {
    const supabase = supabaseAnon();
    let query = supabase
      .from("benchmark_runs")
      .select("id, run_name, array_distribution, max_input_size, step_size, repeats, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (distribution) query = query.eq("array_distribution", distribution);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { runs: data ?? [] },
    };
  },
});
