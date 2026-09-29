import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AmbientCanvas } from "@/components/ambient-canvas";

type OAuthDetails = {
  client?: { name?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthResult = { data: OAuthDetails | null; error: { message: string } | null };

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};

function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s['authorization_id'] === "string" ? s['authorization_id'] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
      Could not load this authorization request: {String((error as Error)?.message ?? error)}
    </main>
  ),
  component: Consent,
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <AmbientCanvas />
      <div className="glass w-full max-w-md rounded-2xl p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-primary/15 p-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="neon-text truncate text-lg font-bold">Connect {clientName}</h1>
            <p className="text-xs text-muted-foreground">Authorize access to your SortLab account</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {clientName} is asking to use SortLab as you. It will be able to read, create and delete your
          saved benchmark runs and their metrics.
        </p>

        {error ? (
          <p role="alert" className="mt-4 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex gap-3">
          <Button className="flex-1" disabled={busy} onClick={() => void decide(true)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
          </Button>
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => void decide(false)}>
            Deny
          </Button>
        </div>
      </div>
    </main>
  );
}
