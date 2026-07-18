import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { aiMessage, hasApiKey, MODEL } from '@/lib/ai';
import { inventorySummary, bySpecies, pricingFlags, economics, FEES } from '@/lib/finance';
import { allProducts } from '@/lib/catalog';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `You are the financial analyst for Gemystic, a gemstone studio in Peshawar, Pakistan currently selling on Etsy and launching its own storefront.

You are given real computed figures from their inventory. Your job is to interpret them, not to recalculate them.

Rules:
- Work only from the numbers provided. Never invent a figure. If something needed to answer isn't in the data, say what's missing.
- Cost figures are estimates derived from an assumed cost ratio unless marked otherwise. Say so when it materially affects a conclusion.
- Be direct and specific. "Emerald is 41% of inventory value but 22% of units" beats "emerald is significant".
- Lead with the finding that would change a decision. No throat-clearing.
- Give at most 3 recommendations, each concrete enough to act on this week.
- Never give investment advice or forecast gemstone market prices.
- Plain prose, short paragraphs. Use a compact markdown table only when comparing more than three rows.`;

export async function POST(req: NextRequest) {
  const { question } = (await req.json()) as { question?: string };

  const summary = inventorySummary();
  const species = bySpecies();
  const flags = pricingFlags();

  // Fee comparison on a representative mid-priced stone, so the model can talk
  // about channel economics concretely rather than in percentages.
  const median = [...allProducts()].sort((a, b) => a.priceUsd - b.priceUsd)[
    Math.floor(allProducts().length / 2)
  ];

  const data = {
    inventory: summary,
    bySpecies: species,
    channelComparison: {
      exampleStone: { title: median.title, price: median.priceUsd },
      etsy: economics(median, 'etsy'),
      direct: economics(median, 'direct'),
      feeSchedule: FEES,
    },
    pricingFlags: flags.slice(0, 12).map((f) => ({
      title: f.product.title,
      species: f.product.species,
      price: f.product.priceUsd,
      carat: f.product.caratWeight,
      actualPerCarat: f.actualPerCarat,
      peerMedianPerCarat: f.peerMedianPerCarat,
      deltaPct: f.deltaPct,
      direction: f.direction,
      suggestedPrice: f.suggestedPrice,
    })),
    context: {
      etsySalesToDate: 7,
      etsyRating: '5.0 from 4 reviews',
      monthsTrading: 8,
      note: 'Cost basis is estimated at 42% of retail except where a real cost has been entered.',
    },
  };

  if (!hasApiKey()) {
    // The dashboard is still fully usable without a key, it just loses the narrative.
    return NextResponse.json({
      analysis: null,
      data,
      error: 'Add ANTHROPIC_API_KEY to .env.local for the written analysis. All figures below are computed locally and are accurate without it.',
    });
  }

  const prompt = `${question?.trim() || 'Give me the state of the business: what stands out in this inventory, where is money being left on the table, and what should I do first?'}

Computed figures:
${JSON.stringify(data, null, 1)}`;

  try {
    const res = await aiMessage({
      model: MODEL,
      max_tokens: 1600,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const analysis = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    return NextResponse.json({ analysis, data });
  } catch (err) {
    console.error('[finance]', err);
    return NextResponse.json({
      analysis: null,
      data,
      error: 'The analyst is temporarily unavailable, the figures below are still accurate.',
    });
  }
}
