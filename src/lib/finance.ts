import { allProducts } from './catalog';
import type { Product } from './types';

/**
 * Fee model. These are the published rates at time of writing; they live here as
 * data rather than magic numbers so the studio can expose them as editable
 * assumptions instead of hard-coding somebody's guess into a chart.
 */
export const FEES = {
  etsy: {
    label: 'Etsy',
    transactionPct: 0.065, // 6.5% of item price + shipping
    paymentPct: 0.04, // payment processing
    paymentFixed: 0.3,
    listingFee: 0.2, // per listing, per 4 months
    offsiteAdsPct: 0.15, // only on attributed orders; applied at the configured share
    offsiteAdsShare: 0.2, // share of orders that get an offsite-ads charge
  },
  direct: {
    label: 'Gemystic Direct',
    transactionPct: 0,
    paymentPct: 0.015, // Stripe card rate
    paymentFixed: 0.25,
    listingFee: 0,
    offsiteAdsPct: 0,
    offsiteAdsShare: 0,
  },
} as const;

export type Channel = keyof typeof FEES;

/**
 * Default assumed cost basis as a fraction of retail. Real per-stone costs belong
 * in the overrides map; this keeps every downstream number honest about being an
 * estimate until the real figure is entered.
 */
export const DEFAULT_COST_RATIO = 0.42;

export interface CostOverrides {
  [productId: string]: number;
}

export function costBasis(p: Product, overrides: CostOverrides = {}): { cost: number; estimated: boolean } {
  const override = overrides[p.id];
  if (typeof override === 'number') return { cost: override, estimated: false };
  return { cost: round(p.priceUsd * DEFAULT_COST_RATIO), estimated: true };
}

export interface ChannelEconomics {
  channel: Channel;
  label: string;
  price: number;
  cost: number;
  fees: number;
  feeBreakdown: { name: string; amount: number }[];
  net: number;
  profit: number;
  marginPct: number;
}

/** What one sale of this stone actually nets on a given channel. */
export function economics(p: Product, channel: Channel, overrides: CostOverrides = {}): ChannelEconomics {
  const f = FEES[channel];
  const { cost } = costBasis(p, overrides);
  const price = p.priceUsd;

  const breakdown = [
    { name: 'Transaction fee', amount: round(price * f.transactionPct) },
    { name: 'Payment processing', amount: round(price * f.paymentPct + f.paymentFixed) },
    { name: 'Listing fee', amount: round(f.listingFee) },
    { name: 'Offsite ads (blended)', amount: round(price * f.offsiteAdsPct * f.offsiteAdsShare) },
  ].filter((b) => b.amount > 0);

  const fees = round(breakdown.reduce((a, b) => a + b.amount, 0));
  const net = round(price - fees);
  const profit = round(net - cost);

  return {
    channel,
    label: f.label,
    price,
    cost,
    fees,
    feeBreakdown: breakdown,
    net,
    profit,
    marginPct: price > 0 ? round((profit / price) * 100) : 0,
  };
}

/** Portfolio-level view: what the whole shelf is worth and what it would earn. */
export function inventorySummary(overrides: CostOverrides = {}) {
  const products = allProducts();

  const retail = sum(products.map((p) => p.priceUsd));
  const cost = sum(products.map((p) => costBasis(p, overrides).cost));
  const etsyNet = sum(products.map((p) => economics(p, 'etsy', overrides).net));
  const directNet = sum(products.map((p) => economics(p, 'direct', overrides).net));

  return {
    units: products.length,
    retailValue: round(retail),
    costValue: round(cost),
    grossMargin: round(retail - cost),
    grossMarginPct: round(((retail - cost) / retail) * 100),
    etsyNet: round(etsyNet),
    directNet: round(directNet),
    feeSavings: round(directNet - etsyNet),
    feeSavingsPct: round(((directNet - etsyNet) / etsyNet) * 100),
    avgPrice: round(retail / products.length),
  };
}

export function bySpecies(overrides: CostOverrides = {}) {
  const groups = new Map<string, Product[]>();
  for (const p of allProducts()) {
    if (!groups.has(p.species)) groups.set(p.species, []);
    groups.get(p.species)!.push(p);
  }

  return [...groups.entries()]
    .map(([species, items]) => {
      const retail = sum(items.map((p) => p.priceUsd));
      const cost = sum(items.map((p) => costBasis(p, overrides).cost));
      return {
        species,
        units: items.length,
        retailValue: round(retail),
        costValue: round(cost),
        profit: round(retail - cost),
        marginPct: round(((retail - cost) / retail) * 100),
        avgPrice: round(retail / items.length),
        shareOfInventory: 0, // filled below
      };
    })
    .map((row, _, all) => ({
      ...row,
      shareOfInventory: round((row.retailValue / sum(all.map((r) => r.retailValue))) * 100),
    }))
    .sort((a, b) => b.retailValue - a.retailValue);
}

