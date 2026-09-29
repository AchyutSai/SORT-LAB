import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AmbientCanvas } from "@/components/ambient-canvas";
import { ThemeToggle } from "@/components/theme-toggle";
import { RouteError } from "@/components/route-error";
import { ALGORITHMS, DISTRIBUTIONS, type AlgorithmKey } from "@/lib/sorting/types";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Global Leaderboard — SortLab Benchmarks" },
      {
        name: "description",
        content:
          "Fastest published sorting benchmark results by algorithm, data distribution and array size, submitted by the SortLab community.",
      },
      { property: "og:title", content: "Global Leaderboard — SortLab Benchmarks" },
      {
        property: "og:description",
        content: "See which sorting algorithms win across random, nearly sorted, reversed and duplicate-heavy data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error, reset }) => <RouteError message={error.message} onRetry={reset} />,
  component: LeaderboardPage,
});

interface Row {
  algorithm: AlgorithmKey;
  ms: number;
  size: number;
  distribution: string;
  runName: string;
  author: string;
  createdAt: string;
}

function LeaderboardPage() {
  const query = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async (): Promise<Row[]> => {
      const { data: runs, error: runErr } = await supabase
        .from("benchmark_runs")
        .select("id, run_name, array_distribution, user_id, created_at")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(200);
      if (runErr) throw runErr;
      if (!runs?.length) return [];

      const ids = runs.map((r) => r.id);
      const [{ data: metrics, error: mErr }, { data: profiles }] = await Promise.all([
        supabase
          .from("benchmark_metrics")
          .select("run_id, algorithm_name, input_size, execution_time_ms")
          .in("run_id", ids),
        supabase.from("profiles").select("id, display_name"),
      ]);
      if (mErr) throw mErr;

      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
      const runById = new Map(runs.map((r) => [r.id, r]));

      return (metrics ?? []).map((m) => {
        const run = runById.get(m.run_id)!;
        return {
          algorithm: m.algorithm_name as AlgorithmKey,
          ms: m.execution_time_ms,
          size: m.input_size,
          distribution: run.array_distribution,
          runName: run.run_name,
          author: nameById.get(run.user_id) ?? "Anonymous",
          createdAt: run.created_at,
        };
      });
    },
  });

  const boards = useMemo(() => {
    const rows = query.data ?? [];
    return DISTRIBUTIONS.map((d) => {
      const forDist = rows.filter((r) => r.distribution === d.key);
      // Best throughput = highest elements sorted per millisecond
      const best = new Map<AlgorithmKey, Row>();
      for (const r of forDist) {
        const current = best.get(r.algorithm);
        if (!current || r.size / r.ms > current.size / current.ms) best.set(r.algorithm, r);
      }
      const ranked = [...best.values()].sort((a, b) => b.size / b.ms - a.size / a.ms);
      return { dist: d, ranked };
    });
  }, [query.data]);

  return (
    <div className="relative min-h-screen">
      <AmbientCanvas />
      <div className="grid-lines pointer-events-none fixed inset-0 -z-10 opacity-40" />

      <header className="glass sticky top-0 z-20 flex items-center justify-between gap-4 border-x-0 border-t-0 px-6 py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Studio
        </Link>
        <h1 className="neon-text flex items-center gap-2 text-base font-bold">
          <Trophy className="h-4 w-4" /> Global leaderboard
        </h1>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-[1200px] space-y-5 p-5">
        <p className="text-xs text-muted-foreground">
          Ranked by measured throughput (elements sorted per millisecond) across all public runs. Hardware differs
          between contributors, so treat this as a community trend rather than an absolute ranking.
        </p>

        {query.isLoading ? <p className="text-sm text-muted-foreground">Loading results…</p> : null}
        {query.error ? <p className="text-sm text-destructive">Could not load the leaderboard.</p> : null}

        <div className="grid gap-5 lg:grid-cols-2">
          {boards.map(({ dist, ranked }) => (
            <section key={dist.key} className="glass rounded-2xl p-5">
              <div className="mb-3">
                <h2 className="text-sm font-semibold">{dist.name}</h2>
                <p className="text-xs text-muted-foreground">{dist.hint}</p>
              </div>
              {ranked.length ? (
                <table className="w-full text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-2 font-medium">#</th>
                      <th className="py-2 pr-2 font-medium">Algorithm</th>
                      <th className="py-2 pr-2 font-medium">N</th>
                      <th className="py-2 pr-2 font-medium">Time</th>
                      <th className="py-2 pr-2 font-medium">elem/ms</th>
                      <th className="py-2 font-medium">By</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {ranked.map((r, i) => (
                      <tr key={r.algorithm} className="border-t border-border/60">
                        <td className="py-2 pr-2">{i + 1}</td>
                        <td className="py-2 pr-2 font-sans">
                          {ALGORITHMS.find((a) => a.key === r.algorithm)?.name ?? r.algorithm}
                        </td>
                        <td className="py-2 pr-2">{r.size.toLocaleString()}</td>
                        <td className="py-2 pr-2">{r.ms.toFixed(2)} ms</td>
                        <td className="py-2 pr-2 text-primary">{Math.round(r.size / r.ms).toLocaleString()}</td>
                        <td className="py-2 font-sans text-muted-foreground">{r.author}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-muted-foreground">No public runs yet for this distribution.</p>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
