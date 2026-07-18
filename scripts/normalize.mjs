/**
 * Turns the scraped Etsy export into the enriched catalogue the storefront runs on.
 *
 * The point of this step is that an Etsy title is the only structured data we get.
 * Everything the site needs for faceted browsing, schema.org markup and AI answers
 * — species, variety, weight, cut, colour, origin, treatment — has to be parsed
 * back out of that one string. Run with: npm run normalize
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SPECIES = JSON.parse(readFileSync(join(ROOT, 'data/species.json'), 'utf8'));
const TAXONOMY = JSON.parse(readFileSync(join(ROOT, 'data/taxonomy.json'), 'utf8'));

/**
 * Category is derived from the taxonomy file rather than a constant in this
 * script, so the shop owner can re-map a form to a different category (or add a
 * category) without anyone editing code. Mirrors the `categories` table.
 */
const FORM_TO_CATEGORY = Object.fromEntries(
  TAXONOMY.categories.flatMap((c) => (c.formMapping ?? []).map((f) => [f, c.slug])),
);

/**
 * "Emerald Cut Rhodolite Garnet" is a garnet, not an emerald. Cut names shadow
 * species names all over this catalogue, so strip the cut vocabulary before
 * asking what the stone is.
 */
function stripCutPhrases(title) {
  return title.replace(/\bemerald[\s-]*cut\b/gi, ' ').replace(/\bcut\b/gi, ' ');
}

/** Order matters: the first pattern that hits wins, so put specific before generic. */
const SPECIES_PATTERNS = [
  [/ametrine/i, 'ametrine'],
  [/emerald/i, 'emerald'],
  [/pigeon\s*blood|ruby/i, 'ruby'],
  [/sapphire/i, 'sapphire'],
  [/corundum/i, 'corundum'],
  [/tourmaline|indicolite|rubellite|schorl/i, 'tourmaline'],
  [/garnet|rhodolite|spessartine|hessonite/i, 'garnet'],
  [/peridot/i, 'peridot'],
  [/topaz/i, 'topaz'],
  [/citrine/i, 'citrine'],
  [/amethyst|prasiolite/i, 'amethyst'],
  [/aquamarine/i, 'aquamarine'],
  [/spinel/i, 'spinel'],
  [/fluorite/i, 'fluorite'],
  [/smoky\s*quartz|clear\s*quartz|quartz/i, 'quartz'],
  [/beryl/i, 'beryl'],
];

const VARIETY_PATTERNS = [
  [/pigeon\s*blood/i, 'Pigeon Blood Ruby'],
  [/swat/i, 'Swat Emerald'],
  [/zambian/i, 'Zambian Emerald'],
  [/indicolite/i, 'Indicolite Tourmaline'],
  [/rubellite/i, 'Rubellite Tourmaline'],
  [/teal\s*(green\s*)?tourmaline/i, 'Teal Tourmaline'],
  [/black\s*tourmaline/i, 'Black Tourmaline (Schorl)'],
  [/spessartine|mandarin|fanta/i, 'Spessartine Garnet'],
  [/rhodolite/i, 'Rhodolite Garnet'],
  [/hessonite/i, 'Hessonite Garnet'],
  [/imperial\s*topaz/i, 'Imperial Topaz'],
  [/london\s*blue/i, 'London Blue Topaz'],
  [/sky\s*blue\s*topaz/i, 'Sky Blue Topaz'],
  [/electric\s*blue\s*topaz/i, 'Electric Blue Topaz'],
  [/pink\s*topaz/i, 'Pink Topaz'],
  [/green\s*amethyst|prasiolite/i, 'Prasiolite (Green Amethyst)'],
  [/honey\s*citrine/i, 'Honey Citrine'],
  [/yellow\s*citrine/i, 'Yellow Citrine'],
  [/smoky\s*quartz/i, 'Smoky Quartz'],
  [/clear\s*quartz/i, 'Clear Quartz'],
  [/yellow\s*sapphire/i, 'Yellow Sapphire'],
  [/purple\s*corundum/i, 'Purple Corundum'],
];