/**
 * Flags stones whose price sits far from what comparable stock in the same
 * species and form is asking. Deliberately rule-based and explainable — the AI
 * layer narrates these findings rather than inventing them.
 */
export interface PricingFlag {
  product: Product;
  peerMedianPerCarat: number;
  actualPerCarat: number;
  deltaPct: number;
  direction: 'underpriced' | 'overpriced';
  suggestedPrice: number;
  rationale: string;
}

export function pricingFlags(threshold = 35): PricingFlag[] {
  const products = allProducts().filter((p) => p.caratWeight && p.caratWeight > 0);
  const flags: PricingFlag[] = [];

  for (const p of products) {
    // Two corrections that decide whether these flags are signal or noise:
    //
    // Weight — per-carat rates fall steeply with size, so a 2ct stone measured
    // against a 29ct one produces nonsense like "+1000% overpriced". Peers are
    // restricted to a half-to-double weight band.
    //
    // Variety — imperial topaz is worth several times sky blue topaz despite both
    // being "topaz". Compare within variety where the sample supports it, and only
    // fall back to species level when it doesn't.
    const inBand = (o: Product) =>
      o.id !== p.id &&
      o.form === p.form &&
      o.caratWeight! >= p.caratWeight! * 0.5 &&
      o.caratWeight! <= p.caratWeight! * 2;

    const varietyPeers = p.variety
      ? products.filter((o) => inBand(o) && o.variety === p.variety)
      : [];
    const peers =
      varietyPeers.length >= 3
        ? varietyPeers
        : products.filter((o) => inBand(o) && o.species === p.species);

    if (peers.length < 3) continue; // too thin a comparison to say anything useful
    const basis = varietyPeers.length >= 3 ? (p.variety as string) : p.species;

    const peerRates = peers.map((o) => o.priceUsd / o.caratWeight!).sort((a, b) => a - b);
    const median = peerRates[Math.floor(peerRates.length / 2)];
    const actual = p.priceUsd / p.caratWeight!;
    const deltaPct = round(((actual - median) / median) * 100);

    if (Math.abs(deltaPct) < threshold) continue;

    flags.push({
      product: p,
      peerMedianPerCarat: round(median),
      actualPerCarat: round(actual),
      deltaPct,
      direction: deltaPct < 0 ? 'underpriced' : 'overpriced',
      suggestedPrice: round(median * p.caratWeight!),
      rationale:
        deltaPct < 0
          ? `Asking ${money(actual)}/ct against a ${money(median)}/ct median across ${peers.length} ${basis} ${p.form} stones of similar weight. If the colour and clarity are in line with that group, there is room to move up.`
          : `Asking ${money(actual)}/ct against a ${money(median)}/ct median across ${peers.length} ${basis} ${p.form} stones of similar weight. Justified only if this stone is visibly better than the group — otherwise it will sit.`,
    });
  }

  return flags.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
}

/** Rough landed-cost helper for quoting international buyers. */
export function landedCost(price: number, destination: 'EU' | 'US' | 'UK' | 'OTHER') {
  const table = {
    EU: { duty: 0, vat: 0.21, shipping: 18 },
    US: { duty: 0, vat: 0, shipping: 26 },
    UK: { duty: 0, vat: 0.2, shipping: 22 },
    OTHER: { duty: 0.05, vat: 0, shipping: 32 },
  }[destination];

  const duty = round(price * table.duty);
  const vat = round((price + duty) * table.vat);
  return {
    price,
    shipping: table.shipping,
    duty,
    vat,
    total: round(price + table.shipping + duty + vat),
    note:
      destination === 'US'
        ? 'Loose unmounted gemstones enter the US duty-free under HTS 7103. No import VAT applies.'
        : destination === 'EU'
        ? 'Gemstones are duty-free within the EU but import VAT applies at the destination rate.'
        : destination === 'UK'
        ? 'Duty-free under UK Global Tariff; import VAT at 20% applies above the consignment threshold.'
        : 'Duty and tax vary by destination — this is an indicative estimate only.',
  };
}

function sum(ns: number[]) {
  return ns.reduce((a, b) => a + b, 0);
}
function round(n: number) {
  return Math.round(n * 100) / 100;
}
function money(n: number) {
  return `$${n.toFixed(2)}`;
}
