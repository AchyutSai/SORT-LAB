import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { toast } from "sonner";
import { AmbientCanvas } from "@/components/ambient-canvas";
import { RouteError } from "@/components/route-error";
import { ChatHeader } from "@/routes/chat.index";
import { ChatWindow } from "@/components/chat/chat-window";
import { ThreadList } from "@/components/chat/thread-list";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  createThread,
  deleteThread,
  listThreads,
  loadMessages,
  type ChatThread,
} from "@/lib/chat-db";

export const Route = createFileRoute("/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Conversation — SortLab Assistant" },
      {
        name: "description",
        content:
          "Continue a saved conversation with the SortLab AI assistant about sorting algorithms, benchmarks, or anything else.",
      },
      { property: "og:title", content: "Conversation — SortLab Assistant" },
      {
        property: "og:description",
        content: "A saved AI conversation in SortLab, synced to your account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error, reset }) => <RouteError message={error.message} onRetry={reset} />,
  component: ChatThreadPage,
});

function ChatThreadPage() {
  const { threadId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    if (!user) return;
    listThreads()
      .then(setThreads)
      .catch((e: Error) => toast.error(e.message));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setInitial(null);
    loadMessages(threadId)
      .then(setInitial)
      .catch((e: Error) => toast.error(e.message));
  }, [user, threadId]);

  const newChat = async () => {
    if (!user) return;
    const thread = await createThread(user.id);
    await navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
  };

  const remove = async (id: string) => {
    await deleteThread(id);
    setThreads((t) => t.filter((x) => x.id !== id));
    if (id === threadId) await navigate({ to: "/chat" });
  };

  const active = threads.find((t) => t.id === threadId);

  return (
    <div className="relative min-h-screen">
      <AmbientCanvas />
      <ChatHeader />
      <main className={`mx-auto grid w-full max-w-[1200px] gap-4 p-4 sm:p-6 ${user ? "lg:grid-cols-[260px_1fr]" : ""}`}>
        {user ? (
          <ThreadList
            threads={threads}
            activeId={threadId}
            onNew={() => void newChat().catch((e: Error) => toast.error(e.message))}
            onDelete={(id) => void remove(id).catch((e: Error) => toast.error(e.message))}
          />
        ) : null}

        <section className="glass flex h-[75vh] min-h-0 flex-col rounded-2xl">
          {loading ? null : !user ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-xs text-muted-foreground">Sign in to open this conversation.</p>
              <Button asChild size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          ) : initial ? (
            <ChatWindow
              key={threadId}
              threadId={threadId}
              userId={user.id}
              initialMessages={initial}
              isUntitled={!active || active.title === "New chat"}
              onTitle={(title) =>
                setThreads((t) => t.map((x) => (x.id === threadId ? { ...x, title } : x)))
              }
            />
          ) : (
            <p className="p-6 text-xs text-muted-foreground">Loading conversation...</p>
          )}
        </section>
      </main>
    </div>
  );
}
