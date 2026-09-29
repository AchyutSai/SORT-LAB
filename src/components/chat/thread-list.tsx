import { Link } from "@tanstack/react-router";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatThread } from "@/lib/chat-db";

export function ThreadList({
  threads,
  activeId,
  onNew,
  onDelete,
}: {
  threads: ChatThread[];
  activeId?: string;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className="glass flex max-h-[70vh] flex-col gap-2 rounded-2xl p-3 lg:max-h-none">
      <Button size="sm" className="w-full gap-2 text-xs" onClick={onNew}>
        <Plus className="h-4 w-4" /> New chat
      </Button>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {threads.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">No conversations yet.</p>
        ) : null}
        {threads.map((thread) => (
          <div
            key={thread.id}
            className={`group flex items-center gap-1 rounded-lg px-1 ${
              thread.id === activeId ? "bg-primary/10" : "hover:bg-muted/40"
            }`}
          >
            <Link
              to="/chat/$threadId"
              params={{ threadId: thread.id }}
              className="flex min-w-0 flex-1 items-center gap-2 px-1 py-2 text-xs"
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{thread.title}</span>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${thread.title}`}
              onClick={() => onDelete(thread.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </aside>
  );
}
