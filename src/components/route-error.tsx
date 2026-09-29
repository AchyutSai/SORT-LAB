import { Link } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  message?: string;
  onRetry?: () => void;
  title?: string;
}

/** Shared error boundary UI for routes that read from the cloud. */
export function RouteError({ message, onRetry, title = "Something went wrong" }: Props) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="glass w-full max-w-md space-y-4 rounded-2xl p-6 text-center">
        <div className="mx-auto w-fit rounded-xl bg-destructive/15 p-3">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="break-words font-mono text-xs text-muted-foreground">
          {message ?? "The request could not be completed."}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {onRetry ? (
            <Button onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Try again
            </Button>
          ) : null}
          <Button asChild variant="ghost">
            <Link to="/">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
