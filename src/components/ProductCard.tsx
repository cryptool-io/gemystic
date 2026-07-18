import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { getSpecies } from '@/lib/catalog';
import { effectivePrice } from '@/lib/campaigns/store';
import { Price, PricePerCarat } from '@/components/currency/Price';

/**
 * Product tile.
 *
 * Gemstone buyers compare on specifications, not on a name and a price, the
 * questions that decide a purchase are weight, cut, origin and treatment, and a
 * tile that omits them forces a round trip to the detail page for every
 * candidate. So the tile carries the full comparison set:
 *
 *   weight · cut · colour · origin · treatment · price per carat · certification
 *
 * `compact` drops the spec grid for dense contexts (assistant results, related
 * items) where the tile is a pointer rather than a comparison.
 */
export async function ProductCard({
  p,
  priority = false,
  compact = false,
}: {
  p: Product;
  priority?: boolean;
  compact?: boolean;
}) {
  const species = getSpecies(p.species);
  const weight = p.caratWeight ? `${p.caratWeight} ct` : p.gramWeight ? `${p.gramWeight} g` : null;
  // Campaign-aware price in USD; conversion to the visitor's currency happens
  // in the <Price> client component so one code path owns both calculations.
  const pricing = await effectivePrice(p);

  // "Heat treated" and "Unheated" matter to buyers; the species-default boilerplate
  // is too long for a tile, so only show treatment when it is a short, real answer.
  const shortTreatment = p.treatment && p.treatment.length <= 28 ? p.treatment : null;

  return (
    <article className="card group flex h-full flex-col overflow-hidden transition hover:border-brand-ring hover:shadow-lift">
      <Link href={`/gem/${p.slug}`} className="flex h-full flex-col">
        <div className="sheen relative aspect-square overflow-hidden bg-surface-2">
          <Image
            src={p.image}
            alt={`${p.title}, natural ${p.color.toLowerCase()} ${species?.name.toLowerCase() ?? ''} from ${p.origin}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 260px"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            priority={priority}
          />

          {p.certified && (
            <span className="absolute left-2 top-2 rounded bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
              Certified
            </span>
          )}

          <span className="absolute bottom-2 left-2 rounded bg-surface/90 px-2 py-0.5 text-[10px] font-medium text-brand-deep backdrop-blur">
            One of a kind
          </span>

          {p.stock === 0 && (
            <span className="absolute inset-0 z-10 flex items-center justify-center bg-fg/35 backdrop-blur-[1px]">
              <span className="rounded-md border-2 border-white/90 px-5 py-1.5 text-lg font-bold uppercase tracking-[0.25em] text-white shadow-pop">
                Sold
              </span>
            </span>
          )}

          {pricing.campaign && p.stock > 0 && (
            <span className="absolute right-2 top-2 rounded bg-brand px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
              −{pricing.campaign.percentOff}%
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <div className="label">{p.formLabel}</div>

          <h3 className="clamp-2 mt-1 text-sm font-medium leading-snug text-fg group-hover:text-brand">
            {p.title}
          </h3>

          {!compact && (
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-line pt-3 text-xs">
              {weight && <Spec label="Weight" value={weight} />}
              {p.cut && <Spec label="Cut" value={p.cut} />}
              <Spec label="Colour" value={p.color} />
              <Spec label="Origin" value={p.origin.split(',')[0]} />
              <Spec label="Ships from" value={p.shipsFrom === 'TH' ? 'Thailand' : 'Pakistan'} />
            </dl>
          )}

          {!compact && shortTreatment && (
            <p className="mt-2 truncate text-[11px] text-muted" title={p.treatment}>
              <span className="text-subtle">Treatment:</span> {shortTreatment}
            </p>
          )}

          {/* Price pinned to the bottom so it aligns across a row of uneven tiles. */}
          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <Price
              usd={pricing.priceUsd}
              original={pricing.originalUsd}
              className="font-display text-lg text-brand"
            />
            {p.caratWeight && <PricePerCarat usd={pricing.priceUsd} carat={p.caratWeight} />}
          </div>
        </div>
      </Link>
    </article>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-subtle">{label}</dt>
      <dd className="truncate text-fg" title={value}>
        {value}
      </dd>
    </div>
  );
}
