/**
 * Creates or promotes an admin account and prints a temporary password.
 *
 *   DATABASE_URL=... npx tsx scripts/grant-admin.ts someone@example.com [role]
 *
 * role defaults to admin (owner | admin | staff | customer also accepted).
 *
 * The password is generated here, printed once, and stored only as a bcrypt
 * hash. Hand it over out of band and have them change it from their account
 * page, which signs out every other device.
 */
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const email = (process.argv[2] ?? '').trim().toLowerCase();
const role = (process.argv[3] ?? 'admin').trim();

/** Readable but not guessable: no ambiguous characters to mistype over WhatsApp. */
function tempPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(18);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

async function main() {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Usage: tsx scripts/grant-admin.ts <email> [role]');
    process.exit(1);
  }
  if (!['owner', 'admin', 'staff', 'customer'].includes(role)) {
    console.error(`Unknown role "${role}".`);
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  const password = tempPassword();
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });

  const user = await prisma.user.upsert({
    where: { email },
    update: { role, passwordHash },
    create: { email, role, passwordHash, fullName: null },
  });

  // Any session they held is invalidated along with the old password.
  await prisma.session.deleteMany({ where: { userId: user.id } });

  console.log('');
  console.log(existing ? 'Updated existing account.' : 'Created new account.');
  console.log('  email:    ', user.email);
  console.log('  role:     ', user.role);
  console.log('  password: ', password);
  console.log('');
  console.log('Give them this password directly, not by email. They should sign in at');
  console.log('/login and change it at /account, which signs out every other device.');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