const CUTS = [
  [/cushion[\s-]*cut|cushion/i, 'Cushion'],
  [/emerald\s*cut/i, 'Emerald Cut'],
  [/radiant\s*cut|radiant/i, 'Radiant'],
  [/oval\s*cut|\boval\b/i, 'Oval'],
  [/pear\s*cut|\bpear\b/i, 'Pear'],
  [/trillion/i, 'Trillion'],
  [/asscher/i, 'Asscher'],
  [/baguette/i, 'Baguette'],
  [/octagon/i, 'Octagon'],
  [/heart(?!\s*chakra)/i, 'Heart'],
  [/round|brilliant/i, 'Round Brilliant'],
  [/diamond\s*cut/i, 'Diamond Cut'],
  [/pixel\s*cut/i, 'Pixel Cut'],
  [/fancy\s*cut|fancy/i, 'Fancy'],
  [/cabochon/i, 'Cabochon'],
];

/** Setting style, used to keep the jewellery titles distinct from one another. */
const STYLES = [
  [/three\s*stone|triple|multicolor|multicolour/i, 'Three Stone'],
  [/crisscross|criss[\s-]*cross/i, 'Crisscross'],
  [/halo/i, 'Halo'],
  [/bezel/i, 'Bezel'],
  [/solitaire/i, 'Solitaire'],
  [/open\s*band/i, 'Open Band'],
  [/vintage/i, 'Vintage'],
  [/heart(?!\s*chakra)/i, 'Heart'],
  [/rectangle|rectangular/i, 'Rectangular'],
  [/pear/i, 'Pear'],
  [/statement/i, 'Statement'],
];

const GENDERS = [
  [/\bmen'?s\b|for\s+men|for\s+him/i, "Men's"],
  [/\bwomen'?s\b|for\s+women|for\s+her/i, "Women's"],
];

const COLORS = [
  [/pigeon\s*blood|\bred\b|ruby|rubellite|rhodolite/i, 'Red'],
  [/\bpink\b/i, 'Pink'],
  [/\borange\b|fanta|mandarin|spessartine|hessonite/i, 'Orange'],
  [/honey|golden|\byellow\b|citrine|imperial\s*topaz|amber/i, 'Yellow / Gold'],
  [/\bgreen\b|emerald|peridot|prasiolite/i, 'Green'],
  [/teal/i, 'Teal'],
  [/\bblue\b|sapphire|aquamarine|indicolite|london/i, 'Blue'],
  [/purple|amethyst|violet/i, 'Purple'],
  [/\bblack\b|schorl/i, 'Black'],
  [/smoky|\bbrown\b/i, 'Brown'],
  [/clear|colourless|colorless/i, 'Colourless'],
];

/**
 * Physical form drives everything from shipping to how the page should be written.
 *
 * The hard case is telling a finished ring from a loose stone, because loose-stone
 * titles are full of "for Rings, Pendants" and "Engagement Ring Gem" keyword bait.
 * The reliable signal is a metal: an actual piece of jewellery always names what
 * it is made of, and a loose stone never does.
 */
const METAL = /\b(silver|sterling|gold|925|21k|18k|14k|band)\b/i;

function detectForm(t) {
  const isJewellery = METAL.test(t);
  if (isJewellery && /\bring\b/i.test(t)) return 'ring';
  if (isJewellery && /pendant|necklace/i.test(t)) return 'pendant';
  if (/\blot\b|parcel|\bbulk\b|assorted|mixed\s*size/i.test(t)) return 'parcel';
  if (/specimen|matrix|cluster|crystal\s*point|mineral/i.test(t)) return 'specimen';
  if (/\braw\b|rough|uncut/i.test(t)) return 'rough';
  if (/cabochon/i.test(t)) return 'cabochon';
  return 'faceted';
}

const FORM_LABEL = {
  ring: 'Handmade Ring',
  pendant: 'Pendant',
  parcel: 'Wholesale Parcel',
  specimen: 'Mineral Specimen',
  rough: 'Rough Crystal',
  cabochon: 'Cabochon',
  faceted: 'Loose Faceted Gemstone',
};

// Category now comes from data/taxonomy.json via FORM_TO_CATEGORY.

function first(patterns, text) {
  for (const [re, val] of patterns) if (re.test(text)) return val;
  return null;
}

/** Etsy renders EUR the Dutch way: 1.279,79 -> 1279.79 */
function parseEuro(s) {
  return Number(s.replace(/\./g, '').replace(',', '.'));
}

/**
 * gemysticgems.com trades in USD, but the Etsy export came through a Netherlands
 * locale and is therefore denominated in EUR. Prices are converted once here so
 * the storefront has a single source of truth per currency.
 *
 * This is a stored rate, not a live feed — re-run normalize when it drifts.
 */
const EUR_TO_USD = 1.17;

function toUsd(eur) {
  // Round to the .00/.50 the existing shop prices sit on rather than emitting
  // artefacts of the exchange rate like $193.47.
  const raw = eur * EUR_TO_USD;
  return Math.round(raw * 2) / 2;
}

function parseWeight(title) {
  const ct = title.match(/(\d+(?:\.\d+)?)\s*(?:ct|carat|carats|Ct)\b/i);
  if (ct) return { caratWeight: Number(ct[1]), gramWeight: null };
  const g = title.match(/(\d+(?:\.\d+)?)\s*(?:g|grams|gram)\b/i);
  if (g) return { caratWeight: null, gramWeight: Number(g[1]) };
  return { caratWeight: null, gramWeight: null };
}

function parseDimensions(title) {
  const box = title.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)(?:\s*[xX×]\s*(\d+(?:\.\d+)?))?\s*mm/);
  if (box) return box[0];
  const single = title.match(/(\d+(?:\.\d+)?)\s*mm/);
  return single ? single[0] : null;
}

