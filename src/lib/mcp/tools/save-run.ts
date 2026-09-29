import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const metricSchema = z.object({
  algorithm_name: z.string().min(1),
  input_size: z.number().int().positive(),
  execution_time_ms: z.number().nonnegative(),
  comparisons: z.number().int().nonnegative().optional(),
  swaps: z.number().int().nonnegative().optional(),
});

export default defineTool({
  name: "save_benchmark_run",
  title: "Save a benchmark run",
  description:
    "Store a SortLab benchmark run and its per-algorithm metrics for the signed-in user. Use this to import results measured elsewhere.",
  inputSchema: {
    run_name: z.string().trim().min(1).max(100).describe("Human-readable name for the run."),
    array_distribution: z
      .enum(["random", "nearly", "reversed", "duplicates"])
      .describe("Data distribution the arrays were generated with."),
    max_input_size: z.number().int().positive().describe("Largest array size tested."),
    step_size: z.number().int().positive().describe("Increment between tested array sizes."),
    repeats: z.number().int().min(1).max(50).default(3).describe("Runs averaged per step."),
    is_public: z.boolean().default(true).describe("Whether the run appears on the public leaderboard."),
    metrics: z.array(metricSchema).min(1).max(2000).describe("Measured data points."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: run, error } = await supabase
      .from("benchmark_runs")
      .insert({
        user_id: ctx.getUserId(),
        run_name: input.run_name,
        array_distribution: input.array_distribution,
        max_input_size: input.max_input_size,
        step_size: input.step_size,
        repeats: input.repeats ?? 3,
        is_public: input.is_public ?? true,
      })
      .select("id")
      .single();

    if (error || !run) {
      return { content: [{ type: "text", text: error?.message ?? "Insert failed" }], isError: true };
    }

    const { error: metricsError } = await supabase.from("benchmark_metrics").insert(
      input.metrics.map((m) => ({
        run_id: run.id,
        algorithm_name: m.algorithm_name,
        input_size: m.input_size,
        execution_time_ms: m.execution_time_ms,
        comparisons: m.comparisons ?? null,
        swaps: m.swaps ?? null,
      })),
    );

    if (metricsError) {
      await supabase.from("benchmark_runs").delete().eq("id", run.id);
      return { content: [{ type: "text", text: metricsError.message }], isError: true };
    }

    return {
      content: [{ type: "text", text: `Saved run ${run.id} with ${input.metrics.length} metrics.` }],
      structuredContent: { run_id: run.id, metric_count: input.metrics.length },
    };
  },
});
