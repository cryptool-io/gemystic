import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/guard';
import { getProduct, getSpecies } from '@/lib/catalog';
import { getOverride } from '@/lib/listings/overrides';
import { productImages } from '@/lib/galleries';
import { config } from '@/lib/config';
import { ListingEditor } from '@/components/admin/ListingEditor';
import { EtsySyncButton } from '@/components/admin/EtsySyncButton';
import { soldMap } from '@/lib/sold';

export const dynamic = 'force-dynamic';

export default async function EditListing({ params }: { params: Promise<{ slug: string }> }) {
  await requireRole('admin', '/admin/listings');
  const { slug } = await params;

  const product = getProduct(slug);
  if (!product) notFound();

  const override = await getOverride(slug);
  const images = productImages(product);
  const isSold = Boolean(soldMap()[product.etsyId]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/listings" className="text-sm text-muted hover:text-brand">
          ← All listings
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-2xl">{override?.title || product.title}</h1>
          <span className={`chip ${isSold ? 'border-accent/40 text-accent-dark' : 'chip-brand'}`}>
            {isSold ? 'Sold' : 'Live'}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          {getSpecies(product.species)?.name ?? product.species} · {product.formLabel} · Etsy id{' '}
          {product.etsyId}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <ListingEditor
          slug={slug}
          generated={{
            title: product.title,
            description: product.description,
            priceUsd: product.priceUsd,
            treatment: product.treatment,
            metaTitle: product.metaTitle,
            metaDescription: product.metaDescription,
            keywords: product.keywords,
          }}
          override={override}
          aiEnabled={config.ai.enabled || Boolean(process.env.AI_OPENAI_API_KEY)}
        />

        <aside className="space-y-4">
          <div className="card p-4">
            <div className="label mb-2">Photos ({images.length})</div>
            <div className="grid grid-cols-3 gap-1.5">
              {images.slice(0, 9).map((src) => (
                <span key={src} className="relative aspect-square overflow-hidden rounded-sm bg-surface-2">
                  <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                </span>
              ))}
            </div>
            {images.length === 1 && (
              <p className="mt-2 text-xs text-muted">
                Only the primary photo exists for this stone. Extra photos rotate on the tile
                automatically once they are added.
              </p>
            )}
          </div>

          <div className="card p-4">
            <div className="label mb-2">Etsy</div>
            <EtsySyncButton slug={slug} />
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Checks the public Etsy listing and marks this stone sold here if it has gone there.
              Two-way write-back needs the Etsy developer app.
            </p>
          </div>

          <div className="card p-4 text-xs leading-relaxed text-muted">
            <div className="label mb-2">Specs (generated)</div>
            {[
              ['Weight', product.caratWeight ? `${product.caratWeight} ct` : product.gramWeight ? `${product.gramWeight} g` : '–'],
              ['Cut', product.cut || '–'],
              ['Colour', product.color],
              ['Origin', product.origin],
              ['Ships from', product.shipsFrom === 'TH' ? 'Thailand' : 'Pakistan'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-line py-1 last:border-0">
                <span>{k}</span>
                <span className="text-fg">{v}</span>
              </div>
            ))}
            <p className="mt-2">
              Specs come from the normalizer. Correct them at source in data/etsy-raw.txt and
              re-run <code>npm run normalize</code>.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
