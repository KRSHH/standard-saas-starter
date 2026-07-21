import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";

import { getModel } from "@/lib/ai/registry";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/security/rate-limit";

/**
 * AI chat route — streaming, authenticated, rate-limited.
 * Frontend uses useChat from @ai-sdk/react against this endpoint.
 */
export const maxDuration = 30;

export async function POST(req: Request) {
  // Authenticate — no anonymous AI calls (cost control).
  await getCurrentUser();

  // Rate limit: 20 messages / minute / user (IP-based until auth id is cheaper to read).
  const { limited, headers } = await rateLimit(req, {
    namespace: "chat",
    limit: 20,
    window: 60,
  });
  if (limited) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { "content-type": "application/json", ...headers },
    });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: getModel(),
    system: `You are a helpful AI assistant for a Next.js SaaS application. Be concise and practical. If asked about pricing, plans start at $19/mo (Starter) and $49/mo (Pro), with a 14-day free trial.`,
    messages: await convertToModelMessages(messages),
  });

  const stream = createUIMessageStreamResponse({
    stream: result.toUIMessageStream(),
  });

  // Attach rate-limit headers to the successful response too.
  for (const [k, v] of Object.entries(headers)) {
    stream.headers.set(k, v);
  }
  return stream;
}
