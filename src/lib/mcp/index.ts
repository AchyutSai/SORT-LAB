import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listAlgorithmsTool from "./tools/algorithms";
import listRunsTool from "./tools/list-runs";
import getRunTool from "./tools/get-run";
import saveRunTool from "./tools/save-run";
import deleteRunTool from "./tools/delete-run";
import listPublicRunsTool from "./tools/leaderboard";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged and is inlined by Vite at build time.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "algorithm-arena",
  title: "Algorithm Arena",
  version: "0.1.0",
  instructions:
    "Tools for SortLab / Algorithm Arena, a sorting-algorithm benchmark studio. Use `list_algorithms` for complexity reference data, `list_benchmark_runs` and `get_benchmark_run` to read the signed-in user's saved runs and their per-algorithm timings, `save_benchmark_run` to import measured results, `delete_benchmark_run` to remove a run, and `list_public_runs` to browse the public leaderboard.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: ([
    listAlgorithmsTool,
    listRunsTool,
    getRunTool,
    saveRunTool,
    deleteRunTool,
    listPublicRunsTool,
  ] as unknown) as Parameters<typeof defineMcp>[0]["tools"],
});
