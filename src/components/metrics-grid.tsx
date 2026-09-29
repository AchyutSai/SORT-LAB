import { Check, Minus } from "lucide-react";
import { ALGORITHMS, type AlgorithmKey, type BenchmarkPoint } from "@/lib/sorting/types";
import { ALGO_COLORS } from "@/components/perf-chart";
import { AlgoSource } from "@/components/algo-source";

const fmt = new Intl.NumberFormat("en-US");

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

interface Props {
  points: BenchmarkPoint[];
  selected: AlgorithmKey[];
}

export function MetricsGrid({ points, selected }: Props) {
  const metas = ALGORITHMS.filter((a) => selected.includes(a.key));

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metas.map((meta) => {
        const rows = points.filter((p) => p.algorithm === meta.key && !Number.isNaN(p.ms));
        const last = rows[rows.length - 1];
        const totalMs = rows.reduce((s, r) => s + r.ms, 0);
        const measured = Math.max(0, ...rows.map((r) => r.heapBytes ?? 0));
        const theoretical = last ? last.size * 4 * (meta.space.includes("n") ? 2 : 1) : 0;

        return (
          <div key={meta.key} className="glass rounded-xl p-4">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: ALGO_COLORS[meta.key], boxShadow: `0 0 10px ${ALGO_COLORS[meta.key]}` }}
                />
                <h3 className="truncate text-sm font-semibold">{meta.name}</h3>
              </div>
              <AlgoSource meta={meta} />
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <Flag active={meta.stable} label="Stable" />
              <Flag active={meta.inPlace} label="In-place" />
            </div>

            <dl className="mt-3 space-y-1.5 font-mono text-xs text-muted-foreground">
              <Row label="Time" value={meta.time} />
              <Row label="Space" value={meta.space} />
              <Row label="Last run" value={last ? `${last.ms.toFixed(2)} ms` : "—"} />
              <Row label="Total" value={rows.length ? `${totalMs.toFixed(1)} ms` : "—"} />
              <Row label="Comparisons" value={last ? fmt.format(last.comparisons) : "—"} />
              <Row label="Swaps / writes" value={last ? fmt.format(last.swaps) : "—"} />
              <Row
                label={measured ? "Peak heap (measured)" : "Peak heap (modelled)"}
                value={measured ? formatBytes(measured) : theoretical ? formatBytes(theoretical) : "—"}
              />
            </dl>
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="truncate">{label}</dt>
      <dd className="shrink-0 text-foreground">{value}</dd>
    </div>
  );
}

function Flag({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
        active ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground"
      }`}
    >
      {active ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      {label}
    </span>
  );
}
