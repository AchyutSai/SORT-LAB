import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_benchmark_run",
  title: "Get a benchmark run",
  description:
    "Fetch one SortLab benchmark run with all of its per-algorithm metrics (input size, execution time in ms, comparisons, swaps). Works for the user's own runs and for any public run.",
  inputSchema: {
    run_id: z.string().uuid().describe("The benchmark run id (UUID)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ run_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: run, error: runError } = await supabase
      .from("benchmark_runs")
      .select("id, run_name, array_distribution, max_input_size, step_size, repeats, is_public, created_at")
      .eq("id", run_id)
      .maybeSingle();

    if (runError) return { content: [{ type: "text", text: runError.message }], isError: true };
    if (!run) {
      return {
        content: [{ type: "text", text: "No run found with that id (it may be private)." }],
        isError: true,
      };
    }

    const { data: metrics, error: metricsError } = await supabase
      .from("benchmark_metrics")
      .select("algorithm_name, input_size, execution_time_ms, comparisons, swaps")
      .eq("run_id", run_id)
      .order("input_size", { ascending: true });

    if (metricsError) return { content: [{ type: "text", text: metricsError.message }], isError: true };

    const payload = { run, metrics: metrics ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
