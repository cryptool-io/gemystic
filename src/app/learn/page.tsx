import type { Metadata } from 'next';
import Link from 'next/link';
import { stockedSpecies } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Gemstone Guides. How to Buy, Judge and Care for Natural Stones',
  description:
    'Practical buying guides written by working gem cutters: what drives value in each species, which treatments are normal, how durable each stone really is, and how to care for it.',
  alternates: { canonical: '/learn' },
};

export default function LearnIndex() {
  const species = stockedSpecies();

  return (
    <div className="wrap">
      <header className="max-w-3xl">
        <div className="label">Guides</div>
        <h1 className="mt-2 font-display text-4xl">Know what you are buying</h1>
        <p className="mt-4 leading-relaxed text-muted">
          Written from the cutting bench rather than a marketing desk. Each guide covers
          what actually drives price in that species, which treatments are standard, how the
          stone behaves in daily wear, and the questions worth asking any seller, including us.
        </p>
      </header>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {species.map((s) => (
          <Link key={s.key} href={`/learn/${s.key}`} className="card p-6 transition hover:border-brand/50">
            <h2 className="font-display text-xl text-brand">{s.species.name}</h2>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
              {s.species.buyingNotes}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="chip">Mohs {s.species.hardness}</span>
              <span className="chip">{s.count} in stock</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