function detectOrigin(title) {
  if (/swat/i.test(title)) return 'Swat Valley, Pakistan';
  if (/zambian/i.test(title)) return 'Zambia';
  if (/pakistan/i.test(title)) return 'Pakistan';
  return 'Pakistan';
}

function detectTreatment(title, speciesKey) {
  if (/glass[\s-]*filled/i.test(title)) return 'Lead-glass filled (disclosed)';
  if (/unheated|untreated/i.test(title)) return 'Unheated / untreated';
  if (/heated/i.test(title)) return 'Heat treated';
  const s = SPECIES[speciesKey];
  return s ? s.typicalTreatment : 'See listing details';
}

/**
 * Assembles the snippet clause by clause, dropping whole clauses that would not
 * fit rather than slicing mid-sentence. A meta description that ends "over EUR"
 * looks broken in a search result and costs clicks.
 */
function buildMetaDescription(p, species) {
  const LIMIT = 158;
  const opener = `${p.title}.`;
  const optional = [
    species.priceDriver ? `${species.priceDriver}.` : null,
    `Natural, ethically sourced from ${p.origin}.`,
    'One-of-a-kind stone.',
    'Free worldwide shipping over $500.',
  ].filter(Boolean);

  let out = opener;
  for (const clause of optional) {
    if (out.length + 1 + clause.length <= LIMIT) out += ` ${clause}`;
  }
  return out;
}

/** Cuts to a length limit on a word boundary — a snippet ending "worldwide s" reads as broken. */
function truncateWords(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.—-]+$/, '');
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/**
 * The title Etsy shows is keyword soup. We rebuild a clean commercial title and
 * keep the original for reference / re-sync.
 */
function buildTitle(p) {
  const bits = [];

  // Jewellery needs its distinguishing detail up front, otherwise fourteen
  // tourmaline rings all normalise to the same string and compete with each other
  // in search results.
  if (p.form === 'ring' || p.form === 'pendant') {
    if (p.gender) bits.push(p.gender);
    if (p.style) bits.push(p.style);
    if (p.color && p.color !== 'Mixed' && !(p.variety || '').includes(p.color)) bits.push(p.color);
    bits.push(p.variety || SPECIES[p.species].name);
    bits.push(p.form === 'ring' ? 'Sterling Silver Ring' : 'Sterling Silver Pendant');
    return bits.join(' ');
  }

  if (p.variety) bits.push(p.variety);
  else bits.push(SPECIES[p.species].name);
  if (p.caratWeight) bits.push(`${p.caratWeight}ct`);
  else if (p.gramWeight) bits.push(`${p.gramWeight}g`);
  // Some cut names already carry the word ("Emerald Cut"), so don't say Cut twice.
  if (p.cut && !['ring', 'pendant', 'specimen'].includes(p.form)) {
    bits.push(/cut$/i.test(p.cut) ? p.cut : `${p.cut} Cut`);
  }
  if (p.form === 'ring') bits.push('Sterling Silver Ring');
  if (p.form === 'pendant') bits.push('Silver Pendant');
  if (p.form === 'specimen') bits.push('Mineral Specimen');
  if (p.form === 'rough') bits.push('Rough Crystal');
  if (p.form === 'parcel') bits.push('Parcel');
  return bits.join(' ');
}

