import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "delete_benchmark_run",
  title: "Delete a benchmark run",
  description: "Permanently delete one of the signed-in user's saved benchmark runs and all of its metrics.",
  inputSchema: {
    run_id: z.string().uuid().describe("The benchmark run id (UUID) to delete."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ run_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("benchmark_runs")
      .delete()
      .eq("id", run_id)
      .eq("user_id", ctx.getUserId())
      .select("id");

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data || data.length === 0) {
      return { content: [{ type: "text", text: "No matching run owned by you." }], isError: true };
    }
    return {
      content: [{ type: "text", text: `Deleted run ${run_id}.` }],
      structuredContent: { deleted: run_id },
    };
  },
});
