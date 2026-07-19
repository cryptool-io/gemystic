/**
 * Matches catalogue listings to the legacy shop's products by comparing the
 * photographs themselves, then adopts the full gallery.
 *
 *   node scripts/match-galleries.mjs            # report
 *   node scripts/match-galleries.mjs --apply    # write data/galleries.json
 *
 * Why by image: the same stone is named differently on each channel. Etsy has
 * "Ametrine 5.38ct Emerald Cut", the WordPress shop has plain "Ametrine", and
 * neither carries a weight the other can be matched on. Names and numbers
 * therefore find almost nothing. The photographs, however, are the same
 * photographs, taken once and uploaded to both, so the pixels are the reliable
 * key.
 *
 * Uses a difference hash: shrink to 9x8 greyscale, compare each pixel with its
 * right-hand neighbour, and keep the 64 resulting bits. That survives the
 * rescaling and recompression each platform applies, while still separating two
 * different stones of the same species, which is exactly the discrimination
 * needed here. Matching is mutual-best with a distance ceiling, so an
 * ambiguous pair is left alone rather than guessed at.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const APPLY = process.argv.includes('--apply');
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './var/uploads';
/** Out of 64 bits. Tightened from experiment: same photo scores in the low single digits. */
const MAX_DISTANCE = 12;

/** Same key the image migration used, so a URL maps to the file it was saved as. */
function keyFor(url) {
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 16);
  const ext = (url.split('?')[0].match(/\.(jpe?g|png|webp|avif|gif)$/i)?.[1] ?? 'jpg').toLowerCase();
  return `products/${hash}.${ext === 'jpeg' ? 'jpg' : ext}`;
}

function localPath(url) {
  if (url.startsWith('/media/')) return join(UPLOAD_DIR, url.slice('/media/'.length));
  return join(UPLOAD_DIR, keyFor(url));
}

async function dhash(path) {
  try {
    const raw = await sharp(path).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
    const bits = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = raw[row * 9 + col];
        const right = raw[row * 9 + col + 1];
        bits.push(left > right ? 1 : 0);
      }
    }
    return bits;
  } catch {
    return null;
  }
}

function distance(a, b) {
  let d = 0;
  for (let i = 0; i < 64; i++) if (a[i] !== b[i]) d++;
  return d;
}

const catalog = JSON.parse(await readFile('data/catalog.json', 'utf8'));
const wp = JSON.parse(await readFile('data/gemysticgems-raw.json', 'utf8')).products;

console.log(`Hashing ${catalog.products.length} catalogue photos…`);
const catHashes = [];
for (const p of catalog.products) {
  const path = localPath(p.image);
  if (!existsSync(path)) continue;
  const h = await dhash(path);
  if (h) catHashes.push({ slug: p.slug, title: p.title, hash: h });
}

console.log(`Hashing photos for ${wp.length} legacy products…`);
const wpHashes = [];
for (const p of wp) {
  const hashes = [];
  for (const img of p.images) {
    const path = localPath(img.src);
    if (!existsSync(path)) continue;
    const h = await dhash(path);
    if (h) hashes.push(h);
  }
  if (hashes.length > 0) wpHashes.push({ product: p, hashes });
}

console.log(`Hashed: ${catHashes.length} catalogue, ${wpHashes.length} legacy products.\n`);

// Best legacy product per catalogue listing: the closest photo wins, and the
// runner-up must be clearly worse or the pair is treated as ambiguous.
const pairs = [];
for (const c of catHashes) {
  let best = null;
  let second = Infinity;

  for (const w of wpHashes) {
    let d = Infinity;
    for (const h of w.hashes) d = Math.min(d, distance(c.hash, h));
    if (best === null || d < best.d) {
      second = best?.d ?? Infinity;
      best = { d, w };
    } else if (d < second) {
      second = d;
    }
  }

  if (best && best.d <= MAX_DISTANCE && second - best.d >= 4) {
    pairs.push({ slug: c.slug, title: c.title, wp: best.product ?? best.w.product, distance: best.d });
  }
}

// One legacy product cannot be two catalogue listings; keep the closest.
const byWp = new Map();
for (const p of pairs) {
  const key = p.wp.slug;
  if (!byWp.has(key) || byWp.get(key).distance > p.distance) byWp.set(key, p);
}
const finalPairs = [...byWp.values()];

console.log(`Confident matches: ${finalPairs.length} of ${catHashes.length} catalogue listings.`);
console.log('\nSample:');
for (const p of finalPairs.slice(0, 12)) {
  console.log(`  d=${String(p.distance).padStart(2)}  "${p.title}"  <-  "${p.wp.name}" (${p.wp.images.length} photos)`);
}

const galleries = JSON.parse(await readFile('data/galleries.json', 'utf8').catch(() => '{}'));
let added = 0;
let photosGained = 0;
for (const p of finalPairs) {
  if (p.wp.images.length < 2) continue;
  galleries[p.slug] = p.wp.images.map((i) => {
    const key = keyFor(i.src);
    // Prefer the copy already downloaded into our storage.
    return existsSync(join(UPLOAD_DIR, key)) ? `/media/${key}` : i.src;
  });
  added++;
  photosGained += p.wp.images.length;
}

console.log(`\nGalleries to write: ${added} listings, ${photosGained} photographs (avg ${(photosGained / Math.max(1, added)).toFixed(1)}).`);

if (!APPLY) {
  console.log('Report only. Re-run with --apply to write data/galleries.json.');
  process.exit(0);
}

await writeFile('data/galleries.json', `${JSON.stringify(galleries, null, 1)}\n`, 'utf8');
console.log('Written to data/galleries.json.');
