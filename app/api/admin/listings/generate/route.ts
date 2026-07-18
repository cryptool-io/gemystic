import { NextRequest, NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { requireRoleApi } from '@/lib/auth/guard';
import { getProduct, getSpecies, allProducts } from '@/lib/catalog';
import { aiMessage, hasApiKey, MODEL, extractJson } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Per-stone content generation (owner step 3): one call produces the site copy,
 * the site SEO block AND the Etsy tag set, because they are written from the
 * same facts but follow different rules, and generating them separately is how
 * they drift apart.
 *
 * Output is a DRAFT. It lands in the editor for review and is never published
 * without the owner pressing save, which is the ai_reviewed_at gate.
 */
const SYSTEM = `You write gemstone listings for Gemystic, a studio in Peshawar, Pakistan that mines, cuts and sells natural stones.

Voice: specific, unhurried, confident without hype. A cutter describing a stone to someone who knows gems. Never use "stunning", "gorgeous", "must-have", "perfect for anyone", or exclamation marks. Concrete detail beats adjectives.

Hard rules:
- Never invent facts. Use only the specifications provided.
- Never claim a treatment status that was not given.
- Never use the em dash character anywhere in your output.
- Site keywords describe how buyers search this website (natural language, includes the species and cut).
- Etsy tags follow Etsy's own conventions: at most 13, each at most 20 characters, lowercase, multi-word phrases buyers type into Etsy search. They are NOT the same list as the site keywords.

Return ONLY valid JSON with this shape:
{
  "title": "string, at most 70 characters",
  "description": "2 to 3 short paragraphs, plain text, no markdown",
  "seoTitle": "at most 60 characters",
  "seoDescription": "140 to 160 characters",
  "seoKeywords": ["6 to 10 site search phrases"],
  "etsyTags": ["up to 13 Etsy tags, each 20 characters or fewer"]
}`;

export async function POST(req: NextRequest) {
  const denied = await requireRoleApi('admin');
  if (denied) return denied;

  if (!hasApiKey()) {
    return NextResponse.json(
      {
        error:
          'No AI provider configured. Set AI_OPENAI_* (Groq or OpenRouter free tier), BEDROCK_MODEL_ID or ANTHROPIC_API_KEY in .env.local.',
      },
      { status: 503 },
    );
  }

  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const product = getProduct(String(body.slug ?? ''));
  if (!product) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

  const species = getSpecies(product.species);

  // Comparable stones from this shop keep the copy consistent with how the rest
  // of the catalogue describes the same species.
  const comparables = allProducts()
    .filter((p) => p.species === product.species && p.slug !== product.slug)
    .slice(0, 5)
    .map((p) => ({ title: p.title, priceUsd: p.priceUsd }));

  const facts = {
    currentTitle: product.title,
    species: species?.name ?? product.species,
    variety: product.variety,
    form: product.formLabel,
    caratWeight: product.caratWeight,
    gramWeight: product.gramWeight,
    cut: product.cut,
    colour: product.color,
    origin: product.origin,
    treatment: product.treatment,
    certified: product.certified,
    priceUsd: product.priceUsd,
    shipsFrom: product.shipsFrom === 'TH' ? 'Thailand' : 'Pakistan',
    speciesNotes: species
      ? { hardness: species.hardness, care: species.care, birthstone: species.birthstone }
      : null,
    comparables,
  };

  try {
    const res = await aiMessage({
      model: MODEL,
      max_tokens: 1600,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Write the listing for this stone. Facts:\n${JSON.stringify(facts, null, 2)}`,
        },
      ],
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const draft = extractJson<{
      title: string;
      description: string;
      seoTitle: string;
      seoDescription: string;
      seoKeywords: string[];
      etsyTags: string[];
    }>(text);

    // Enforce Etsy's limits here rather than trusting the model to count.
    const etsyTags = (draft.etsyTags ?? [])
      .map((t) => String(t).toLowerCase().trim().slice(0, 20))
      .filter(Boolean)
      .slice(0, 13);

    return NextResponse.json({ ...draft, etsyTags });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed.' },
      { status: 502 },
    );
  }
}
