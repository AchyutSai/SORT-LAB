import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Pause, Play, SkipBack, SkipForward, Shuffle } from "lucide-react";
import { AmbientCanvas } from "@/components/ambient-canvas";
import { Bars3D } from "@/components/bars-3d";
import { ThemeToggle } from "@/components/theme-toggle";
import { RouteError } from "@/components/route-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recordSteps } from "@/lib/sorting/steps";
import { ALGORITHMS, DISTRIBUTIONS, type AlgorithmKey, type DistributionKey } from "@/lib/sorting/types";

export const Route = createFileRoute("/visualizer")({
  head: () => ({
    meta: [
      { title: "Step-Through Sorting Visualizer — SortLab" },
      {
        name: "description",
        content:
          "Scrub through every comparison and swap of Quick, Merge, Heap, Radix, Bubble, Insertion and Selection sort on a small array, one step at a time.",
      },
      { property: "og:title", content: "Step-Through Sorting Visualizer — SortLab" },
      {
        property: "og:description",
        content: "Play, pause and scrub a single sort operation-by-operation to see exactly how it works.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error, reset }) => <RouteError message={error.message} onRetry={reset} />,
  component: VisualizerPage,
});

function VisualizerPage() {
  const [algorithm, setAlgorithm] = useState<AlgorithmKey>("quick");
  const [distribution, setDistribution] = useState<DistributionKey>("random");
  const [size, setSize] = useState(28);
  const [seed, setSeed] = useState(42);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(40);
  const [mode, setMode] = useState<"2d" | "3d">("3d");
  const timer = useRef<number | null>(null);

  const steps = useMemo(
    () => recordSteps(algorithm, size, distribution, seed),
    [algorithm, size, distribution, seed],
  );

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [steps]);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setIndex((i) => {
        if (i >= steps.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, Math.max(8, 420 - speed * 4));
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, speed, steps.length]);

  const step = steps[Math.min(index, steps.length - 1)];
  const max = Math.max(...step.array, 1);
  const meta = ALGORITHMS.find((a) => a.key === algorithm)!;

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
        <div>
          <h1 className="neon-text text-xl font-bold">Step-through visualizer</h1>
          <p className="text-xs text-muted-foreground">
            A single sort, replayed operation by operation — independent of the benchmark runs.
          </p>
        </div>

        <section className="glass grid gap-4 rounded-2xl p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Algorithm</Label>
            <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as AlgorithmKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALGORITHMS.map((a) => (
                  <SelectItem key={a.key} value={a.key}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Distribution</Label>
            <Select value={distribution} onValueChange={(v) => setDistribution(v as DistributionKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISTRIBUTIONS.map((d) => (
                  <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <Label>Array size</Label>
              <span className="font-mono text-primary">{size}</span>
            </div>
            <Slider value={[size]} min={8} max={60} step={1} onValueChange={([v]) => setSize(v)} />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <Label>Speed</Label>
              <span className="font-mono text-primary">{speed}</span>
            </div>
            <Slider value={[speed]} min={1} max={100} step={1} onValueChange={([v]) => setSpeed(v)} />
          </div>
        </section>

        <section className="glass rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {meta.name} · {meta.time} · {meta.stable ? "stable" : "unstable"}
            </h2>
            <span className="font-mono text-xs text-muted-foreground">
              step {index + 1} / {steps.length}
            </span>
          </div>

          <div className="mt-3 flex gap-1">
            {(["2d", "3d"] as const).map((m) => (
              <Button key={m} size="sm" variant={mode === m ? "default" : "ghost"} onClick={() => setMode(m)}>
                {m.toUpperCase()}
              </Button>
            ))}
            {mode === "3d" && <span className="self-center pl-2 text-[11px] text-muted-foreground">Drag to rotate</span>}
          </div>

          {mode === "3d" ? (
            <div className="mt-3">
              <Bars3D array={step.array} compare={step.compare} write={step.write} sorted={step.sorted} />
            </div>
          ) : (
          <div className="mt-4 flex h-64 items-end gap-[2px] rounded-xl bg-muted/20 p-3">
            {step.array.map((v, i) => {
              const isCompare = step.compare?.includes(i);
              const isWrite = step.write?.includes(i);
              const isSorted = step.sorted.includes(i);
              const color = isWrite
                ? "var(--neon-pink)"
                : isCompare
                  ? "var(--neon-amber)"
                  : isSorted
                    ? "var(--neon-lime)"
                    : "var(--neon-cyan)";
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-[2px] transition-[height] duration-75"
                  style={{
                    height: `${(v / max) * 100}%`,
                    background: color,
                    boxShadow: isCompare || isWrite ? `0 0 12px ${color}` : undefined,
                  }}
                  title={`a[${i}] = ${v}`}
                />
              );
            })}
          </div>
          )}

          <p className="mt-3 font-mono text-xs text-muted-foreground">{step.note}</p>

          <div className="mt-4">
            <Slider
              value={[index]}
              min={0}
              max={Math.max(0, steps.length - 1)}
              step={1}
              onValueChange={([v]) => {
                setPlaying(false);
                setIndex(v);
              }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setPlaying(false); setIndex((i) => Math.max(0, i - 1)); }}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => setPlaying((p) => !p)} className="gap-2">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "Pause" : "Play"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setPlaying(false); setIndex((i) => Math.min(steps.length - 1, i + 1)); }}>
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="gap-2" onClick={() => setSeed((s) => s + 1)}>
              <Shuffle className="h-4 w-4" /> New array
            </Button>
            <div className="ml-auto flex gap-4 font-mono text-xs text-muted-foreground">
              <span>comparisons: <span className="text-foreground">{step.comparisons}</span></span>
              <span>writes: <span className="text-foreground">{step.swaps}</span></span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <Legend color="var(--neon-amber)" label="comparing" />
            <Legend color="var(--neon-pink)" label="writing" />
            <Legend color="var(--neon-lime)" label="final position" />
            <Legend color="var(--neon-cyan)" label="unsorted" />
          </div>
        </section>
      </main>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} /> {label}
    </span>
  );
}
