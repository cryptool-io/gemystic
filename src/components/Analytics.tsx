'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Google Analytics 4. Loads only when NEXT_PUBLIC_GA_ID is set, so local dev
 * and self-hosted installs without a GA property send nothing.
 *
 * Events wired so results are attributable, not just traffic:
 *   page_view, every route change (App Router doesn't reload the page)
 *   search. SearchBox submits (search_term)
 *   view_item, product pages (ProductAnalytics on the PDP)
 *   add_to_cart. AddToBag
 * When checkout lands, purchase closes the loop from source → sale.
 */
export function gaEvent(name: string, params: Record<string, unknown> = {}) {
  window.gtag?.('event', name, params);
}

function PageTracker() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (!GA_ID) return;
    window.gtag?.('event', 'page_view', {
      page_path: pathname + (search.size ? `?${search.toString()}` : ''),
    });
  }, [pathname, search]);

  return null;
}

export function Analytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: false });`}
      </Script>
      <Suspense fallback={null}>
        <PageTracker />
      </Suspense>
    </>
  );
}

/** Drop on a product page to report a view_item with real commerce fields. */
export function ProductAnalytics({
  slug,
  title,
  priceUsd,
  species,
  category,
}: {
  slug: string;
  title: string;
  priceUsd: number;
  species: string;
  category: string;
}) {
  useEffect(() => {
    gaEvent('view_item', {
      currency: 'USD',
      value: priceUsd,
      items: [{ item_id: slug, item_name: title, item_category: category, item_variant: species, price: priceUsd }],
    });
  }, [slug, title, priceUsd, species, category]);

  return null;
}
