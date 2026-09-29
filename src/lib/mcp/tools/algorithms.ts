import { defineTool } from "@lovable.dev/mcp-js";
import { ALGORITHMS, DISTRIBUTIONS } from "@/lib/sorting/types";

export default defineTool({
  name: "list_algorithms",
  title: "List sorting algorithms",
  description:
    "Reference data for every sorting algorithm SortLab benchmarks: time and space complexity, stability, in-place behaviour, plus the available data distributions.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const payload = {
      algorithms: ALGORITHMS.map((a) => ({
        key: a.key,
        name: a.name,
        time_complexity: a.time,
        space_complexity: a.space,
        family: a.family,
        stable: a.stable,
        in_place: a.inPlace,
      })),
      distributions: DISTRIBUTIONS.map((d) => ({ key: d.key, name: d.name, description: d.hint })),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
