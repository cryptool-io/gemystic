/**
 * gemysticgems.com (the original WooCommerce shop) -> Gemystic sync.
 *
 *   node scripts/gemysticgems-sync.mjs            # fetch + report + write galleries
 *   node scripts/gemysticgems-sync.mjs --import   # also add missing products to the DB inventory
 *
 * What it does:
 *   1. Pages the public WooCommerce Store API (203 products) and snapshots the
 *      slim result to data/gemysticgems-raw.json.
 *   2. Matches WP products against data/catalog.json by normalised title
 *      (exact, then token-overlap fuzzy) and writes data/galleries.json:
 *      { ourSlug: [imageUrls] } - the storefront uses these for tile rotation
 *      and the PDP gallery. WP photos are the originals (1000px), so when a
 *      gallery exists it replaces the single Etsy thumbnail entirely.
 *   3. With --import: products that do NOT exist in our catalogue are added to
 *      the DB inventory (products + product_images + their categories),
 *      status draft, source gemysticgems, so they appear in inventory
 *      management for the listing pipeline (step 1 -> 2).
 *
 * The WP site is compromised (see SECURITY file); we only read the public
 * product JSON over TLS and never execute anything from it. Image URLs are
 * hotlinks for now; the image-ownership migration (NEXT-SESSION M6.3)
 * downloads every referenced image into our own storage.
 */
import { readFile, writeFile } from 'node:fs/promises';

const BASE = 'https://gemysticgems.com/wp-json/wc/store/v1/products';
const IMPORT = process.argv.includes('--import');

function normTitle(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s) {
  return new Set(normTitle(s).split(' ').filter((t) => t.length > 2));
}

function overlap(a, b) {
  const inter = [...a].filter((t) => b.has(t)).length;
  return inter / Math.max(1, Math.min(a.size, b.size));
}

/** "Weight: 100.0 Grams" / "Weight: 8.05 Carats" out of the description HTML. */
function parseSpecs(html) {
  const text = (html ?? '').replace(/<[^>]+>/g, '\n');
  const grab = (label) => text.match(new RegExp(`${label}\\s*:\\s*([^\\n]+)`, 'i'))?.[1]?.trim();
  const weightRaw = grab('Weight') ?? '';
  const grams = weightRaw.match(/([\d.]+)\s*gram/i)?.[1];
  const carats = weightRaw.match(/([\d.]+)\s*carat/i)?.[1];
  return {
    type: grab('Gemstone Type'),
    grams: grams ? Number(grams) : null,
    carats: carats ? Number(carats) : null,
    size: grab('Size'),
    quality: grab('Quality'),
    treatment: grab('Treatment'),
  };
}

