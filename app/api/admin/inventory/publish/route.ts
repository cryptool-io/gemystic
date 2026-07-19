import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import type Anthropic from '@anthropic-ai/sdk';
import { requireRoleApi } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import { aiMessage, hasApiKey, MODEL, extractJson } from '@/lib/ai';
import { allProducts } from '@/lib/catalog';
import { updateChannel } from '@/lib/inventory/intake';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Turn an inventory stone into a shop listing (owner steps 2 and 3).
 *
 * Two actions, deliberately separate. `generate` writes the copy, the SEO block
 * and the Etsy tag set into the record but changes nothing about whether it is
 * for sale. `publish` is what actually puts it in the shop. Generating and
 * publishing in one click would mean AI copy going live unread, and the whole
 * point of the ai_reviewed_at gate is that a person sees it first.
 */
const SYSTEM = `You write gemstone listings for Gemystic, a studio in Peshawar, Pakistan that mines, cuts and sells natural stones.

Voice: specific, unhurried, confident without hype. A cutter describing a stone to someone who knows gems. Never use "stunning", "gorgeous", "must-have", "perfect for anyone", or exclamation marks. Concrete detail beats adjectives.

Hard rules:
- Never invent facts. Use only the measurements and details provided.
- Never claim a treatment, origin or certification that was not given.
- Never use the em dash character anywhere in your output.
- A rough parcel is a lot of many stones: describe it as a parcel, give the weight range per stone, and never imply it is one cut gem.
- Site keywords are natural search phrases for this website. Etsy tags follow Etsy's own conventions: at most 13, each at most 20 characters, lowercase.

Return ONLY valid JSON:
{
  "title": "at most 70 characters",
  "description": "2 to 3 short paragraphs, plain text",
  "seoTitle": "at most 60 characters",
  "seoDescription": "140 to 160 characters",
  "seoKeywords": ["6 to 10 phrases"],
  "etsyTags": ["up to 13 tags, 20 characters or fewer"]
}`;

export async function POST(req: NextRequest) {
  const denied = await requireRoleApi('admin');
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const id = String(body.productId ?? '');
  const action = String(body.action ?? 'publish');

  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: true, category: { select: { name: true, slug: true } } },
  });
  if (!product) return NextResponse.json({ error: 'Stone not found.' }, { status: 404 });

  // ── Fill the listing with AI ───────────────────────────────────────────────
  if (action === 'generate') {
    if (!hasApiKey()) {
      return NextResponse.json(
        {
          error:
            'No AI provider configured. Set AI_OPENAI_* (Groq or OpenRouter free tier), BEDROCK_MODEL_ID or ANTHROPIC_API_KEY in .env.local.',
        },
        { status: 503 },
      );
    }

    // Comparable stones keep the copy consistent with the rest of the shop.
    const comparables = allProducts()
      .filter((p) => product.title.toLowerCase().includes(p.species))
      .slice(0, 5)
      .map((p) => ({ title: p.title, priceUsd: p.priceUsd }));

    const facts = {
      currentTitle: product.title,
      stoneType: product.stoneType,
      category: product.category?.name,
      colour: product.colour,
      shape: product.shape,
      caratWeight: product.caratWeight ? Number(product.caratWeight) : null,
      totalWeightGrams: product.weightGrams ? Number(product.weightGrams) : null,
      perStoneWeightRangeGrams:
        product.weightFromG && product.weightToG
          ? [Number(product.weightFromG), Number(product.weightToG)]
          : null,
      dimensionsMm: {
        length: product.lengthMm ? Number(product.lengthMm) : null,
        width: product.widthMm ? Number(product.widthMm) : null,
        thickness: product.heightMm ? Number(product.heightMm) : null,
        diameter: product.diameterMm ? Number(product.diameterMm) : null,
      },
      priceUsd: Number(product.price),
      pricePerUnit: product.unitPrice ? `${Number(product.unitPrice)} per ${product.priceUnit}` : null,
      origin: product.originCountry,
      treatment: product.treatment,
      certified: product.certified,
      shipsFrom: product.shipsFrom === 'TH' ? 'Thailand' : 'Pakistan',
      photographs: product.images.length,
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

      const etsyTags = (draft.etsyTags ?? [])
        .map((t) => String(t).toLowerCase().trim().slice(0, 20))
        .filter(Boolean)
        .slice(0, 13);

      await prisma.product.update({
        where: { id },
        data: {
          title: draft.title || product.title,
          description: draft.description ?? product.description,
          seoTitle: draft.seoTitle ?? null,
          seoDescription: draft.seoDescription ?? null,
          seoKeywords: draft.seoKeywords ?? [],
          tags: etsyTags,
          aiGenerated: true,
          // Left null on purpose: a person marks it reviewed by publishing.
          aiReviewedAt: null,
        },
      });

      return NextResponse.json({ ok: true, draft: { ...draft, etsyTags } });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Generation failed.' },
        { status: 502 },
      );
    }
  }

  // ── Publish or unpublish ───────────────────────────────────────────────────
  if (action === 'publish') {
    if (product.images.length === 0) {
      return NextResponse.json(
        { error: 'Upload at least one photograph before putting this stone in the shop.' },
        { status: 400 },
      );
    }
    if (Number(product.price) <= 0) {
      return NextResponse.json({ error: 'Set a selling price first.' }, { status: 400 });
    }

    await prisma.product.update({
      where: { id },
      data: {
        status: 'active',
        publishedAt: product.publishedAt ?? new Date(),
        intakeStatus: 'uploaded',
        // Publishing is the human review the AI gate was waiting for.
        aiReviewedAt: product.aiGenerated ? new Date() : product.aiReviewedAt,
      },
    });
    await updateChannel(id, 'web', { status: 'listed' });

    revalidatePath('/shop');
    revalidatePath(`/gem/${product.slug}`);
    revalidatePath('/admin/inventory');
    return NextResponse.json({ ok: true, slug: product.slug });
  }

  if (action === 'unpublish') {
    await prisma.product.update({ where: { id }, data: { status: 'draft' } });
    await updateChannel(id, 'web', { status: 'not_listed' });
    revalidatePath('/shop');
    revalidatePath(`/gem/${product.slug}`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
