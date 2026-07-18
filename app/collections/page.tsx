import type { Metadata } from 'next';
import Link from 'next/link';
import { stockedSpecies, facets, MONTHS } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Gemstone Collections',
  description:
    'Browse natural gemstones by species, colour, cut and birthstone month. Emerald, ruby, sapphire, tourmaline, garnet and more, hand-cut in Pakistan.',
  alternates: { canonical: '/collections' },
};

export default function CollectionsPage() {
  const species = stockedSpecies();
  const f = facets();

  return (
    <div className="wrap">
      <h1 className="font-display text-3xl">Collections</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Every route into the catalogue, by stone, by colour, by cut, or by the month
        someone was born.
      </p>

      <Section title="By stone">
        {species.map((s) => (
          <Tile
            key={s.key}
            href={`/collections/${s.key}`}
            title={s.species.name}
            sub={`${s.count} in stock · Mohs ${s.species.hardness}`}
          />
        ))}
      </Section>

      <Section title="By birthstone month">
        {MONTHS.map((m) => (
          <Tile key={m} href={`/collections/birthstones#${m.toLowerCase()}`} title={m} sub="Birthstone" />
        ))}
      </Section>

      <Section title="By colour">
        {Object.entries(f.color).map(([colour, n]) => (
          <Tile
            key={colour}
            href={`/shop?color=${encodeURIComponent(colour)}`}
            title={colour}
            sub={`${n} stones`}
          />
        ))}
      </Section>

      <Section title="By cut">
        {Object.entries(f.cut).map(([cut, n]) => (
          <Tile
            key={cut}
            href={`/shop?cut=${encodeURIComponent(cut)}`}
            title={cut}
            sub={`${n} stones`}
          />
        ))}
      </Section>

      <Section title="By type">
        {Object.entries(f.form).map(([form, n]) => (
          <Tile
            key={form}
            href={`/shop?form=${form}`}
            title={form}
            sub={`${n} pieces`}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 font-display text-xl text-brand">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{children}</div>
    </section>
  );
}

function Tile({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link href={href} className="card p-4 transition hover:border-brand/50">
      <div className="font-display capitalize text-fg">{title}</div>
      <div className="mt-1 text-[11px] capitalize text-muted">{sub}</div>
    </Link>
  );
}
