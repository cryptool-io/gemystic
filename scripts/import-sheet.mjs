/**
 * Imports the owner's working inventory spreadsheet.
 *
 *   node scripts/import-sheet.mjs                 # report only
 *   DATABASE_URL=... node scripts/import-sheet.mjs --apply
 *
 * The sheet is published read-only, so each tab is fetched as CSV. Three tabs,
 * three shapes: cut stones (carats and millimetres), specimens (grams), and
 * rough parcels (per-gram pricing with a weight range). Rows are matched on the
 * stone code, so re-running updates rather than duplicates.
 *
 * Deliberately conservative: a row without a code or a name is reported and
 * skipped rather than guessed at, because a half-imported stone with the wrong
 * weight is worse than one the owner enters by hand.
 */
import { PrismaClient } from '@prisma/client';

const SHEET_ID = process.env.SHEET_ID ?? '199eSbr_R3yRNTkGh07BgFJxmThCScfco9vnVFu2QGiI';
const APPLY = process.argv.includes('--apply');

const TABS = [
  { gid: '0', kind: 'cut' },
  { gid: '1124399061', kind: 'specimen' },
  { gid: '1644689153', kind: 'rough_parcel' },
];

/** The sheet's "Listed" block, in column order after the Media column. */
const CHANNEL_ORDER = ['web', 'etsy', 'ebay', 'instagram', 'tiktok', 'gemrock', 'erock', 'firstdibs'];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const str = (v) => {
  const s = String(v ?? '').trim();
  return s.length > 0 ? s : null;
};

/** The sheet's status words, mapped onto the workflow the admin shows. */
function intakeStatus(raw) {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('upload')) return 'uploaded';
  if (s.includes('draft')) return 'in_draft';
  if (s.includes('filter')) return 'filter_images';
  return 'pending_images';
}

function channelsFrom(row, startIndex) {
  const out = {};
  CHANNEL_ORDER.forEach((channel, i) => {
    const cell = str(row[startIndex + i]);
    if (!cell) return;
    // A URL means it is live there; any other mark means listed without a link.
    out[channel] = {
      status: 'listed',
      listingUrl: /^https?:\/\//i.test(cell) ? cell : null,
    };
  });
  return out;
}

function parseRow(kind, row) {
  if (kind === 'cut') {
    // #, Name, O, Pair, Colour, Code, Price, Status, L, W, T, Diameter, ct, Comments, Shape, Media
    const code = str(row[5]);
    const name = str(row[1]);
    if (!code || !name) return null;
    return {
      sku: code,
      species: name,
      // "Pair" column marks matched stones sold together.
      stoneType: str(row[3]) ? 'pair' : 'cut',
      colour: str(row[4]),
      price: num(row[6]),
      intakeStatus: intakeStatus(row[7]),
      lengthMm: num(row[8]),
      widthMm: num(row[9]),
      heightMm: num(row[10]),
      diameterMm: num(row[11]),
      caratWeight: num(row[12]),
      intakeNotes: str(row[13]),
      shape: str(row[14]),
      mediaFolder: str(row[15]),
      priceUnit: 'piece',
      channels: {},
    };
  }

  if (kind === 'specimen') {
    // #, Name, Colour, Code, Per unit, Total, Status, L, W, T, from, to, Overall, Shape, Media, then channels
    const code = str(row[3]);
    const name = str(row[1]);
    if (!code || !name) return null;
    return {
      sku: code,
      species: name,
      stoneType: 'specimen',
      colour: str(row[2]),
      unitPrice: num(row[4]),
      price: num(row[5]),
      intakeStatus: intakeStatus(row[6]),
      lengthMm: num(row[7]),
      widthMm: num(row[8]),
      heightMm: num(row[9]),
      weightFromG: num(row[10]),
      weightToG: num(row[11]),
      weightGrams: num(row[12]),
      shape: str(row[13]),
      mediaFolder: str(row[14]),
      priceUnit: 'gram',
      channels: channelsFrom(row, 15),
    };
  }

  // rough_parcel: #, Name, Colour, Code, Per unit, Total, Status, L, W, T, Radius, from, to, Overall, Shape, Media, channels
  const code = str(row[3]);
  const name = str(row[1]);
  if (!code || !name) return null;
  return {
    sku: code,
    species: name,
    stoneType: 'rough_parcel',
    colour: str(row[2]),
    unitPrice: num(row[4]),
    price: num(row[5]),
    intakeStatus: intakeStatus(row[6]),
    lengthMm: num(row[7]),
    widthMm: num(row[8]),
    heightMm: num(row[9]),
    weightFromG: num(row[11]),
    weightToG: num(row[12]),
    weightGrams: num(row[13]),
    shape: str(row[14]),
    mediaFolder: str(row[15]),
    priceUnit: 'gram',
    channels: channelsFrom(row, 16),
  };
}

