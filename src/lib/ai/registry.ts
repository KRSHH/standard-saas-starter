import { createOpenAI } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { createProviderRegistry } from "ai";

/**
 * AI provider registry — one place to register every LLM provider.
 * Models are referenced by prefixed ID strings, split on "/".
 *
 * Add new providers here (Google, Mistral, Groq) without touching call sites.
 * The default model is set via AI_DEFAULT_MODEL env var.
 */
export const registry = createProviderRegistry(
  {
    anthropic,
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  },
  { separator: "/" },
);

/**
 * Resolve a model from a prefixed string (e.g. "anthropic/claude-sonnet-4-5").
 * Falls back to AI_DEFAULT_MODEL, then to Anthropic Sonnet.
 *
 * Cast is required: the registry's `languageModel` overload is typed for
 * literal provider prefixes known at compile time; we resolve at runtime
 * from env, so we assert the union shape the registry expects.
 */
export function getModel(modelId?: string) {
  const id =
    modelId ?? process.env.AI_DEFAULT_MODEL ?? "anthropic/claude-sonnet-4-5";
  const separator = id.indexOf("/");
  const provider = id.slice(0, separator);
  const providerModelId = id.slice(separator + 1);

  if (separator < 1 || !providerModelId) {
    throw new Error(`Invalid AI model ID: ${id}`);
  }
  if (provider === "anthropic") return anthropic(providerModelId);
  if (provider === "openai")
    return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(
      providerModelId,
    );
  throw new Error(`Unsupported AI provider: ${provider}`);
}
