import { createFileRoute } from "@tanstack/react-router";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM_PROMPT = `You are the SortLab assistant, a friendly general-purpose AI helper embedded in a sorting-algorithm benchmark studio.
Answer any question the user asks. When the topic touches sorting algorithms, complexity, or benchmarking, be precise and concrete.
Use markdown, keep answers focused, and show small code samples when they help.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createOpenAICompatible({
          name: "lovable",
          baseURL: "https://ai.gateway.lovable.dev/v1",
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        });

        try {
          const result = streamText({
            model: gateway("google/gemini-3.8-flash"),
            system: SYSTEM_PROMPT,
            messages: await convertToModelMessages(body.messages as UIMessage[]),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: body.messages as UIMessage[],
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "AI request failed";
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});
