import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, GitCompareArrows, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AmbientCanvas } from "@/components/ambient-canvas";
import { ThemeToggle } from "@/components/theme-toggle";
import { PerfChart } from "@/components/perf-chart";
import { RouteError } from "@/components/route-error";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchSharedRun } from "@/routes/run.$id";
import { ALGORITHMS, type AlgorithmKey } from "@/lib/sorting/types";

const searchSchema = z.object({
  a: z.string().optional(),
  b: z.string().optional(),
});

export const Route = createFileRoute("/compare")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Compare Benchmark Runs — SortLab" },
      {
        name: "description",
        content:
          "Put two saved sorting benchmark runs side by side to compare execution time, comparisons and swaps across machines, distributions and array sizes.",
      },
      { property: "og:title", content: "Compare Benchmark Runs — SortLab" },
      {
        property: "og:description",
        content: "Side-by-side diff of two sorting benchmark runs with per-algorithm speed deltas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error, reset }) => <RouteError message={error.message} onRetry={reset} />,
  component: ComparePage,
});

function ComparePage() {
  const { a, b } = Route.useSearch();
  const navigate = useNavigate({ from: "/compare" });
  const { user } = useAuth();

  const optionsQuery = useQuery({
    queryKey: ["comparable-runs", user?.id],
    queryFn: async () => {
      const mine = user
        ? await supabase
            .from("benchmark_runs")
            .select("id, run_name, array_distribution, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50)
        : { data: [], error: null };
      const pub = await supabase
        .from("benchmark_runs")
        .select("id, run_name, array_distribution, created_at")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (mine.error) throw mine.error;
      if (pub.error) throw pub.error;
      const map = new Map<string, { id: string; run_name: string; array_distribution: string }>();
      for (const r of [...(mine.data ?? []), ...(pub.data ?? [])]) map.set(r.id, r);
      return [...map.values()];
    },
  });

  const runA = useQuery({
    queryKey: ["shared-run", a],
    queryFn: () => fetchSharedRun(a!),
    enabled: !!a,
  });
  const runB = useQuery({
    queryKey: ["shared-run", b],
    queryFn: () => fetchSharedRun(b!),
    enabled: !!b,
  });

  const rows = useMemo(() => {
    if (!runA.data || !runB.data) return [];
    const keys = [
      ...new Set([
        ...runA.data.points.map((p) => p.algorithm),
        ...runB.data.points.map((p) => p.algorithm),
      ]),
    ];
    const at = (pts: typeof runA.data.points, k: AlgorithmKey) => {
      const valid = pts.filter((p) => p.algorithm === k && !Number.isNaN(p.ms));
      if (!valid.length) return null;
      return valid.reduce((x, y) => (x.size >= y.size ? x : y));
    };
    return keys.map((k) => {
      const pa = at(runA.data!.points, k);
      const pb = at(runB.data!.points, k);
      const delta = pa && pb && pb.ms > 0 ? (pa.ms - pb.ms) / pb.ms : null;
      return { key: k, pa, pb, delta };
    });
  }, [runA.data, runB.data]);

  const setSide = (side: "a" | "b", id: string) =>
    void navigate({ search: (prev) => ({ ...prev, [side]: id }) });

  return (
    <div className="relative min-h-screen">
      <AmbientCanvas />
      <header className="glass sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-x-0 border-t-0 px-4 py-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 shrink-0" /> <span className="truncate">SortLab dashboard</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-[1200px] space-y-5 p-4 sm:p-6">
        <h1 className="neon-text flex items-center gap-2 text-xl font-bold">
          <GitCompareArrows className="h-5 w-5 text-primary" /> Compare runs
        </h1>

        <section className="glass grid gap-4 rounded-2xl p-5 sm:grid-cols-2">
          {(["a", "b"] as const).map((side) => (
            <div key={side} className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Run {side.toUpperCase()}</Label>
              <Select value={(side === "a" ? a : b) ?? ""} onValueChange={(v) => setSide(side, v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a saved or public run" />
                </SelectTrigger>
                <SelectContent>
                  {(optionsQuery.data ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.run_name} · {r.array_distribution}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </section>

        {runA.isLoading || runB.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading runs…
          </p>
        ) : null}

        {runA.data && runB.data ? (
          <>
            <div className="grid gap-5 lg:grid-cols-2">
              {[runA.data, runB.data].map((run, i) => (
                <section key={i} className="glass rounded-2xl p-5">
                  <h2 className="truncate text-sm font-semibold">
                    {i === 0 ? "A" : "B"} — {run.runName}
                  </h2>
                  <p className="mb-3 font-mono text-[11px] capitalize text-muted-foreground">
                    {run.author} · {run.distribution} · N ≤ {run.maxSize.toLocaleString()}
                  </p>
                  <PerfChart
                    points={run.points}
                    selected={[...new Set(run.points.map((p) => p.algorithm))]}
                    logScale
                  />
                </section>
              ))}
            </div>

            <section className="glass overflow-x-auto rounded-2xl p-5">
              <h2 className="mb-3 text-sm font-semibold">Per-algorithm delta at each run's largest N</h2>
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Algorithm</th>
                    <th className="py-2 pr-3 font-medium">A (ms)</th>
                    <th className="py-2 pr-3 font-medium">B (ms)</th>
                    <th className="py-2 font-medium">Difference</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {rows.map((r) => (
                    <tr key={r.key} className="border-t border-border/60">
                      <td className="py-2 pr-3">{ALGORITHMS.find((x) => x.key === r.key)?.name}</td>
                      <td className="py-2 pr-3">{r.pa ? r.pa.ms.toFixed(2) : "—"}</td>
                      <td className="py-2 pr-3">{r.pb ? r.pb.ms.toFixed(2) : "—"}</td>
                      <td
                        className={`py-2 ${
                          r.delta == null ? "" : r.delta < 0 ? "text-neon-lime" : "text-destructive"
                        }`}
                      >
                        {r.delta == null
                          ? "—"
                          : `${r.delta > 0 ? "+" : ""}${(r.delta * 100).toFixed(1)}% ${
                              r.delta < 0 ? "(A faster)" : "(B faster)"
                            }`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pick two runs above — your own saved runs and any public run can be compared, so you can
            diff the same benchmark across machines.
          </p>
        )}
      </main>
    </div>
  );
}
