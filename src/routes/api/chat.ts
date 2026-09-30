import { createFileRoute } from "@tanstack/react-router";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText, type UIMessage, type LanguageModelV1 } from "ai";

const SYSTEM_PROMPT = `You are the SortLab assistant, a friendly general-purpose AI helper embedded in a sorting-algorithm benchmark studio.
Answer any question the user asks. When the topic touches sorting algorithms, complexity, or benchmarking, be precise and concrete.
Use markdown, keep answers focused, and show small code samples when they help.`;

function resolveModel(): LanguageModelV1 {
  // 1. Google Gemini
  const geminiKey = process.env["GEMINI_API_KEY"] || process.env["GOOGLE_GENERATIVE_AI_API_KEY"];
  if (geminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    const modelName = process.env["AI_MODEL"] || "gemini-1.5-flash";
    return google(modelName);
  }

  // 2. Anthropic Claude
  const anthropicKey = process.env["ANTHROPIC_API_KEY"] || process.env["CLAUDE_API_KEY"];
  if (anthropicKey) {
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    const modelName = process.env["AI_MODEL"] || "claude-3-5-haiku-latest";
    return anthropic(modelName);
  }

  // 3. OpenAI
  const openaiKey = process.env["OPENAI_API_KEY"];
  if (openaiKey) {
    const openai = createOpenAI({
      apiKey: openaiKey,
      baseURL: process.env["AI_BASE_URL"],
    });
    const modelName = process.env["AI_MODEL"] || "gpt-4o-mini";
    return openai(modelName);
  }

  // 4. Generic OpenAI-Compatible (Local Ollama, Groq, OpenRouter, etc.)
  const genericKey = process.env["AI_API_KEY"];
  if (genericKey || process.env["AI_BASE_URL"]) {
    const provider = createOpenAICompatible({
      name: "custom-ai",
      baseURL: process.env["AI_BASE_URL"] || "https://api.openai.com/v1",
      headers: genericKey ? { Authorization: `Bearer ${genericKey}` } : {},
    });
    const modelName = process.env["AI_MODEL"] || "gpt-4o-mini";
    return provider(modelName);
  }

  throw new Error(
    "Missing AI API key. Please add GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY to your .env file."
  );
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        try {
          const model = resolveModel();
          const result = streamText({
            model,
            system: SYSTEM_PROMPT,
            messages: await convertToModelMessages(body.messages as UIMessage[]),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: body.messages as UIMessage[],
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "AI request failed";
          console.error("[AI Chat Error]:", message);
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});
