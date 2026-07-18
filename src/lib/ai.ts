import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-sonnet-5';
export const FAST_MODEL = 'claude-haiku-4-5-20251001';

let client: Anthropic | null = null;

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * The whole AI surface degrades rather than crashes when no key is configured,
 * so the storefront and studio stay usable on a fresh clone.
 */
export function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export class MissingKeyError extends Error {
  constructor() {
    super('AI features need ANTHROPIC_API_KEY in .env.local');
    this.name = 'MissingKeyError';
  }
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
