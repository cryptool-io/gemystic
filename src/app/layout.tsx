import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import Link from 'next/link';
import { Suspense } from 'react';
import './globals.css';
import { SITE, organizationJsonLd, moneyWhole } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { stockedSpecies, allProducts } from '@/lib/catalog';
import { categoryTree } from '@/lib/taxonomy';
import { AssistantLauncher } from '@/components/AssistantLauncher';
import { SupportWidget } from '@/components/SupportWidget';
import { MainNav } from '@/components/MainNav';
import { SearchBox } from '@/components/SearchBox';
import { Logo } from '@/components/Logo';
import { AccountMenu } from '@/components/auth/AccountMenu';
import { currentUser } from '@/lib/auth/session';

/**
 * Type pairing: Fraunces — a high-contrast editorial serif with an optical axis,
 * built for luxury headlines — over Inter for UI and body. Self-hosted by
 * next/font. Because every component reads the semantic font tokens
 * (font-display / font-sans), swapping the brand typeface is exactly this block.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-plex',
  display: 'swap',
});
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-display',
  display: 'swap',
  // Optical-size axis: Fraunces renders softer at text sizes, sharper at
  // display sizes — the point of choosing it.
  axes: ['opsz'],
});

export const viewport: Viewport = {
  themeColor: '#047857',
  width: 'device-width',
  initialScale: 1,
  // Never block a customer from zooming into a gemstone photograph.
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'Gemystic Gems — Natural Gemstones, Hand-Cut in Pakistan',
    template: '%s | Gemystic Gems',
  },
  description: SITE.description,
  keywords: [
    'natural gemstones', 'loose gemstones', 'swat emerald', 'pigeon blood ruby',
    'buy sapphire online', 'mineral specimens', 'pakistan gemstones', 'ethically sourced gemstones',
  ],
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    url: SITE.url,
    title: 'Gemystic Gems — Natural Gemstones, Hand-Cut in Pakistan',
    description: SITE.description,
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true, 'max-image-preview': 'large' },
  alternates: { canonical: '/' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const species = stockedSpecies();
  const total = allProducts().length;
  const tree = categoryTree(
    Object.fromEntries(species.map((s) => [s.key, s.species.name])),
  );
  const user = await currentUser();

  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <JsonLd data={organizationJsonLd()} />

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>

        {/* Promise bar. Abbreviates on narrow screens rather than wrapping to three lines. */}
        <div className="border-b border-line bg-brand-tint text-brand-deep">
          <div className="wrap flex h-9 items-center justify-center text-center text-[11px] sm:text-xs">
            <span className="truncate">
              Free worldwide shipping over {moneyWhole(SITE.policy.freeShippingOver)}
              <span className="hidden sm:inline">
                {' '}· {SITE.policy.returnDays}-day returns · {SITE.policy.warranty}
              </span>
            </span>
          </div>
        </div>

        <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
          <div className="wrap flex h-16 items-center gap-3">
            <Link href="/" className="shrink-0" aria-label="Gemystic Gems home">
              <Logo />
            </Link>

            <div className="flex-1" />

            <MainNav categories={tree} />

            <Suspense fallback={null}>
              <SearchBox />
            </Suspense>

            <AccountMenu user={user} />

            <Link href="/shop" className="btn-primary hidden shrink-0 2xl:inline-flex">
              All {total} stones
            </Link>
          </div>
        </header>

        <main id="main" className="min-h-[70vh] py-8 sm:py-10 lg:py-12">
          {children}
        </main>

        <footer className="mt-16 border-t border-line bg-surface py-12">
          <div className="wrap grid gap-10 sm:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5">
            <div className="sm:col-span-2 lg:col-span-1">
              <Logo />
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
                Natural cut and uncut gemstones, sourced and hand-cut in Peshawar, Pakistan.
                Every stone is a single piece — what you see is the stone you receive.
              </p>

              <dl className="mt-5 space-y-2 text-sm">
                <div>
                  <dt className="label">Email</dt>
                  <dd>
                    <a href={`mailto:${SITE.email}`} className="text-brand hover:text-brand-dark">
                      {SITE.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="label">Call us</dt>
                  <dd>
                    <a href={`tel:${SITE.phoneRaw}`} className="text-brand hover:text-brand-dark">
                      {SITE.phone}
                    </a>
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(SITE.social).map(([name, url]) => (
                  <a
                    key={name}
                    href={url}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="chip capitalize hover:border-brand-ring hover:text-brand-dark"
                  >
                    {name}
                  </a>
                ))}
              </div>
            </div>

            <FooterCol
              title="Shop"
              links={[
                ['Faceted gemstones', '/shop?category=faceted-gemstones'],
                ['Cabochons', '/shop?category=cabochons'],
                ['Rough gemstones', '/shop?category=rough-gemstones'],
                ['Jewellery', '/shop?category=jewellery'],
                ['Specimens', '/shop?category=specimens'],
                ['Wholesale parcels', '/shop?category=parcels'],
              ]}
            />

            <FooterCol
              title="Learn"
              links={[
                ['Gemstone guides', '/learn'],
                ['Birthstones by month', '/collections/birthstones'],
                ['Swat emerald guide', '/learn/emerald'],
                ['Pigeon blood ruby', '/learn/ruby'],
              ]}
            />

            <FooterCol
              title="Help"
              links={[
                ['Contact us', '/contact'],
                ['Customer reviews', '/reviews'],
                ['Shipping & delivery', '/policies/shipping'],
                ['Refunds & returns', '/policies/returns'],
                ['Privacy policy', '/policies/privacy'],
                ['Terms & conditions', '/policies/terms'],
              ]}
            />

            <div>
              <div className="label mb-3">For machines</div>
              <ul className="space-y-2 text-sm text-muted">
                <li><a href="/llms.txt" className="hover:text-brand-dark">llms.txt</a></li>
                <li><a href="/api/catalog" className="hover:text-brand-dark">Catalogue API</a></li>
                <li><a href="/sitemap.xml" className="hover:text-brand-dark">Sitemap</a></li>
              </ul>
              <p className="mt-4 text-xs leading-relaxed text-subtle">
                We publish our full catalogue as structured data so answer engines
                can quote us accurately.
              </p>
            </div>
          </div>

          <div className="wrap mt-10 border-t border-line pt-6 text-xs text-subtle">
            © {new Date().getFullYear()} Gemystic Gems · Peshawar, Pakistan ·
            Every stone photographed as received, never stock imagery.
          </div>
        </footer>

        <SupportWidget
          email={SITE.email}
          phone={SITE.phone}
          phoneRaw={SITE.phoneRaw}
          whatsapp={SITE.whatsapp}
        />
        <AssistantLauncher />
      </body>
    </html>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="label mb-3">{title}</div>
      <ul className="space-y-2 text-sm text-muted">
        {links.map(([text, href]) => (
          <li key={href}>
            <Link href={href} className="hover:text-brand-dark">{text}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
