import type { Product, Species } from './types';

/** Brand facts mirror the live shop at gemysticgems.com so the two stay consistent. */
export const SITE = {
  name: 'Gemystic Gems',
  legalName: 'Gemystic Gems',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://gemysticgems.com',
  description:
    'Natural cut and uncut gemstones, emerald, ruby, sapphire, tourmaline and rare collector minerals, sourced and hand-cut in Peshawar, Pakistan.',
  city: 'Peshawar',
  country: 'PK',
  email: 'Info@gemysticgems.com',
  phone: '+92 349 963 6064',
  phoneRaw: '+923499636064',
  whatsapp: 'https://wa.me/923499636064',
  currency: 'USD',
  social: {
    instagram: 'https://www.instagram.com/gemysticgems',
    tiktok: 'https://www.tiktok.com/@gemysticgems',
    facebook: 'https://www.facebook.com/gemysticgems',
  },
  policy: {
    freeShippingOver: 500,
    returnDays: 30,
    warranty: 'International warranty',
  },
};

export function money(n: number, currency = SITE.currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
}

/** For round marketing figures, "$500", not "$500.00". */
export function moneyWhole(n: number, currency = SITE.currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Product schema. This is what earns rich results in Google and what answer
 * engines read when they cite a price, so it carries every attribute we parsed
 * rather than the bare minimum.
 */
export function productJsonLd(p: Product, s: Species | undefined) {
  const props: { '@type': 'PropertyValue'; name: string; value: string }[] = [];
  const add = (name: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && value !== '') {
      props.push({ '@type': 'PropertyValue', name, value: String(value) });
    }
  };

  add('Gem species', s?.name ?? p.species);
  add('Variety', p.variety);
  add('Carat weight', p.caratWeight ? `${p.caratWeight} ct` : null);
  add('Gram weight', p.gramWeight ? `${p.gramWeight} g` : null);
  add('Cut', p.cut);
  add('Colour', p.color);
  add('Dimensions', p.dimensions);
  add('Origin', p.origin);
  add('Treatment', p.treatment);
  add('Mohs hardness', s?.hardness);
  add('Refractive index', s?.refractiveIndex);
  add('Specific gravity', s?.specificGravity);
  add('Crystal system', s?.crystalSystem);
  add('Chemical formula', s?.formula);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${SITE.url}/gem/${p.slug}#product`,
    name: p.title,
    description: stripMarkdown(p.description).slice(0, 500),
    sku: p.id,
    mpn: p.etsyId,
    image: [p.imageLarge],
    category: p.formLabel,
    material: s?.name ?? p.species,
    color: p.color,
    weight: p.caratWeight
      ? { '@type': 'QuantitativeValue', value: p.caratWeight, unitText: 'carat' }
      : p.gramWeight
      ? { '@type': 'QuantitativeValue', value: p.gramWeight, unitCode: 'GRM' }
      : undefined,
    additionalProperty: props,
    brand: { '@type': 'Brand', name: SITE.name },
    offers: {
      '@type': 'Offer',
      url: `${SITE.url}/gem/${p.slug}`,
      priceCurrency: 'USD',
      price: p.priceUsd.toFixed(2),
      availability:
        p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      // Every stone is a one-off, which is itself a selling point worth marking up.
      inventoryLevel: { '@type': 'QuantitativeValue', value: p.stock },
      seller: { '@type': 'Organization', name: SITE.legalName },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'Worldwide' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 5, maxValue: 12, unitCode: 'DAY' },
        },
      },
    },
  };
}

export function faqJsonLd(faq: [string, string][]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: `${SITE.url}${t.path}`,
    })),
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    '@id': `${SITE.url}#org`,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    description: SITE.description,
    email: SITE.email,
    telephone: SITE.phoneRaw,
    sameAs: Object.values(SITE.social),
    address: { '@type': 'PostalAddress', addressLocality: SITE.city, addressCountry: SITE.country },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      reviewCount: '4',
      bestRating: '5',
    },
  };
}

export function itemListJsonLd(products: Product[], listName: string, basePath: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 60).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE.url}/gem/${p.slug}`,
      name: p.title,
    })),
    url: `${SITE.url}${basePath}`,
  };
}

export function stripMarkdown(s: string) {
  return s.replace(/\*\*/g, '').replace(/\n+/g, ' ').trim();
}