async function fetchAll() {
  const out = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${BASE}?per_page=100&page=${page}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Store API ${res.status} on page ${page}`);
    const batch = await res.json();
    if (batch.length === 0) break;
    out.push(...batch);
    const totalPages = Number(res.headers.get('x-wp-totalpages') ?? 1);
    if (page >= totalPages) break;
  }
  return out;
}

const wpRaw = await fetchAll();
const wp = wpRaw.map((p) => ({
  wpId: p.id,
  name: p.name,
  slug: p.slug,
  permalink: p.permalink,
  priceUsd: Number(p.prices.price) / 10 ** p.prices.currency_minor_unit,
  regularUsd: Number(p.prices.regular_price) / 10 ** p.prices.currency_minor_unit,
  onSale: p.on_sale,
  inStock: p.is_in_stock,
  images: p.images.map((i) => ({ src: i.src, alt: i.alt || p.name })),
  categories: p.categories.map((c) => ({ slug: c.slug, name: c.name })),
  tags: p.tags.map((t) => t.name),
  specs: parseSpecs(p.short_description),
}));

await writeFile('data/gemysticgems-raw.json', JSON.stringify({ fetchedAt: new Date().toISOString(), products: wp }, null, 1), 'utf8');

const catalog = JSON.parse(await readFile('data/catalog.json', 'utf8'));
const ours = catalog.products.map((p) => ({ slug: p.slug, title: p.title, toks: tokens(p.title), norm: normTitle(p.title) }));
const byNorm = new Map(ours.map((o) => [o.norm, o]));

const galleries = {};
const missing = [];
let matchedExact = 0;
let matchedFuzzy = 0;

for (const w of wp) {
  let match = byNorm.get(normTitle(w.name)) ?? null;
  if (match) {
    matchedExact++;
  } else {
    const wt = tokens(w.name);
    let best = null;
    let bestScore = 0;
    for (const o of ours) {
      const s = overlap(wt, o.toks);
      if (s > bestScore) {
        bestScore = s;
        best = o;
      }
    }
    // 0.85 with >=4 shared-token base keeps "Rough Emerald 50g" from matching
    // a different rough emerald parcel; weight tokens (45.55g) do the real work.
    if (best && bestScore >= 0.85 && Math.min(tokens(w.name).size, best.toks.size) >= 4) {
      match = best;
      matchedFuzzy++;
    }
  }

  if (match) {
    if (w.images.length > 0) {
      galleries[match.slug] = w.images.map((i) => i.src);
    }
  } else {
    missing.push(w);
  }
}

await writeFile('data/galleries.json', JSON.stringify(galleries, null, 1), 'utf8');

console.log(`WP products: ${wp.length}`);
console.log(`Matched to catalogue: ${matchedExact} exact + ${matchedFuzzy} fuzzy = ${matchedExact + matchedFuzzy}`);
console.log(`Galleries written: ${Object.keys(galleries).length} (data/galleries.json)`);
console.log(`Missing from catalogue: ${missing.length}`);

if (!IMPORT) {
  console.log('Run with --import to add the missing products to the DB inventory.');
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error('--import needs DATABASE_URL.');
  process.exit(1);
}

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

let createdCats = 0;
let createdProducts = 0;
let updatedProducts = 0;

const catBySlug = new Map();
for (const w of missing) {
  for (const c of w.categories) {
    if (!catBySlug.has(c.slug)) catBySlug.set(c.slug, c.name);
  }
}
catBySlug.set('uncategorised', 'Uncategorised');

const catIds = new Map();
for (const [slug, name] of catBySlug) {
  let row = await prisma.category.findFirst({ where: { slug, parentId: null } });
  if (!row) {
    row = await prisma.category.create({ data: { slug, name } });
    createdCats++;
  }
  catIds.set(slug, row.id);
}

for (const w of missing) {
  const catSlug = w.categories[0]?.slug ?? 'uncategorised';
  const data = {
    slug: w.slug,
    categoryId: catIds.get(catSlug),
    title: w.name,
    description: [
      w.specs.type ? `Gemstone type: ${w.specs.type}` : null,
      w.specs.size ? `Size: ${w.specs.size}` : null,
      w.specs.quality ? `Quality: ${w.specs.quality}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    price: w.priceUsd,
    compareAtPrice: w.onSale && w.regularUsd > w.priceUsd ? w.regularUsd : null,
    quantity: w.inStock ? 1 : 0,
    tags: w.tags,
    weightGrams: w.specs.grams,
    caratWeight: w.specs.carats,
    treatment: w.specs.treatment || 'Not disclosed',
    dimensionsText: w.specs.size ?? null,
    status: w.inStock ? 'draft' : 'sold',
    source: 'gemysticgems',
    sourceRef: String(w.wpId),
  };

  const existing = await prisma.product.findUnique({ where: { slug: w.slug } });
  if (existing) {
    await prisma.product.update({ where: { slug: w.slug }, data });
    await prisma.productImage.deleteMany({ where: { productId: existing.id } });
    await prisma.productImage.createMany({
      data: w.images.map((img, i) => ({
        productId: existing.id,
        url: img.src,
        alt: img.alt,
        position: i,
        isPrimary: i === 0,
      })),
    });
    updatedProducts++;
  } else {
    await prisma.product.create({
      data: {
        ...data,
        images: {
          create: w.images.map((img, i) => ({
            url: img.src,
            alt: img.alt,
            position: i,
            isPrimary: i === 0,
          })),
        },
      },
    });
    createdProducts++;
  }
}

console.log(`DB: ${createdCats} categories created, ${createdProducts} products created, ${updatedProducts} refreshed.`);
await prisma.$disconnect();
