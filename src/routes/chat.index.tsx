import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Bot } from "lucide-react";
import { AmbientCanvas } from "@/components/ambient-canvas";
import { RouteError } from "@/components/route-error";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThreadList } from "@/components/chat/thread-list";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { createThread, deleteThread, listThreads, type ChatThread } from "@/lib/chat-db";

export const Route = createFileRoute("/chat/")({
  head: () => ({
    meta: [
      { title: "AI Assistant Chat — SortLab" },
      {
        name: "description",
        content:
          "Chat with the SortLab AI assistant. Ask about sorting algorithms, complexity, your benchmark results, or anything else, with saved conversation threads.",
      },
      { property: "og:title", content: "AI Assistant Chat — SortLab" },
      {
        property: "og:description",
        content: "A general-purpose AI assistant inside SortLab, with conversations saved to your account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error, reset }) => <RouteError message={error.message} onRetry={reset} />,
  component: ChatIndex,
});

function ChatIndex() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ChatThread[]>([]);

  useEffect(() => {
    if (!user) return;
    listThreads()
      .then(setThreads)
      .catch((e: Error) => toast.error(e.message));
  }, [user]);

  const newChat = async () => {
    if (!user) return;
    try {
      const thread = await createThread(user.id);
      await navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteThread(id);
      setThreads((t) => t.filter((x) => x.id !== id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="relative min-h-screen">
      <AmbientCanvas />
      <ChatHeader />
      <main className={`mx-auto grid w-full max-w-[1200px] gap-4 p-4 sm:p-6 ${user ? "lg:grid-cols-[260px_1fr]" : ""}`}>
        {user ? (
          <ThreadList threads={threads} onNew={() => void newChat()} onDelete={(id) => void remove(id)} />
        ) : null}
        <section className="glass flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center">
          <Bot className="h-8 w-8 text-primary" />
          <h1 className="neon-text text-xl font-bold">SortLab assistant</h1>
          {loading ? null : user ? (
            <>
              <p className="max-w-md text-xs text-muted-foreground">
                Pick a conversation on the left or start a new one.
              </p>
              <Button size="sm" onClick={() => void newChat()}>
                Start a new chat
              </Button>
            </>
          ) : (
            <>
              <p className="max-w-md text-xs text-muted-foreground">
                Sign in to chat with the assistant and keep your conversations saved to your account.
              </p>
              <Button asChild size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export function ChatHeader() {
  return (
    <header className="glass sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-x-0 border-t-0 px-4 py-4 sm:px-6">
      <Link to="/" className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 shrink-0" /> <span className="truncate">SortLab dashboard</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}
