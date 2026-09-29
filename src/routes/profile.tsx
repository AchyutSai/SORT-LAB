import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save, ShieldAlert, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AmbientCanvas } from "@/components/ambient-canvas";
import { ThemeToggle } from "@/components/theme-toggle";
import { RouteError } from "@/components/route-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMyAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — SortLab Account Settings" },
      {
        name: "description",
        content:
          "Update your SortLab display name shown on the global benchmark leaderboard, or permanently delete your account and saved runs.",
      },
      { property: "og:title", content: "Your Profile — SortLab Account Settings" },
      {
        property: "og:description",
        content: "Manage your SortLab display name, saved benchmark runs and account deletion.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error, reset }) => <RouteError message={error.message} onRetry={reset} />,
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, created_at")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const runCount = useQuery({
    queryKey: ["my-run-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("benchmark_runs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (profile.data?.display_name) setName(profile.data.display_name);
  }, [profile.data?.display_name]);

  const save = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (trimmed.length < 2) throw new Error("Display name must be at least 2 characters");
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: trimmed })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Display name updated");
      void qc.invalidateQueries({ queryKey: ["profile"] });
      void qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update profile"),
  });

  const remove = useMutation({
    mutationFn: async () => deleteMyAccount({ data: { confirm: "DELETE" } }),
    onSuccess: async () => {
      toast.success("Account deleted");
      await signOut();
      void navigate({ to: "/" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete account"),
  });

  return (
    <div className="relative min-h-screen">
      <AmbientCanvas />
      <header className="glass sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-x-0 border-t-0 px-4 py-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 shrink-0" /> <span className="truncate">Back to dashboard</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/15 p-2">
            <UserIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="neon-text truncate text-xl font-bold">Your profile</h1>
            <p className="truncate text-xs text-muted-foreground">{user?.email ?? "…"}</p>
          </div>
        </div>

        <section className="glass space-y-4 rounded-2xl p-5">
          <div className="space-y-1.5">
            <Label htmlFor="display">Display name (shown on the leaderboard)</Label>
            <Input
              id="display"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder="Anonymous"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="font-mono">
              {runCount.data ?? 0} saved run{runCount.data === 1 ? "" : "s"}
              {profile.data?.created_at
                ? ` · joined ${new Date(profile.data.created_at).toLocaleDateString()}`
                : ""}
            </span>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </div>
        </section>

        <section className="glass space-y-3 rounded-2xl border border-destructive/40 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <ShieldAlert className="h-4 w-4" /> Danger zone
          </h2>
          <p className="text-xs text-muted-foreground">
            Deleting your account permanently removes your profile and every saved benchmark run,
            including any published leaderboard entries. This cannot be undone. Type{" "}
            <code className="font-mono text-foreground">DELETE</code> to confirm.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              className="max-w-[180px] font-mono"
            />
            <Button
              variant="destructive"
              disabled={confirm !== "DELETE" || remove.isPending}
              onClick={() => remove.mutate()}
              className="gap-2"
            >
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete my account
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
