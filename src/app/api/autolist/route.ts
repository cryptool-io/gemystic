import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { anthropic, hasApiKey, MODEL, extractJson } from '@/lib/ai';
import { allProducts, allSpecies, getSpecies } from '@/lib/catalog';

export const runtime = 'nodejs';
export const maxDuration = 60;

export interface DraftListing {
  title: string;
  species: string;
  variety: string | null;
  caratWeight: number | null;
  cut: string | null;
  colour: string;
  form: string;
  treatment: string;
  description: string;
  bulletPoints: string[];
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  etsyTags: string[];
  suggestedPriceUsd: number;
  priceRationale: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

/**
 * Comparable stones give the model a real pricing anchor. Without this it will
 * happily invent a number that has nothing to do with what this shop charges.
 */
function comparables(speciesHint?: string) {
  const pool = speciesHint
    ? allProducts().filter((p) => p.species === speciesHint)
    : allProducts();

  const sample = (pool.length >= 6 ? pool : allProducts())
    .filter((p) => p.caratWeight)
    .sort((a, b) => (b.caratWeight ?? 0) - (a.caratWeight ?? 0))
    .slice(0, 25);

  return sample.map((p) => ({
    title: p.title,
    species: p.species,
    variety: p.variety,
    carat: p.caratWeight,
    form: p.form,
    cut: p.cut,
    priceUsd: p.priceUsd,
    perCarat: p.caratWeight ? Number((p.priceUsd / p.caratWeight).toFixed(2)) : null,
  }));
}

const SYSTEM = `You write listings for Gemystic, a gemstone studio in Peshawar, Pakistan that mines, cuts and sells natural stones.

Voice: specific, unhurried, and confident without hype. You are a cutter describing a stone to someone who knows gems, not a marketer. Never use "stunning", "gorgeous", "must-have", "perfect for anyone", or exclamation marks. Concrete detail beats adjectives every time.

Hard rules:
- NEVER invent a certification, an origin, or a treatment status. If the input does not state it, use the species norm and flag it in warnings.
- NEVER claim a stone is untreated unless the input says so explicitly. Most emeralds are oiled; most rubies and sapphires are heated; blue topaz is irradiated. State the norm and flag that lab confirmation is pending.
- NEVER describe a gemstone as an investment or say it will appreciate.
- Metaphysical or chakra claims must be framed as tradition ("traditionally associated with"), never as fact or as health benefit.
- Price in USD. It must sit inside the range implied by the comparable stones provided. Explain the per-carat logic in priceRationale.

SEO requirements:
- title: 60-90 chars, front-loaded with the words a buyer actually searches — species, weight, cut. No pipes or emoji.
- metaTitle: max 60 chars. metaDescription: 140-158 chars, with a concrete reason to click.
- keywords: 10-14 real search phrases, mixing head terms ("natural emerald") and long-tail ("1ct swat emerald for engagement ring").
- etsyTags: exactly 13 tags, each max 20 characters, no repeats.
- description: 3-4 short paragraphs in plain prose. Cover what the stone is, what it looks like in the hand, the treatment position, and what it suits. Markdown is not needed.

Return ONLY a JSON object matching the requested schema. No prose outside it.`;

export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: 'Auto-listing needs ANTHROPIC_API_KEY in .env.local.' },
      { status: 503 },
    );
  }

  const { notes, imageUrl, speciesHint } = (await req.json()) as {
    notes?: string;
    imageUrl?: string;
    speciesHint?: string;
  };

  if (!notes && !imageUrl) {
    return NextResponse.json(
      { error: 'Provide rough notes about the stone, an image, or both.' },
      { status: 400 },
    );
  }

  const speciesRef = speciesHint ? getSpecies(speciesHint) : null;

  const instruction = `Draft a listing for this stone.

${notes ? `Cutter's notes:\n${notes}` : 'No written notes — work from the photograph.'}

${speciesRef ? `The cutter identified this as ${speciesRef.name}. Reference data:\n${JSON.stringify({
    hardness: speciesRef.hardness,
    typicalTreatment: speciesRef.typicalTreatment,
    priceDriver: speciesRef.priceDriver,
    care: speciesRef.care,
    birthstone: speciesRef.birthstone,
  })}` : ''}

Comparable stones currently listed in this shop (use these to anchor the price — our per-carat rates, not global market rates):
${JSON.stringify(comparables(speciesHint), null, 1)}

Valid species keys: ${allSpecies().map(([k]) => k).join(', ')}
Valid forms: faceted, cabochon, specimen, rough, parcel, ring, pendant

Return JSON exactly matching:
{
  "title": string,
  "species": string,
  "variety": string | null,
  "caratWeight": number | null,
  "cut": string | null,
  "colour": string,
  "form": string,
  "treatment": string,
  "description": string,
  "bulletPoints": string[],
  "metaTitle": string,
  "metaDescription": string,
  "keywords": string[],
  "etsyTags": string[],
  "suggestedPriceUsd": number,
  "priceRationale": string,
  "confidence": "high" | "medium" | "low",
  "warnings": string[]
}

"warnings" must list anything you assumed rather than knew — unconfirmed treatment, weight estimated from the photo, origin inferred. Be strict with yourself here; the cutter checks this field before publishing.`;

  const content: Anthropic.ContentBlockParam[] = [];

  if (imageUrl) {
    content.push({
      type: 'image',
      source: { type: 'url', url: imageUrl },
    });
  }
  content.push({ type: 'text', text: instruction });

  try {
    const res = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 2500,
      system: SYSTEM,
      messages: [{ role: 'user', content }],
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const draft = extractJson<DraftListing>(text);

    // The model is good but not authoritative on our own constraints — enforce
    // the Etsy tag limit here rather than trusting the prompt.
    draft.etsyTags = (draft.etsyTags ?? [])
      .map((t) => t.slice(0, 20))
      .filter((t, i, a) => a.indexOf(t) === i)
      .slice(0, 13);

    return NextResponse.json({ draft, usage: res.usage });
  } catch (err) {
    console.error('[autolist]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Could not draft the listing: ${message}` },
      { status: 502 },
    );
  }
}
