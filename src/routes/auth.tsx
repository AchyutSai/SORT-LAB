import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AmbientCanvas } from "@/components/ambient-canvas";
import { RouteError } from "@/components/route-error";

function safeNext(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : undefined;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const next = safeNext(s['next']);
    return next ? { next } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — SortLab Benchmark Studio" },
      {
        name: "description",
        content: "Sign in to save sorting benchmark runs, track history and publish results to the SortLab global leaderboard.",
      },
      { property: "og:title", content: "Sign in — SortLab Benchmark Studio" },
      {
        property: "og:description",
        content: "Create a SortLab account to persist benchmark runs and compete on the global leaderboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error, reset }) => <RouteError message={error.message} onRetry={reset} />,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const returnTo = safeNext(next);
  const goBack = () => {
    if (returnTo) {
      window.location.href = returnTo;
      return;
    }
    void navigate({ to: "/" });
  };
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) goBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: returnTo ? window.location.origin + returnTo : window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
      goBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: returnTo ? window.location.origin + returnTo : window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    goBack();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <AmbientCanvas />
      <div className="grid-lines pointer-events-none fixed inset-0 -z-10 opacity-40" />

      <div className="glass w-full max-w-md rounded-2xl p-7">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to studio
        </Link>
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-primary/15 p-2">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="neon-text text-lg font-bold">
              {mode === "signin" ? "Sign in to SortLab" : "Create your SortLab account"}
            </h1>
            <p className="text-xs text-muted-foreground">Save runs, keep history, join the leaderboard.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" ? (
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="benchmark_wizard" />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Sign up"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
          Continue with Google
        </Button>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          {mode === "signin" ? "No account yet?" : "Already registered?"}{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