/** "cut as a oval" reads as machine-written; pick the article from the sound. */
function article(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/** Composes the on-page description. Deterministic here; the AI tools can rewrite it later. */
function buildDescription(p) {
  const s = SPECIES[p.species];
  const weight = p.caratWeight
    ? `${p.caratWeight} ${p.caratWeight === 1 ? 'carat' : 'carats'}`
    : p.gramWeight
    ? `${p.gramWeight} ${p.gramWeight === 1 ? 'gram' : 'grams'}`
    : null;

  // Only worked stones were cut. A specimen or a rough crystal was mined.
  const worked = ['faceted', 'cabochon', 'ring', 'pendant'].includes(p.form);
  const provenance = worked ? `cut in ${p.origin}.` : `mined in ${p.origin}.`;

  const lead = [
    `A natural ${p.variety ? p.variety.toLowerCase() : s.name.toLowerCase()}`,
    weight ? `weighing ${weight}` : null,
    p.cut && p.form === 'faceted' ? `cut as ${article(p.cut)} ${p.cut.toLowerCase()},` : null,
    p.cut && p.form === 'faceted' ? `from ${p.origin}.` : provenance,
  ]
    .filter(Boolean)
    .join(' ');

  const body = {
    faceted: `Hand-selected for colour and life rather than paper grades. ${s.buyingNotes}`,
    cabochon: `Polished as a cabochon to show body colour and any internal character. ${s.buyingNotes}`,
    specimen: `Presented as found, on its natural matrix. Specimens are valued for crystal form and undamaged terminations rather than facetable clarity.`,
    rough: `Untouched rough exactly as it came out of the ground, for cutters, wire wrappers and collectors who want the crystal habit intact.`,
    parcel: `A mixed parcel priced per lot, sorted for usable colour. Ideal for designers who need matched-tone material across several pieces.`,
    ring: `Hand-fabricated in sterling silver in our Peshawar workshop. Every ring is made around its individual stone, so no two are identical.`,
    pendant: `Hand-fabricated in sterling silver and set to show the stone from both sides where the design allows.`,
  }[p.form];

  return `${lead}\n\n${body}\n\n**Care.** ${s.care}\n\n**Treatment.** ${p.treatment}`;
}

function buildKeywords(p) {
  const s = SPECIES[p.species];
  const k = new Set();
  const base = (p.variety || s.name).toLowerCase();
  k.add(base);
  k.add(`natural ${base}`);
  k.add(`${base} for sale`);
  k.add(`buy ${base} online`);
  if (p.caratWeight) k.add(`${p.caratWeight}ct ${base}`);
  if (p.cut) k.add(`${p.cut.toLowerCase()} ${base}`);
  if (p.form === 'faceted') k.add(`loose ${base}`);
  if (p.form === 'ring') k.add(`${base} silver ring`);
  if (p.form === 'specimen') k.add(`${base} mineral specimen`);
  if (p.form === 'rough') k.add(`rough ${base}`);
  for (const m of s.birthstone) if (m !== '—') k.add(`${m.toLowerCase()} birthstone`);
  k.add(`${s.chakra.toLowerCase().split(' ')[0]} chakra stone`);
  k.add(`${p.origin.toLowerCase()} gemstone`);
  return [...k].slice(0, 14);
}

function main() {
  const raw = readFileSync(join(ROOT, 'data/etsy-raw.txt'), 'utf8').trim().split('\n');
  const seen = new Set();
  const products = [];

  for (const line of raw) {
    // Etsy titles contain pipes themselves, so anchor on the ends: the first field
    // is the id, the last three are price/image/slug, and the title is the middle.
    const f = line.split('|');
    if (f.length < 5) continue;
    const etsyId = f[0];
    const [priceStr, imgPath, etsySlug] = f.slice(-3);
    const title = f.slice(1, -3).join('|').trim();
    if (!etsyId) continue;

    const speciesKey = first(SPECIES_PATTERNS, stripCutPhrases(title)) || 'quartz';
    const form = detectForm(title);
    const { caratWeight, gramWeight } = parseWeight(title);

    const p = {
      id: etsyId,
      etsyId,
      etsyUrl: `https://www.etsy.com/listing/${etsyId}/${etsySlug}`,
      originalTitle: title,
      species: speciesKey,
      variety: first(VARIETY_PATTERNS, title),
      form,
      formLabel: FORM_LABEL[form],
      category: FORM_TO_CATEGORY[form] ?? 'faceted-gemstones',
      cut: first(CUTS, title),
      style: first(STYLES, title),
      gender: first(GENDERS, title),
      color: first(COLORS, title) || 'Mixed',
      caratWeight,
      gramWeight,
      dimensions: parseDimensions(title),
      origin: detectOrigin(title),
      certified: /guild|grs|ssef|certified/i.test(title),
      priceEur: parseEuro(priceStr),
      priceUsd: toUsd(parseEuro(priceStr)),
      image: `https://i.etsystatic.com/58902225/${imgPath}`,
      imageLarge: `https://i.etsystatic.com/58902225/${imgPath.replace('il_340x270', 'il_794xN')}`,
      stock: 1,
      shipsFrom: 'PK',
    };

    p.treatment = detectTreatment(title, speciesKey);
    p.title = buildTitle(p);

    // Titles collide once we normalise them (three 0.76ct Swat emeralds, etc),
    // so disambiguate with the Etsy id rather than dropping listings.
    let slug = slugify(p.title);
    if (seen.has(slug)) slug = `${slug}-${etsyId.slice(-4)}`;
    seen.add(slug);
    p.slug = slug;

    p.description = buildDescription(p);
    p.keywords = buildKeywords(p);
    // The Next metadata template appends " | Gemystic", so the brand must not be
    // baked in here — budget 48 chars and let the template use the rest of the 60.
    p.metaTitle = truncateWords(`${p.title} | ${p.origin.split(',')[0]}`, 48);
    p.metaDescription = buildMetaDescription(p, SPECIES[speciesKey]);

    products.push(p);
  }

  // Facets are precomputed so the shop page never has to scan the catalogue at request time.
  const facets = {
    species: tally(products, (p) => p.species),
    variety: tally(products, (p) => p.variety),
    form: tally(products, (p) => p.form),
    cut: tally(products, (p) => p.cut),
    color: tally(products, (p) => p.color),
    category: tally(products, (p) => p.category),
  };

  const out = {
    generatedAt: new Date().toISOString(),
    source: 'etsy:GemysticGemsStudio',
    count: products.length,
    currency: 'USD',
    fxRate: { base: 'EUR', quote: 'USD', rate: EUR_TO_USD },
    facets,
    products,
  };

  mkdirSync(join(ROOT, 'data'), { recursive: true });
  writeFileSync(join(ROOT, 'data/catalog.json'), JSON.stringify(out, null, 2));

  console.log(`Normalised ${products.length} listings`);
  console.log('  species :', Object.entries(facets.species).map(([k, v]) => `${k}(${v})`).join(' '));
  console.log('  forms   :', Object.entries(facets.form).map(([k, v]) => `${k}(${v})`).join(' '));
  const total = products.reduce((a, p) => a + p.priceUsd, 0);
  console.log(`  inventory value: USD ${total.toFixed(2)}`);
}

function tally(items, fn) {
  const m = {};
  for (const it of items) {
    const v = fn(it);
    if (v == null) continue;
    m[v] = (m[v] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
}

main();
