import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Activity, Bot, Download, Gauge, GitCompareArrows, LineChart as LineChartIcon, LogOut, PlayCircle, Timer, Trophy, User as UserIcon, Zap } from "lucide-react";
import { AmbientCanvas } from "@/components/ambient-canvas";
import { ControlPanel } from "@/components/control-panel";
import { MetricsGrid } from "@/components/metrics-grid";
import { PerfChart } from "@/components/perf-chart";
import { VerdictPanel } from "@/components/verdict-panel";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RunsPanel } from "@/components/runs-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { RouteError } from "@/components/route-error";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useBenchmark } from "@/hooks/use-benchmark";
import { loadLocalRun, saveLocalRun } from "@/lib/persistence";
import { ALGORITHMS, type AlgorithmKey, type DistributionKey } from "@/lib/sorting/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SortLab — Sorting Algorithm Benchmark Studio" },
      {
        name: "description",
        content:
          "Benchmark Quick, Merge, Heap, Radix, Tim and quadratic sorts in Web Workers. Plot execution time vs input size with live metrics.",
      },
      { property: "og:title", content: "SortLab — Sorting Algorithm Benchmark Studio" },
      {
        property: "og:description",
        content:
          "Run non-blocking sorting benchmarks across distributions and array sizes with interactive charts and complexity analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:image",
        content: "https://project--c1620739-805d-48b4-aac9-fbe98b60d876.lovable.app/og-sortlab.jpg",
      },
      {
        name: "twitter:image",
        content: "https://project--c1620739-805d-48b4-aac9-fbe98b60d876.lovable.app/og-sortlab.jpg",
      },
    ],
  }),
  errorComponent: ({ error, reset }) => <RouteError message={error.message} onRetry={reset} />,
  component: Dashboard,
});

