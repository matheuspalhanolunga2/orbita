/**
 * AI integration layer for "Meu Assistente".
 *
 * Status: NOT CONNECTED. The app ships with a deterministic rules engine (src/domain/assistant.ts).
 * To enable natural-language help later:
 *   1. Deploy a server-side endpoint (e.g. a Supabase Edge Function) that holds the AI provider key.
 *      API keys must never be bundled in the frontend.
 *   2. Set VITE_AI_ENDPOINT to that URL. The endpoint receives `AIRequest` and returns `AIResponse`.
 * See docs/ARCHITECTURE.md → "Assistente e IA".
 */
import type { assistantContext } from '../domain/assistant';

export type AssistantContext = ReturnType<typeof assistantContext>;
export interface AIRequest { task: 'organize-day' | 'study-plan' | 'free-question'; question?: string; context: AssistantContext }
export interface AIResponse { answer: string }

export interface AIProvider {
  id: string;
  label: string;
  ask(req: AIRequest, accessToken?: string): Promise<AIResponse>;
}

const endpoint = import.meta.env.VITE_AI_ENDPOINT as string | undefined;

/** Generic provider that forwards requests to your own backend endpoint. */
const endpointProvider: AIProvider = {
  id: 'endpoint',
  label: 'Endpoint próprio',
  async ask(req, accessToken) {
    const res = await fetch(endpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`Assistente indisponível (${res.status})`);
    return (await res.json()) as AIResponse;
  },
};

export const aiProvider: AIProvider | null = endpoint ? endpointProvider : null;
export const aiConfigured = !!aiProvider;
