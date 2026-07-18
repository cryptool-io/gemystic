import Anthropic from '@anthropic-ai/sdk';
import { optionalRequire, MissingDependencyError } from './services/optional';

/**
 * AI provider chain.
 *
 * The platform's AI features run against whichever providers are configured,
 * in order, falling through on failure:
 *
 *   1. `anthropic`, direct API            (ANTHROPIC_API_KEY)
 *   2. `bedrock`. AWS Bedrock backup    (BEDROCK_MODEL_ID + AWS credentials;
 *                     npm i @aws-sdk/client-bedrock-runtime)
 *   3. `openai`, any OpenAI-compatible endpoint, which is how "free models"
 *                     plug in: Groq, OpenRouter's free tier, a local Ollama, *                     (AI_OPENAI_BASE_URL, AI_OPENAI_API_KEY, AI_OPENAI_MODEL)
 *
 * Order is set with AI_PROVIDER_CHAIN, e.g. `openai,bedrock` to run free models
 * first with Bedrock as the paid backup. Default: anthropic,bedrock,openai.
 *
 * Capability honesty: the customer-chat route uses tool calls and the
 * auto-lister sends images. Anthropic and Bedrock (running Anthropic models)
 * support both; a generic OpenAI-compatible endpoint is only offered plain-text
 * requests, the chain SKIPS a provider that cannot handle the request rather
 * than sending it something it will mangle.
 */

export const MODEL = process.env.AI_MODEL || 'claude-sonnet-5';
export const FAST_MODEL = 'claude-haiku-4-5-20251001';

type Provider = 'anthropic' | 'bedrock' | 'openai';

function chain(): Provider[] {
  const raw = (process.env.AI_PROVIDER_CHAIN || 'anthropic,bedrock,openai')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is Provider => ['anthropic', 'bedrock', 'openai'].includes(s));
  return raw.length ? raw : ['anthropic'];
}

function providerConfigured(p: Provider): boolean {
  switch (p) {
    case 'anthropic':
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case 'bedrock':
      return Boolean(process.env.BEDROCK_MODEL_ID);
    case 'openai':
      return Boolean(process.env.AI_OPENAI_BASE_URL && process.env.AI_OPENAI_MODEL);
  }
}

/** Any provider available? Drives the graceful-degradation messages in the UI. */
export function hasApiKey(): boolean {
  return chain().some(providerConfigured);
}

let anthropicClient: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  anthropicClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

export class MissingKeyError extends Error {
  constructor() {
    super('No AI provider configured, set ANTHROPIC_API_KEY, BEDROCK_MODEL_ID or AI_OPENAI_* in .env.local');
    this.name = 'MissingKeyError';
  }
}

interface RequestTraits {
  hasTools: boolean;
  hasImages: boolean;
}

function traitsOf(params: Anthropic.MessageCreateParamsNonStreaming): RequestTraits {
  const hasTools = Boolean(params.tools && params.tools.length > 0);
  const hasImages = params.messages.some(
    (m) => Array.isArray(m.content) && m.content.some((b) => (b as { type?: string }).type === 'image'),
  );
  return { hasTools, hasImages };
}

function providerSupports(p: Provider, t: RequestTraits): boolean {
  if (p === 'openai') return !t.hasTools && !t.hasImages;
  return true; // anthropic + bedrock(anthropic models) take the full format
}

/**
 * The single entry point the API routes use. Same signature and return shape as
 * `anthropic().messages.create(...)`, so swapping providers never touches the
 * feature code.
 */
export async function aiMessage(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  const traits = traitsOf(params);
  const errors: string[] = [];

  for (const provider of chain()) {
    if (!providerConfigured(provider)) continue;
    if (!providerSupports(provider, traits)) continue;

    try {
      switch (provider) {
        case 'anthropic':
          return await anthropic().messages.create(params);
        case 'bedrock':
          return await bedrockMessage(params);
        case 'openai':
          return await openAiCompatMessage(params);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider}: ${msg}`);
      console.error(`[ai] ${provider} failed, trying next provider ,`, msg);
    }
  }

  if (errors.length === 0) throw new MissingKeyError();
  throw new Error(`All AI providers failed. ${errors.join(' | ')}`);
}

/**
 * AWS Bedrock running Anthropic models. The InvokeModel body IS the Anthropic
 * messages format (with anthropic_version instead of model), so tool use and
 * images work identically. Credentials come from the standard AWS chain.
 */
async function bedrockMessage(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  interface BedrockModule {
    BedrockRuntimeClient: new (cfg: { region: string }) => {
      send(cmd: unknown): Promise<{ body: Uint8Array }>;
    };
    InvokeModelCommand: new (input: Record<string, unknown>) => unknown;
  }

  const bedrock = optionalRequire<BedrockModule>('@aws-sdk/client-bedrock-runtime');
  if (!bedrock) throw new MissingDependencyError('@aws-sdk/client-bedrock-runtime', 'bedrock');

  const { model: _model, ...rest } = params;
  const client = new bedrock.BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'eu-west-1',
  });

  const res = await client.send(
    new bedrock.InvokeModelCommand({
      modelId: process.env.BEDROCK_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({ anthropic_version: 'bedrock-2023-05-31', ...rest }),
    }),
  );

  return JSON.parse(new TextDecoder().decode(res.body)) as Anthropic.Message;
}

/**
 * Generic OpenAI-compatible /chat/completions, the adapter for free models.
 * Text-only by contract (the chain never routes tool/image requests here).
 * Translates request and response so callers still see the Anthropic shape.
 */
async function openAiCompatMessage(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  const base = process.env.AI_OPENAI_BASE_URL!.replace(/\/$/, '');

  const messages: { role: string; content: string }[] = [];
  if (params.system) {
    messages.push({
      role: 'system',
      content: typeof params.system === 'string' ? params.system : params.system.map((b) => b.text).join('\n'),
    });
  }
  for (const m of params.messages) {
    const content =
      typeof m.content === 'string'
        ? m.content
        : m.content
            .filter((b): b is Anthropic.TextBlockParam => (b as { type?: string }).type === 'text')
            .map((b) => b.text)
            .join('\n');
    messages.push({ role: m.role, content });
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.AI_OPENAI_API_KEY
        ? { authorization: `Bearer ${process.env.AI_OPENAI_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      model: process.env.AI_OPENAI_MODEL,
      max_tokens: params.max_tokens,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`openai-compat HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = (await res.json()) as {
    choices: { message: { content: string }; finish_reason: string }[];
    usage?: { prompt_tokens: number; completion_tokens: number };
  };

  return {
    id: `openai-compat-${Date.now()}`,
    type: 'message',
    role: 'assistant',
    model: process.env.AI_OPENAI_MODEL!,
    content: [{ type: 'text', text: data.choices[0]?.message?.content ?? '', citations: null }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      cache_creation: null,
      server_tool_use: null,
      service_tier: null,
      inference_geo: null,
    },
  } as Anthropic.Message;
}

/** Pulls the first JSON object out of a model reply, tolerating ```json fences. */
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error(`No JSON found in model output: ${text.slice(0, 200)}`);
  return JSON.parse(raw.slice(start, end + 1)) as T;
}