function Dashboard() {
  const [selected, setSelected] = useState<AlgorithmKey[]>(["quick", "merge", "heap", "bubble"]);
  const [distribution, setDistribution] = useState<DistributionKey>("random");
  const [maxSize, setMaxSize] = useState(10000);
  const [step, setStep] = useState(2000);
  const [repeats, setRepeats] = useState(3);
  const [logScale, setLogScale] = useState(true);
  const [showTheory, setShowTheory] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const exportPng = async () => {
    if (!chartRef.current) return;
    try {
      const { toPng } = await import("html-to-image");
      const bg = getComputedStyle(document.body).backgroundColor;
      const url = await toPng(chartRef.current, { pixelRatio: 2, backgroundColor: bg, skipFonts: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `sortlab-chart-${Date.now()}.png`;
      a.click();
      toast.success("Chart exported as PNG");
    } catch (e) {
      toast.error("Could not export chart");
      console.error(e);
    }
  };
  const [customMode, setCustomMode] = useState(false);
  const [customSize, setCustomSize] = useState(5);
  const [customValues, setCustomValues] = useState<string[]>(["5", "3", "8", "1", "9"]);

  const resizeCustom = (n: number) => {
    const size = Math.max(2, Math.min(64, Math.floor(n) || 2));
    setCustomSize(size);
    setCustomValues((v) =>
      Array.from({ length: size }, (_, i) => v[i] ?? String(Math.floor(Math.random() * 100))),
    );
  };

  const setCustomValue = (index: number, value: string) =>
    setCustomValues((v) => v.map((old, i) => (i === index ? value : old)));

  const randomFill = () =>
    setCustomValues(Array.from({ length: customSize }, () => String(Math.floor(Math.random() * 100))));

  const parsedCustom = customValues.map((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  });

  const { points, status, progress, error, start, pause, resume, reset, loadPoints } =
    useBenchmark();
  const { user, signOut } = useAuth();
  const [restored, setRestored] = useState(false);

  // Local fallback persistence: restore the last run on mount, store every completed run.
  useEffect(() => {
    const last = loadLocalRun();
    if (last && last.points.length) {
      loadPoints(last.points);
      setSelected(last.selected);
      setDistribution(last.distribution);
      setMaxSize(last.maxSize);
      setStep(last.step);
      setRepeats(last.repeats);
      setRestored(true);
    }
  }, [loadPoints]);

  useEffect(() => {
    if (status !== "done" || !points.length) return;
    saveLocalRun({ savedAt: Date.now(), distribution, maxSize, step, repeats, selected, points });
  }, [status, points, distribution, maxSize, step, repeats, selected]);

  const totalTime = useMemo(
    () => points.reduce((s, p) => (Number.isNaN(p.ms) ? s : s + p.ms), 0),
    [points],
  );
  const fastest = useMemo(() => {
    const valid = points.filter((p) => !Number.isNaN(p.ms));
    if (!valid.length) return null;
    const largest = Math.max(...valid.map((p) => p.size));
    const atLargest = valid.filter((p) => p.size === largest);
    return atLargest.reduce((a, b) => (a.ms <= b.ms ? a : b));
  }, [points]);

  const toggle = (key: AlgorithmKey) =>
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  return (
    <div className="relative min-h-screen">
      <AmbientCanvas />
      <div className="grid-lines pointer-events-none fixed inset-0 -z-10 opacity-40" />

      <header className="glass sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-x-0 border-t-0 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-xl bg-primary/15 p-2 shadow-[0_0_24px_oklch(0.85_0.14_195/30%)]">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="neon-text truncate text-lg font-bold tracking-tight">SortLab</h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              Sorting algorithm benchmark studio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          <div className="hidden items-center gap-2 xl:flex">
            <Switch id="scale" checked={logScale} onCheckedChange={setLogScale} />
            <Label htmlFor="scale" className="text-xs text-muted-foreground">
              Log scale
            </Label>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            <Button asChild variant="ghost" size="sm" className="gap-2 text-xs">
              <Link to="/visualizer">
                <PlayCircle className="h-4 w-4" /> Visualizer
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-2 text-xs">
              <Link to="/compare" search={{}}>
                <GitCompareArrows className="h-4 w-4" /> Compare
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-2 text-xs">
              <Link to="/leaderboard">
                <Trophy className="h-4 w-4" /> Leaderboard
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-2 text-xs">
              <Link to="/chat">
                <Bot className="h-4 w-4" /> Assistant
              </Link>
            </Button>
          </nav>
          <ThemeToggle />
          {user ? (
            <>
              <Button asChild variant="ghost" size="icon" aria-label="Your profile">
                <Link to="/profile">
                  <UserIcon className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="gap-2 text-xs">
              <Link to="/auth">
                <UserIcon className="h-4 w-4" /> <span className="hidden sm:inline">Sign in</span>
              </Link>
            </Button>
          )}
          <div className="glass-soft hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs lg:flex">
            <span className={`h-2 w-2 rounded-full ${user ? "bg-neon-lime" : "bg-neon-amber"}`} />
            <span className="font-mono text-muted-foreground">
              cloud: {user ? "synced" : "local only"}
            </span>
          </div>
          <div className="glass-soft hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs sm:flex">
            <span
              className={`h-2 w-2 rounded-full ${
                status === "running"
                  ? "animate-pulse bg-neon-lime"
                  : status === "error"
                    ? "bg-destructive"
                    : "bg-muted-foreground"
              }`}
            />
            <span className="font-mono capitalize text-muted-foreground">
              worker: {status} {status === "running" ? `${Math.round(progress * 100)}%` : ""}
            </span>
          </div>
        </div>
      </header>

      <nav className="flex items-center gap-1 overflow-x-auto px-4 pt-3 md:hidden">
        <Button asChild variant="ghost" size="sm" className="shrink-0 gap-2 text-xs">
          <Link to="/visualizer">
            <PlayCircle className="h-4 w-4" /> Visualizer
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="shrink-0 gap-2 text-xs">
          <Link to="/compare" search={{}}>
            <GitCompareArrows className="h-4 w-4" /> Compare
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="shrink-0 gap-2 text-xs">
          <Link to="/leaderboard">
            <Trophy className="h-4 w-4" /> Leaderboard
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="shrink-0 gap-2 text-xs">
          <Link to="/chat">
            <Bot className="h-4 w-4" /> Assistant
          </Link>
        </Button>
        <div className="ml-auto flex shrink-0 items-center gap-2 pr-1">
          <Switch id="scale-m" checked={logScale} onCheckedChange={setLogScale} />
          <Label htmlFor="scale-m" className="text-xs text-muted-foreground">
            Log
          </Label>
        </div>
      </nav>

      <main className="mx-auto grid max-w-[1600px] gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[340px_1fr]">

        <ControlPanel
          selected={selected}
          onToggle={toggle}
          distribution={distribution}
          onDistribution={setDistribution}
          maxSize={maxSize}
          onMaxSize={setMaxSize}
          step={step}
          onStep={setStep}
          repeats={repeats}
          onRepeats={setRepeats}
          status={status}
          customMode={customMode}
          onCustomMode={setCustomMode}
          customSize={customSize}
          onCustomSize={resizeCustom}
          customValues={customValues}
          onCustomValue={setCustomValue}
          onRandomFill={randomFill}
          onRun={() =>
            start({
              algorithms: selected,
              distribution,
              maxSize,
              step,
              repeats,
              ...(customMode ? { customValues: parsedCustom } : {}),
            })
          }
          onPauseToggle={() => (status === "paused" ? resume() : pause())}
          onReset={reset}
        />

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              icon={<Timer className="h-4 w-4" />}
              label="Cumulative CPU time"
              value={`${totalTime.toFixed(1)} ms`}
            />
            <SummaryCard
              icon={<Gauge className="h-4 w-4" />}
              label="Fastest at largest N"
              value={
                fastest
                  ? `${ALGORITHMS.find((a) => a.key === fastest.algorithm)?.name} · ${fastest.ms.toFixed(2)} ms`
                  : "—"
              }
            />
            <SummaryCard
              icon={<Activity className="h-4 w-4" />}
              label="Data points collected"
              value={String(points.length)}
            />
          </div>

          <section className="glass rounded-2xl p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide">
                <LineChartIcon className="h-4 w-4 text-primary" /> Execution plot — time (ms) vs input size (N)
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch id="theory-toggle" checked={showTheory} onCheckedChange={setShowTheory} />
                  <Label htmlFor="theory-toggle" className="text-xs">Big-O overlay</Label>
                </div>
                <Button size="sm" variant="outline" onClick={exportPng} disabled={points.length === 0}>
                  <Download className="mr-1 h-3.5 w-3.5" /> PNG
                </Button>
                <span className="font-mono text-xs text-muted-foreground">
                  {logScale ? "log(y)" : "linear(y)"} · mean of {repeats} runs
                </span>
              </div>
            </div>
            <div ref={chartRef} className="rounded-xl bg-background/80 p-2">
              <PerfChart points={points} selected={selected} logScale={logScale} showTheory={showTheory} />
            </div>
            {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
          </section>

          <RunsPanel
            points={points}
            distribution={distribution}
            maxSize={maxSize}
            step={step}
            repeats={repeats}
            onLoadRun={(pts, dist, sel) => {
              loadPoints(pts);
              setDistribution(dist);
              setSelected(sel);
            }}
          />

          <VerdictPanel points={points} selected={selected} distribution={distribution} />

          <MetricsGrid points={points} selected={selected} />

          {restored && status === "done" ? (
            <p className="text-center text-[11px] text-muted-foreground">
              Restored your last benchmark from this browser.
            </p>
          ) : null}

          <p className="pb-6 text-center text-[11px] text-muted-foreground">
            Quadratic algorithms are capped at N = 20,000 per step to keep runs responsive. All work
            executes in a Web Worker with <span className="font-mono">performance.now()</span> timing.
          </p>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-mono text-lg text-foreground">{value}</p>
    </div>
  );
}
