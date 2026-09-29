import { useMemo } from "react";
import { Download, Medal, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALGO_COLORS } from "@/components/perf-chart";
import {
  ALGORITHMS,
  DISTRIBUTIONS,
  type AlgorithmKey,
  type BenchmarkPoint,
  type DistributionKey,
} from "@/lib/sorting/types";

interface Props {
  points: BenchmarkPoint[];
  selected: AlgorithmKey[];
  distribution: DistributionKey;
}

interface Row {
  key: AlgorithmKey;
  name: string;
  largestMs: number;
  totalMs: number;
  comparisons: number;
  swaps: number;
  /** Empirical growth exponent b in t ~ N^b, estimated from first/last measured points. */
  exponent: number | null;
}

const DISTRIBUTION_NOTES: Record<DistributionKey, string> = {
  random: "on uniformly random data",
  nearly: "on nearly sorted data, where adaptive algorithms shine",
  reversed: "on strictly descending data, the worst case for naive pivots",
  duplicates: "on data with few unique values, where partition schemes matter",
};

function name(key: AlgorithmKey) {
  return ALGORITHMS.find((a) => a.key === key)?.name ?? key;
}

export function VerdictPanel({ points, selected, distribution }: Props) {
  const rows = useMemo<Row[]>(() => {
    return selected
      .map((key) => {
        const rs = points
          .filter((p) => p.algorithm === key && !Number.isNaN(p.ms))
          .sort((a, b) => a.size - b.size);
        if (!rs.length) return null;
        const first = rs[0]!;
        const last = rs[rs.length - 1]!;
        const exponent =
          rs.length > 1 && first.ms > 0 && last.ms > 0 && last.size > first.size
            ? Math.log(last.ms / first.ms) / Math.log(last.size / first.size)
            : null;
        return {
          key,
          name: name(key),
          largestMs: last.ms,
          totalMs: rs.reduce((s, r) => s + r.ms, 0),
          comparisons: rs.reduce((s, r) => s + r.comparisons, 0),
          swaps: rs.reduce((s, r) => s + r.swaps, 0),
          exponent,
        } satisfies Row;
      })
      .filter((r): r is Row => r !== null)
      .sort((a, b) => a.largestMs - b.largestMs);
  }, [points, selected]);

  const winner = rows[0];
  const runnerUp = rows[1];
  const slowest = rows[rows.length - 1];
  const speedup =
    winner && slowest && winner.largestMs > 0 ? slowest.largestMs / winner.largestMs : null;

  const exportCsv = () => {
    const header = "algorithm,input_size,execution_time_ms,comparisons,swaps,distribution\n";
    const body = points
      .map(
        (p) =>
          `${name(p.algorithm)},${p.size},${p.ms.toFixed(4)},${p.comparisons},${p.swaps},${distribution}`,
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `sortlab-${distribution}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const distName = DISTRIBUTIONS.find((d) => d.key === distribution)?.name ?? distribution;

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide">
          <Trophy className="h-4 w-4 text-primary" /> Verdict — best algorithm for {distName} data
        </h2>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={exportCsv}
          disabled={points.length === 0}
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {!winner ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Run a benchmark to see which algorithm wins on your selected data.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="glass-soft rounded-xl p-4 sm:col-span-2">
              <div className="flex items-center gap-2">
                <Medal className="h-4 w-4 text-neon-lime" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Recommended
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold" style={{ color: ALGO_COLORS[winner.key] }}>
                {winner.name}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Fastest at the largest tested input ({winner.largestMs.toFixed(2)} ms){" "}
                {DISTRIBUTION_NOTES[distribution]}
                {runnerUp
                  ? `, ahead of ${runnerUp.name} by ${(runnerUp.largestMs - winner.largestMs).toFixed(2)} ms`
                  : ""}
                {speedup && speedup > 1.05
                  ? ` — ${speedup.toFixed(1)}× faster than ${slowest!.name}.`
                  : "."}
              </p>
            </div>
            <div className="glass-soft rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-primary" /> Measured growth
              </div>
              <p className="mt-2 font-mono text-lg">
                {winner.exponent ? `N^${winner.exponent.toFixed(2)}` : "—"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Empirical exponent fitted from the run; ≈1 is linear, ≈2 is quadratic.
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-normal">#</th>
                  <th className="py-2 pr-3 font-normal">Algorithm</th>
                  <th className="py-2 pr-3 text-right font-normal">Largest N (ms)</th>
                  <th className="py-2 pr-3 text-right font-normal">Total (ms)</th>
                  <th className="py-2 pr-3 text-right font-normal">Comparisons</th>
                  <th className="py-2 pr-3 text-right font-normal">Swaps</th>
                  <th className="py-2 text-right font-normal">Growth</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.key} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            background: ALGO_COLORS[r.key],
                            boxShadow: `0 0 8px ${ALGO_COLORS[r.key]}`,
                          }}
                        />
                        {r.name}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right">{r.largestMs.toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right">{r.totalMs.toFixed(1)}</td>
                    <td className="py-2 pr-3 text-right">{r.comparisons.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-right">{r.swaps.toLocaleString()}</td>
                    <td className="py-2 text-right">
                      {r.exponent ? `N^${r.exponent.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
