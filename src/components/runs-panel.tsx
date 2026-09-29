import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CloudUpload, Database, Loader2, Save, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ALGORITHMS, type AlgorithmKey, type BenchmarkPoint, type DistributionKey } from "@/lib/sorting/types";

interface Props {
  points: BenchmarkPoint[];
  distribution: DistributionKey;
  maxSize: number;
  step: number;
  repeats: number;
  onLoadRun: (points: BenchmarkPoint[], distribution: DistributionKey, selected: AlgorithmKey[]) => void;
}

export function RunsPanel({ points, distribution, maxSize, step, repeats, onLoadRun }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [runName, setRunName] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const runsQuery = useQuery({
    queryKey: ["my-runs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benchmark_runs")
        .select("id, run_name, array_distribution, max_input_size, step_size, is_public, created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data;
    },
  });

  const saveRun = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const valid = points.filter((p) => !Number.isNaN(p.ms));
      if (!valid.length) throw new Error("Run a benchmark first");
      const { data: run, error } = await supabase
        .from("benchmark_runs")
        .insert({
          user_id: user.id,
          run_name: runName.trim() || `Run ${new Date().toLocaleString()}`,
          array_distribution: distribution,
          max_input_size: maxSize,
          step_size: step,
          repeats,
          is_public: isPublic,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: mErr } = await supabase.from("benchmark_metrics").insert(
        valid.map((p) => ({
          run_id: run.id,
          algorithm_name: p.algorithm,
          input_size: p.size,
          execution_time_ms: p.ms,
          comparisons: Math.round(p.comparisons),
          swaps: Math.round(p.swaps),
        })),
      );
      if (mErr) throw mErr;
      return run.id;
    },
    onSuccess: () => {
      toast.success("Benchmark saved to your account");
      setRunName("");
      void qc.invalidateQueries({ queryKey: ["my-runs"] });
      void qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save run"),
  });

  const deleteRun = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("benchmark_runs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Run deleted");
      void qc.invalidateQueries({ queryKey: ["my-runs"] });
      void qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });

  const loadRun = async (id: string, dist: string) => {
    const { data, error } = await supabase
      .from("benchmark_metrics")
      .select("algorithm_name, input_size, execution_time_ms, comparisons, swaps")
      .eq("run_id", id);
    if (error || !data) {
      toast.error("Could not load run");
      return;
    }
    const loaded: BenchmarkPoint[] = data.map((m) => ({
      algorithm: m.algorithm_name as AlgorithmKey,
      size: m.input_size,
      ms: m.execution_time_ms,
      comparisons: Number(m.comparisons ?? 0),
      swaps: Number(m.swaps ?? 0),
    }));
    const selected = [...new Set(loaded.map((p) => p.algorithm))];
    onLoadRun(loaded, dist as DistributionKey, selected);
    toast.success("Run loaded into the chart");
  };

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide">
          <Database className="h-4 w-4 text-primary" /> Saved runs
        </h2>
        <Link to="/leaderboard" className="text-xs text-primary hover:underline">
          Global leaderboard →
        </Link>
      </div>

      {!user ? (
        <div className="rounded-xl border border-dashed border-border p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to store benchmark runs in the cloud and publish them to the leaderboard.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link to="/auth">Sign in / create account</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label htmlFor="runName" className="text-xs">
                Run name
              </Label>
              <Input
                id="runName"
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
                maxLength={100}
                placeholder={`${distribution} · N≤${maxSize.toLocaleString()}`}
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch id="pub" checked={isPublic} onCheckedChange={setIsPublic} />
              <Label htmlFor="pub" className="text-xs text-muted-foreground">
                Public
              </Label>
            </div>
            <Button onClick={() => saveRun.mutate()} disabled={saveRun.isPending} className="gap-2">
              {saveRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save run
            </Button>
          </div>

          {runsQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading history…</p>
          ) : runsQuery.data?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Distribution</th>
                    <th className="py-2 pr-3 font-medium">Max N</th>
                    <th className="py-2 pr-3 font-medium">Saved</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {runsQuery.data.map((r) => (
                    <tr key={r.id} className="border-t border-border/60">
                      <td className="py-2 pr-3">{r.run_name}</td>
                      <td className="py-2 pr-3 capitalize">{r.array_distribution}</td>
                      <td className="py-2 pr-3">{r.max_input_size.toLocaleString()}</td>
                      <td className="py-2 pr-3">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void loadRun(r.id, r.array_distribution)}
                            className="h-7 gap-1 px-2 text-[11px]"
                          >
                            <CloudUpload className="h-3.5 w-3.5" /> Load
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const url = `${window.location.origin}/run/${r.id}`;
                              void navigator.clipboard?.writeText(url);
                              toast.success(
                                r.is_public ? "Share link copied" : "Link copied (run is private)",
                              );
                            }}
                            className="h-7 gap-1 px-2 text-[11px]"
                            aria-label="Copy share link"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteRun.mutate(r.id)}
                            className="h-7 px-2 text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No saved runs yet — benchmark {ALGORITHMS.length} algorithms, then hit Save run.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
