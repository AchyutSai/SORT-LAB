import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ALGORITHMS, type AlgorithmKey, type BenchmarkPoint } from "@/lib/sorting/types";

export const ALGO_COLORS: Record<AlgorithmKey, string> = {
  quick: "var(--neon-cyan)",
  merge: "var(--neon-violet)",
  heap: "var(--neon-lime)",
  tim: "var(--neon-amber)",
  radix: "var(--neon-pink)",
  bubble: "oklch(0.75 0.14 25)",
  insertion: "oklch(0.8 0.12 160)",
  selection: "oklch(0.78 0.1 300)",
};

interface Props {
  points: BenchmarkPoint[];
  selected: AlgorithmKey[];
  logScale: boolean;
  /** Overlay fitted theoretical complexity curves next to the measured lines. */
  showTheory?: boolean;
}

/** Growth function for an algorithm family, used as the shape of the theoretical curve. */
function growth(family: "quadratic" | "linearithmic" | "linear", n: number) {
  if (n <= 1) return 1;
  if (family === "quadratic") return n * n;
  if (family === "linear") return n;
  return n * Math.log2(n);
}

export function PerfChart({ points, selected, logScale, showTheory = false }: Props) {
  const bySize = new Map<number, Record<string, number>>();
  for (const p of points) {
    if (Number.isNaN(p.ms)) continue;
    const row = bySize.get(p.size) ?? { size: p.size };
    row[p.algorithm] = Number(p.ms.toFixed(3));
    bySize.set(p.size, row);
  }
  const data = [...bySize.values()].sort((a, b) => (a["size"] ?? 0) - (b["size"] ?? 0));

  const shown = ALGORITHMS.filter((a) => selected.includes(a.key));

  // Least-squares scale factor c minimising |c*f(n) - ms|, i.e. c = Σ(f*ms)/Σ(f²).
  if (showTheory) {
    for (const a of shown) {
      let num = 0;
      let den = 0;
      for (const p of points) {
        if (p.algorithm !== a.key || Number.isNaN(p.ms)) continue;
        const f = growth(a.family, p.size);
        num += f * p.ms;
        den += f * f;
      }
      if (den === 0) continue;
      const c = num / den;
      for (const row of data) {
        const n = row["size"] ?? 0;
        row[`${a.key}__theory`] = Number((c * growth(a.family, n)).toFixed(3));
      }
    }
  }

  return (
    <div className="h-[340px] w-full">
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          Run a benchmark to plot execution time against input size.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="size"
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 11 }}
              label={{ value: "N", position: "insideBottomRight", fill: "var(--muted-foreground)" }}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              tick={{ fontSize: 11 }}
              scale={logScale ? "log" : "linear"}
              domain={logScale ? [0.01, "auto"] : [0, "auto"]}
              allowDataOverflow={logScale}
              width={56}
              label={{ value: "ms", angle: -90, position: "insideLeft", fill: "var(--muted-foreground)" }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {shown.map((a) => (
              <Line
                key={a.key}
                type="monotone"
                dataKey={a.key}
                name={a.name}
                stroke={ALGO_COLORS[a.key]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}
            {showTheory
              ? shown.map((a) => (
                  <Line
                    key={`${a.key}-theory`}
                    type="monotone"
                    dataKey={`${a.key}__theory`}
                    name={`${a.name} · ${a.time} fit`}
                    stroke={ALGO_COLORS[a.key]}
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    strokeOpacity={0.65}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                  />
                ))
              : null}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
