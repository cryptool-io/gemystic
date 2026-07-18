/**
 * Etsy sold-sync.
 *
 *   node scripts/etsy-sync.mjs            # compare live Etsy shop vs local catalogue
 *   node scripts/etsy-sync.mjs --apply    # also mark missing listings sold (stock: 0)
 *
 * While stock is dual-listed (here + Etsy), a stone sold on Etsy must stop being
 * sellable here — every piece is one of a kind. This script fetches the live
 * shop pages, collects the listing ids still visible, and diffs them against
 * the local catalogue. Anything in the catalogue but no longer on Etsy is
 * presumed sold (or delisted) and reported; with --apply it is marked stock 0.
 *
 * Etsy aggressively blocks non-browser traffic. The fetch sends a desktop UA and
 * usually works from a normal residential connection; if Etsy answers 403 the
 * script says so and changes nothing, rather than guessing. Result is written to
 * var/etsy-sync.json so the admin page can display the last run.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOP_URL = 'https://www.etsy.com/shop/GemysticGemsStudio';
const PAGES = 5;
const APPLY = process.argv.includes('--apply');
const OUT = join(process.env.VAR_DIR || join(ROOT, 'var'), 'etsy-sync.json');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function fetchPage(page) {
  const res = await fetch(`${SHOP_URL}?page=${page}`, {
    headers: {
      'user-agent': UA,
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function extractListingIds(html) {
  const ids = new Set();
  for (const m of html.matchAll(/data-listing-id="(\d+)"/g)) ids.add(m[1]);
  for (const m of html.matchAll(/etsy\.com\/listing\/(\d+)\//g)) ids.add(m[1]);
  return ids;
}

async function main() {
  const catalog = JSON.parse(await readFile(join(ROOT, 'data/catalog.json'), 'utf8'));
  const localIds = new Map(catalog.products.map((p) => [p.etsyId, p]));

  console.log(`Local catalogue: ${localIds.size} listings`);

  const liveIds = new Set();
  let fetchedPages = 0;

  // Offline mode: pass saved shop pages (Ctrl+S in a browser) or a JSON file of
  // listing ids. This is the workaround when Etsy 403s automated fetches.
  const fileFlag = process.argv.indexOf('--from-files');
  if (fileFlag !== -1) {
    const files = process.argv.slice(fileFlag + 1).filter((f) => !f.startsWith('--'));
    if (files.length === 0) {
      console.error('--from-files needs at least one saved .html or ids .json file.');
      process.exit(1);
    }
    for (const f of files) {
      const content = await readFile(f, 'utf8');
      if (f.endsWith('.json')) {
        for (const id of JSON.parse(content)) liveIds.add(String(id));
      } else {
        extractListingIds(content).forEach((id) => liveIds.add(id));
      }
      console.log(`  ${f}: total ids so far ${liveIds.size}`);
    }
    fetchedPages = PAGES; // caller vouches the export is complete
    return diff(catalog, localIds, liveIds, fetchedPages);
  }

  console.log(`Fetching ${SHOP_URL} (${PAGES} pages)…`);

  for (let page = 1; page <= PAGES; page++) {
    try {
      const html = await fetchPage(page);
      const ids = extractListingIds(html);
      ids.forEach((id) => liveIds.add(id));
      fetchedPages++;
      console.log(`  page ${page}: ${ids.size} listings`);
      // Be a polite scraper.
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      console.error(`  page ${page}: FAILED (${err.message})`);
      if (String(err.message).includes('403')) {
        console.error(
          '\nEtsy is blocking automated requests from this connection.\n' +
            'Nothing was changed. Options:\n' +
            '  1. Run again from a normal home connection (403s are usually datacenter IPs).\n' +
            '  2. Open the shop in a browser, save each page (Ctrl+S), and pass the files:\n' +
            '     node scripts/etsy-sync.mjs --from-files page1.html page2.html …\n',
        );
        await writeResult({ status: 'blocked', fetchedPages, liveCount: 0, sold: [] });
        process.exit(2);
      }
    }
  }

  return diff(catalog, localIds, liveIds, fetchedPages);
}

async function diff(catalog, localIds, liveIds, fetchedPages) {
  if (liveIds.size === 0) {
    console.error('No listings found — refusing to mark the whole catalogue sold on an empty read.');
    await writeResult({ status: 'empty_read', fetchedPages, liveCount: 0, sold: [] });
    process.exit(2);
  }

  // Safety rail: a partial read (some pages failed) must not mass-mark stock as
  // sold. Only diff when every page was read.
  if (fetchedPages < PAGES) {
    console.error(`Only ${fetchedPages}/${PAGES} pages read — reporting without applying.`);
  }

  const sold = [...localIds.entries()]
    .filter(([etsyId]) => !liveIds.has(etsyId))
    .map(([etsyId, p]) => ({ etsyId, slug: p.slug, title: p.title, priceUsd: p.priceUsd }));

  console.log(`\nLive on Etsy : ${liveIds.size}`);
  console.log(`Presumed sold: ${sold.length}`);
  for (const s of sold) console.log(`  - ${s.title} ($${s.priceUsd})`);

  const canApply = APPLY && fetchedPages === PAGES;
  if (canApply && sold.length > 0) {
    for (const s of sold) {
      const p = catalog.products.find((x) => x.etsyId === s.etsyId);
      if (p) p.stock = 0;
    }
    await writeFile(join(ROOT, 'data/catalog.json'), JSON.stringify(catalog, null, 2));
    console.log(`\nApplied: ${sold.length} listings marked stock 0 in data/catalog.json.`);
    console.log('Rebuild the site (npm run build) to reflect it on the storefront.');
  } else if (APPLY && fetchedPages < PAGES) {
    console.log('\n--apply skipped: incomplete read.');
  } else if (sold.length > 0) {
    console.log('\nDry run — re-run with --apply to mark these sold.');
  }

  await writeResult({
    status: fetchedPages === PAGES ? 'ok' : 'partial',
    fetchedPages,
    liveCount: liveIds.size,
    sold,
    applied: canApply && sold.length > 0,
  });
}

async function writeResult(result) {
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify({ ...result, ranAt: new Date().toISOString(), shop: SHOP_URL }, null, 2),
  );
  console.log(`\nResult written to ${OUT}`);
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
