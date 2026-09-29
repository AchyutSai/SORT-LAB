import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";
import { Bot } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { messageText, renameThread, saveMessage } from "@/lib/chat-db";

export function ChatWindow({
  threadId,
  userId,
  initialMessages,
  isUntitled,
  onTitle,
}: {
  threadId: string;
  userId: string;
  initialMessages: UIMessage[];
  isUntitled: boolean;
  onTitle: (title: string) => void;
}) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const titled = useRef(!isUntitled);

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: ({ message }) => {
      void saveMessage(threadId, userId, message).catch((e: Error) =>
        toast.error(`Could not save reply: ${e.message}`),
      );
      textareaRef.current?.focus();
    },
    onError: (error) => toast.error(error.message || "The assistant could not respond."),
  });

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  const busy = status === "submitted" || status === "streaming";

  const submit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setText("");

    const userMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: trimmed }],
    };

    void sendMessage(userMessage);
    void saveMessage(threadId, userId, userMessage).catch((e: Error) =>
      toast.error(`Could not save message: ${e.message}`),
    );

    if (!titled.current) {
      titled.current = true;
      const title = trimmed.slice(0, 60);
      void renameThread(threadId, title)
        .then(() => onTitle(title))
        .catch(() => undefined);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<Bot className="h-6 w-6 text-primary" />}
              title="Ask me anything"
              description="Sorting theory, your benchmark results, code, or anything else."
            />
          ) : null}

          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                {message.role === "assistant" ? (
                  <MessageResponse>{messageText(message)}</MessageResponse>
                ) : (
                  <p className="whitespace-pre-wrap">{messageText(message)}</p>
                )}
              </MessageContent>
            </Message>
          ))}

          {status === "submitted" ? (
            <Shimmer className="px-2 text-sm">Thinking...</Shimmer>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl p-4">
        <PromptInput
          onSubmit={(message, event) => {
            event.preventDefault();
            void submit(message.text ?? text);
          }}
        >
          <PromptInputTextarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message the SortLab assistant..."
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={!text.trim() && !busy} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
