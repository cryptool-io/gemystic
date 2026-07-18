/**
 * Seeds one demo order so the admin order pipeline can be walked before real
 * customers arrive.
 *
 *   DATABASE_URL=... npx tsx scripts/seed-order.ts
 *   ... --paid        create it already paid (skips the payment step)
 *
 * Uses two real in-stock stones so the totals, snapshots and documents are all
 * genuine. Re-running replaces the previous demo order rather than piling up.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

const prisma = new PrismaClient();
const PAID = process.argv.includes('--paid');

interface CatalogProduct {
  slug: string;
  title: string;
  etsyId: string;
  image: string;
  priceUsd: number;
  species: string;
  caratWeight: number | null;
  gramWeight: number | null;
  cut: string | null;
  color: string;
  origin: string;
  treatment: string;
  shipsFrom: string;
  stock: number;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const catalog = JSON.parse(readFileSync('data/catalog.json', 'utf8')) as {
    products: CatalogProduct[];
  };
  const picks = catalog.products.filter((p) => p.stock > 0).slice(0, 2);
  if (picks.length === 0) {
    console.error('No in-stock products in the catalogue.');
    process.exit(1);
  }

  const orderNumber = 'GEM-DEMO-0001';
  await prisma.order.deleteMany({ where: { orderNumber } });

  const subtotal = picks.reduce((a, p) => a + p.priceUsd, 0);
  const shipping = 0; // demo order clears the free-shipping threshold
  const grandTotal = Math.round((subtotal + shipping) * 100) / 100;

  await prisma.order.create({
    data: {
      orderNumber,
      guestEmail: 'demo.buyer@example.com',
      status: PAID ? 'paid' : 'pending',
      paidAt: PAID ? new Date() : null,
      subtotal,
      shippingTotal: shipping,
      discountTotal: 0,
      grandTotal,
      customerNote: 'Demo order created by scripts/seed-order.ts. Safe to cancel or delete.',
      shippingAddress: {
        fullName: 'Demo Buyer',
        email: 'demo.buyer@example.com',
        phone: '+44 7700 900123',
        line1: '12 Hatton Garden',
        city: 'London',
        region: 'Greater London',
        postcode: 'EC1N 8AT',
        countryCode: 'GB',
        shippingMethod: 'normal',
        shippingLabel: 'Normal (insured, tracked)',
      },
      items: {
        create: picks.map((p) => ({
          titleSnapshot: p.title,
          skuSnapshot: p.etsyId,
          imageSnapshot: p.image,
          specsSnapshot: {
            slug: p.slug,
            species: p.species,
            caratWeight: p.caratWeight,
            gramWeight: p.gramWeight,
            cut: p.cut,
            colour: p.color,
            origin: p.origin,
            treatment: p.treatment,
            shipsFrom: p.shipsFrom,
          },
          unitPrice: p.priceUsd,
          quantity: 1,
          lineTotal: p.priceUsd,
        })),
      },
      ...(PAID
        ? {
            payments: {
              create: {
                provider: 'demo',
                providerRef: `demo_${orderNumber}`,
                status: 'captured',
                amount: grandTotal,
              },
            },
          }
        : {}),
    },
  });

  console.log(
    `Seeded ${orderNumber} (${PAID ? 'paid' : 'awaiting payment'}) with ${picks.length} stones, total $${grandTotal}.`,
  );
  console.log('Open: /admin/orders');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
