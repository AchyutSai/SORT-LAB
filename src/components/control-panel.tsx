import { Play, Pause, RotateCcw, Cpu, Sliders, Keyboard, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ALGORITHMS,
  DISTRIBUTIONS,
  type AlgorithmKey,
  type DistributionKey,
} from "@/lib/sorting/types";
import { ALGO_COLORS } from "@/components/perf-chart";
import type { RunStatus } from "@/hooks/use-benchmark";

interface Props {
  selected: AlgorithmKey[];
  onToggle: (key: AlgorithmKey) => void;
  distribution: DistributionKey;
  onDistribution: (d: DistributionKey) => void;
  maxSize: number;
  onMaxSize: (n: number) => void;
  step: number;
  onStep: (n: number) => void;
  repeats: number;
  onRepeats: (n: number) => void;
  status: RunStatus;
  customMode: boolean;
  onCustomMode: (v: boolean) => void;
  customSize: number;
  onCustomSize: (n: number) => void;
  customValues: string[];
  onCustomValue: (index: number, value: string) => void;
  onRandomFill: () => void;
  onRun: () => void;
  onPauseToggle: () => void;
  onReset: () => void;
}

export function ControlPanel(p: Props) {
  const running = p.status === "running";

  return (
    <aside className="glass flex h-fit flex-col gap-6 rounded-2xl p-5">
      <section>
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide">
          <Cpu className="h-4 w-4 text-primary" /> Algorithms
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {ALGORITHMS.map((a) => (
            <label
              key={a.key}
              className="glass-soft flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-secondary/60"
            >
              <Checkbox
                checked={p.selected.includes(a.key)}
                onCheckedChange={() => p.onToggle(a.key)}
                disabled={running}
              />
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: ALGO_COLORS[a.key], boxShadow: `0 0 8px ${ALGO_COLORS[a.key]}` }}
              />
              <span className="truncate">{a.name}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            <Keyboard className="h-4 w-4 text-primary" /> Custom input values
          </h2>
          <Switch checked={p.customMode} onCheckedChange={p.onCustomMode} disabled={running} />
        </div>

        {p.customMode ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <Label htmlFor="custom-size">Number of values</Label>
              <Input
                id="custom-size"
                type="number"
                min={2}
                max={64}
                value={p.customSize}
                disabled={running}
                onChange={(e) => p.onCustomSize(Number(e.target.value))}
                className="h-8 w-20 text-right font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {p.customValues.map((v, i) => (
                <Input
                  key={i}
                  type="number"
                  value={v}
                  disabled={running}
                  aria-label={`Value ${i + 1}`}
                  onChange={(e) => p.onCustomValue(i, e.target.value)}
                  className="h-8 px-2 text-center font-mono text-xs"
                />
              ))}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={p.onRandomFill}
              disabled={running}
              className="w-full gap-2 text-xs"
            >
              <Shuffle className="h-3.5 w-3.5" /> Fill with random values
            </Button>
            <p className="text-[10px] text-muted-foreground">
              The benchmark sorts exactly these values, so size and distribution settings are ignored.
            </p>
          </div>
        ) : null}
      </section>

      <section className={`space-y-5 ${p.customMode ? "pointer-events-none opacity-50" : ""}`}>
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide">
          <Sliders className="h-4 w-4 text-primary" /> Array configuration
        </h2>


        <div>
          <div className="flex items-center justify-between text-xs">
            <Label>Max input size (N)</Label>
            <span className="font-mono text-primary">{p.maxSize.toLocaleString()}</span>
          </div>
          <Slider
            className="mt-3"
            min={100}
            max={100000}
            step={100}
            value={[p.maxSize]}
            disabled={running}
            onValueChange={(v) => p.onMaxSize(v[0] ?? 1000)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs">
            <Label>Step increment</Label>
            <span className="font-mono text-primary">{p.step.toLocaleString()}</span>
          </div>
          <Slider
            className="mt-3"
            min={100}
            max={10000}
            step={100}
            value={[p.step]}
            disabled={running}
            onValueChange={(v) => p.onStep(v[0] ?? 1000)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs">
            <Label>Runs averaged per step</Label>
            <span className="font-mono text-primary">{p.repeats}</span>
          </div>
          <Slider
            className="mt-3"
            min={1}
            max={7}
            step={1}
            value={[p.repeats]}
            disabled={running}
            onValueChange={(v) => p.onRepeats(v[0] ?? 3)}
          />
        </div>

        <div>
          <Label className="text-xs">Data distribution</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DISTRIBUTIONS.map((d) => (
              <button
                key={d.key}
                type="button"
                disabled={running}
                onClick={() => p.onDistribution(d.key)}
                className={`rounded-lg border px-2.5 py-2 text-left text-xs transition-all disabled:opacity-50 ${
                  p.distribution === d.key
                    ? "border-primary/70 bg-primary/10 text-primary shadow-[0_0_18px_oklch(0.85_0.14_195/25%)]"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="block font-medium">{d.name}</span>
                <span className="block text-[10px] opacity-70">{d.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <Button onClick={p.onRun} disabled={running || p.selected.length === 0} className="flex-1 gap-2">
          <Play className="h-4 w-4" /> Run benchmark
        </Button>
        <Button
          variant="secondary"
          onClick={p.onPauseToggle}
          disabled={p.status !== "running" && p.status !== "paused"}
          className="gap-2"
        >
          <Pause className="h-4 w-4" /> {p.status === "paused" ? "Resume" : "Pause"}
        </Button>
        <Button variant="outline" onClick={p.onReset} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </section>
    </aside>
  );
}
