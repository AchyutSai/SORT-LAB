import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Link2, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AmbientCanvas } from "@/components/ambient-canvas";
import { ThemeToggle } from "@/components/theme-toggle";
import { PerfChart } from "@/components/perf-chart";
import { MetricsGrid } from "@/components/metrics-grid";
import { VerdictPanel } from "@/components/verdict-panel";
import { RouteError } from "@/components/route-error";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { AlgorithmKey, BenchmarkPoint, DistributionKey } from "@/lib/sorting/types";

export const Route = createFileRoute("/run/$id")({
  head: () => ({
    meta: [
      { title: "Shared Benchmark Run — SortLab" },
      {
        name: "description",
        content:
          "View a published SortLab benchmark run: execution time per algorithm across input sizes, comparisons, swaps and the winning algorithm.",
      },
      { property: "og:title", content: "Shared Benchmark Run — SortLab" },
      {
        property: "og:description",
        content: "A shared sorting-algorithm benchmark with charts, metrics and a winner verdict.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error, reset }) => <RouteError message={error.message} onRetry={reset} />,
  notFoundComponent: () => (
    <RouteError title="Run not found" message="This benchmark run is private or no longer exists." />
  ),
  component: RunPage,
});

export interface SharedRun {
  runName: string;
  distribution: DistributionKey;
  maxSize: number;
  step: number;
  repeats: number;
  createdAt: string;
  author: string;
  points: BenchmarkPoint[];
}

export async function fetchSharedRun(id: string): Promise<SharedRun | null> {
  const { data: run, error } = await supabase
    .from("benchmark_runs")
    .select("id, run_name, array_distribution, max_input_size, step_size, repeats, created_at, user_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!run) return null;

  const [{ data: metrics, error: mErr }, { data: profile }] = await Promise.all([
    supabase
      .from("benchmark_metrics")
      .select("algorithm_name, input_size, execution_time_ms, comparisons, swaps")
      .eq("run_id", id),
    supabase.from("profiles").select("display_name").eq("id", run.user_id).maybeSingle(),
  ]);
  if (mErr) throw mErr;

  return {
    runName: run.run_name,
    distribution: run.array_distribution as DistributionKey,
    maxSize: run.max_input_size,
    step: run.step_size,
    repeats: run.repeats,
    createdAt: run.created_at,
    author: profile?.display_name ?? "Anonymous",
    points: (metrics ?? []).map((m) => ({
      algorithm: m.algorithm_name as AlgorithmKey,
      size: m.input_size,
      ms: m.execution_time_ms,
      comparisons: Number(m.comparisons ?? 0),
      swaps: Number(m.swaps ?? 0),
    })),
  };
}

function RunPage() {
  const { id } = Route.useParams();
  const [logScale, setLogScale] = useState(true);

  const query = useQuery({
    queryKey: ["shared-run", id],
    queryFn: () => fetchSharedRun(id),
  });

  const selected = useMemo(
    () => [...new Set((query.data?.points ?? []).map((p) => p.algorithm))],
    [query.data],
  );

  const share = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Permalink copied to clipboard");
    } catch {
      toast.error("Could not copy — the link is in your address bar");
    }
  };

  return (
    <div className="relative min-h-screen">
      <AmbientCanvas />
      <header className="glass sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-x-0 border-t-0 px-4 py-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 shrink-0" /> <span className="truncate">SortLab dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="gap-2 text-xs" onClick={() => void share()}>
            <Share2 className="h-4 w-4" /> Copy link
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] space-y-5 p-4 sm:p-6">
        {query.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading run…
          </p>
        ) : !query.data ? (
          <RouteError
            title="Run not found"
            message="This benchmark run is private or no longer exists."
          />
        ) : (
          <>
            <section className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h1 className="neon-text text-xl font-bold">{query.data.runName}</h1>
                <span className="font-mono text-xs text-muted-foreground">
                  by {query.data.author} · {new Date(query.data.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-2 font-mono text-xs capitalize text-muted-foreground">
                {query.data.distribution} data · N ≤ {query.data.maxSize.toLocaleString()} · step{" "}
                {query.data.step.toLocaleString()} · mean of {query.data.repeats} runs
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5 text-primary" />
                <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                  <Link to="/compare" search={{ a: id, b: undefined }}>
                    Compare this run with another →
                  </Link>
                </Button>
              </div>
            </section>

            <section className="glass rounded-2xl p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Execution plot — time (ms) vs input size (N)</h2>
                <div className="flex items-center gap-2">
                  <Switch id="scale" checked={logScale} onCheckedChange={setLogScale} />
                  <Label htmlFor="scale" className="text-xs text-muted-foreground">
                    Log scale
                  </Label>
                </div>
              </div>
              <PerfChart points={query.data.points} selected={selected} logScale={logScale} />
            </section>

            <VerdictPanel
              points={query.data.points}
              selected={selected}
              distribution={query.data.distribution}
            />
            <MetricsGrid points={query.data.points} selected={selected} />
          </>
        )}
      </main>
    </div>
  );
}
