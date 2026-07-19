/**
 * Builds the real photo galleries for the Etsy-derived listings.
 *
 *   node scripts/etsy-galleries.mjs data/etsy-gallery-raw.json           # report
 *   node scripts/etsy-galleries.mjs data/etsy-gallery-raw.json --apply   # write + download
 *
 * Where the data comes from: Etsy answers a server with 403 (it fingerprints
 * TLS), so the listing pages were read through a real browser session, which is
 * the documented workaround in the handover. Each listing yielded its full set
 * of photo URLs, compacted to `folder:imageId:hash` triples that this script
 * expands back into CDN URLs.
 *
 * Two images recur across dozens of listings: those are the shop's standard
 * banner and policy graphics, not photographs of a stone. They are dropped,
 * because a gallery that ends with a shipping graphic looks like a mistake on
 * a product page for a one-of-a-kind gem.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const APPLY = process.argv.includes('--apply');
const RAW = process.argv[2] ?? 'data/etsy-gallery-raw.json';
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './var/uploads';
/** An image on more than this many listings is shop furniture, not a stone. */
const SHARED_THRESHOLD = 3;
const CONCURRENCY = 5;

function keyFor(url) {
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 16);
  return `products/${hash}.jpg`;
}

const raw = JSON.parse(await readFile(RAW, 'utf8'));
const catalog = JSON.parse(await readFile('data/catalog.json', 'utf8'));

const slugFor = new Map();
for (const p of catalog.products) if (p.etsyId) slugFor.set(String(p.etsyId), p.slug);

// Count how often each image appears; the repeats are banners.
const seen = new Map();
for (const triples of Object.values(raw.listings)) {
  for (const t of triples) seen.set(t, (seen.get(t) ?? 0) + 1);
}
const shared = [...seen.entries()].filter(([, n]) => n > SHARED_THRESHOLD).map(([t]) => t);
console.log(`Shop-wide graphics filtered out: ${shared.length}`);
for (const t of shared) console.log(`  ${t} (on ${seen.get(t)} listings)`);

const expand = (triple) => {
  const [folder, imgId, hash] = triple.split(':');
  // 1588 wide is the largest Etsy reliably serves for every listing photo.
  return `https://i.etsystatic.com/${raw.shop}/r/il/${folder}/${imgId}/il_1588xN.${imgId}_${hash}.jpg`;
};

const galleries = {};
let listingsWithGallery = 0;
let totalPhotos = 0;
const unmatched = [];

for (const [etsyId, triples] of Object.entries(raw.listings)) {
  const slug = slugFor.get(etsyId);
  if (!slug) {
    unmatched.push(etsyId);
    continue;
  }
  const kept = triples.filter((t) => !shared.includes(t));
  if (kept.length < 2) continue;
  galleries[slug] = kept.map(expand);
  listingsWithGallery++;
  totalPhotos += kept.length;
}

console.log(`\nListings with a real gallery: ${listingsWithGallery}`);
console.log(`Photographs: ${totalPhotos} (average ${(totalPhotos / Math.max(1, listingsWithGallery)).toFixed(1)} per listing)`);
if (unmatched.length) console.log(`Etsy ids with no catalogue match: ${unmatched.length}`);

if (!APPLY) {
  console.log('\nReport only. Re-run with --apply to download the photographs and write the galleries.');
  process.exit(0);
}

// Download everything into our own storage, so the shop never depends on
// Etsy's CDN for a listing we control.
const urls = [...new Set(Object.values(galleries).flat())];
console.log(`\nDownloading ${urls.length} photographs…`);

const mapping = new Map();
const failures = [];
const queue = [...urls];
let done = 0;

async function worker() {
  while (queue.length) {
    const url = queue.pop();
    if (!url) break;
    const key = keyFor(url);
    const path = join(UPLOAD_DIR, key);

    if (existsSync(path)) {
      mapping.set(url, `/media/${key}`);
      done++;
      continue;
    }
    try {
      const res = await fetch(url, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
          accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
          referer: 'https://www.etsy.com/',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 2048) throw new Error(`too small (${buf.length} bytes)`);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, buf);
      mapping.set(url, `/media/${key}`);
    } catch (err) {
      failures.push(`${err instanceof Error ? err.message : err}  ${url}`);
    }
    done++;
    if (done % 50 === 0) console.log(`  ${done}/${urls.length}…`);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`Downloaded or already present: ${mapping.size}. Failed: ${failures.length}.`);
for (const f of failures.slice(0, 8)) console.log(`  ${f}`);

// Point the galleries at our copies; anything that failed keeps the CDN URL
// rather than being dropped, so the listing still shows the photograph.
const existing = JSON.parse(await readFile('data/galleries.json', 'utf8').catch(() => '{}'));
for (const [slug, list] of Object.entries(galleries)) {
  existing[slug] = list.map((u) => mapping.get(u) ?? u);
}

await writeFile('data/galleries.json', `${JSON.stringify(existing, null, 1)}\n`, 'utf8');
console.log(`\nWritten: ${Object.keys(existing).length} listings now have galleries in data/galleries.json.`);
