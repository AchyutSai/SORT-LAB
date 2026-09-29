import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";

export interface ChatThread {
  id: string;
  title: string;
  updated_at: string;
}

export async function listThreads(): Promise<ChatThread[]> {
  const { data, error } = await supabase
    .from("chat_threads")
    .select("id,title,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createThread(userId: string, title = "New chat"): Promise<ChatThread> {
  const { data, error } = await supabase
    .from("chat_threads")
    .insert({ user_id: userId, title })
    .select("id,title,updated_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function renameThread(threadId: string, title: string) {
  const { error } = await supabase
    .from("chat_threads")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", threadId);
  if (error) throw new Error(error.message);
}

export async function deleteThread(threadId: string) {
  const { error } = await supabase.from("chat_threads").delete().eq("id", threadId);
  if (error) throw new Error(error.message);
}

export async function loadMessages(threadId: string): Promise<UIMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("message")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.message as unknown as UIMessage);
}

export async function saveMessage(threadId: string, userId: string, message: UIMessage) {
  const { error } = await supabase.from("chat_messages").insert({
    thread_id: threadId,
    user_id: userId,
    role: message.role,
    message: message as unknown as never,
  });
  if (error) throw new Error(error.message);
  await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);
}

export function messageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}