async function fetchTab(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Sheet tab ${gid} returned ${res.status}`);
  return parseCsv(await res.text());
}

const parsed = [];
const skipped = [];

for (const tab of TABS) {
  const rows = await fetchTab(tab.gid);
  // Two header rows in every tab.
  for (const row of rows.slice(2)) {
    if (!row.some((c) => c.trim())) continue;
    const item = parseRow(tab.kind, row);
    if (item && item.price) parsed.push(item);
    else if (row[1]?.trim() || row[3]?.trim() || row[5]?.trim()) {
      skipped.push({ tab: tab.kind, reason: item ? 'no price' : 'no code or name', row: row.slice(0, 7) });
    }
  }
}

console.log(`Parsed ${parsed.length} stones from ${TABS.length} tabs.`);
for (const kind of ['cut', 'pair', 'specimen', 'rough_parcel']) {
  const n = parsed.filter((p) => p.stoneType === kind).length;
  if (n) console.log(`  ${kind}: ${n}`);
}
console.log(`With a photo folder: ${parsed.filter((p) => p.mediaFolder).length}`);
console.log(`Already listed somewhere: ${parsed.filter((p) => Object.keys(p.channels).length > 0).length}`);
if (skipped.length) {
  console.log(`\nSkipped ${skipped.length} incomplete rows:`);
  for (const s of skipped.slice(0, 10)) console.log(`  [${s.tab}] ${s.reason}: ${s.row.join(' | ')}`);
}

if (!APPLY) {
  console.log('\nReport only. Re-run with --apply to write these into inventory.');
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required for --apply.');
  process.exit(1);
}

const prisma = new PrismaClient();

// Everything lands in one category until the owner sorts them; inventory is
// not a listing, so category only matters at step 2.
const categoryName = 'Inventory intake';
let category = await prisma.category.findFirst({ where: { slug: 'inventory-intake' } });
if (!category) {
  category = await prisma.category.create({
    data: { slug: 'inventory-intake', name: categoryName, isActive: false },
  });
}

let created = 0;
let updated = 0;
let channelRows = 0;

for (const item of parsed) {
  const slugBase = `${item.species}-${item.sku}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const data = {
    slug: slugBase,
    categoryId: category.id,
    title: [item.species, item.shape, item.caratWeight ? `${item.caratWeight}ct` : item.weightGrams ? `${item.weightGrams}g` : null]
      .filter(Boolean)
      .join(' '),
    description: item.intakeNotes ?? '',
    price: item.price,
    quantity: 1,
    tags: [],
    stoneType: item.stoneType,
    intakeStatus: item.intakeStatus,
    colour: item.colour,
    shape: item.shape,
    caratWeight: item.caratWeight ?? null,
    lengthMm: item.lengthMm ?? null,
    widthMm: item.widthMm ?? null,
    heightMm: item.heightMm ?? null,
    diameterMm: item.diameterMm ?? null,
    weightGrams: item.weightGrams ?? null,
    weightFromG: item.weightFromG ?? null,
    weightToG: item.weightToG ?? null,
    unitPrice: item.unitPrice ?? null,
    priceUnit: item.priceUnit,
    mediaFolder: item.mediaFolder,
    intakeNotes: item.intakeNotes,
    originCountry: 'Pakistan',
    status: 'draft',
    source: 'sheet',
    sourceRef: item.sku,
  };

  const existing = await prisma.product.findUnique({ where: { sku: item.sku } });
  const product = existing
    ? await prisma.product.update({ where: { sku: item.sku }, data })
    : await prisma.product.create({ data: { ...data, sku: item.sku } });

  existing ? updated++ : created++;

  for (const [channel, v] of Object.entries(item.channels)) {
    await prisma.productChannel.upsert({
      where: { productId_channel: { productId: product.id, channel } },
      update: { status: v.status, listingUrl: v.listingUrl },
      create: { productId: product.id, channel, status: v.status, listingUrl: v.listingUrl },
    });
    channelRows++;
  }
}

console.log(`\nImported: ${created} created, ${updated} updated, ${channelRows} channel records.`);
await prisma.$disconnect();
