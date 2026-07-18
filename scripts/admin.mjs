/**
 * Admin account CLI. A safety hatch so you are never locked out of your own site.
 *
 *   node scripts/admin.mjs list                    # show all accounts + roles
 *   node scripts/admin.mjs promote you@email.com   # make an account the owner
 *   node scripts/admin.mjs set you@email.com admin # set an explicit role
 *
 * Roles: customer < staff < admin < owner
 *
 * Reads and writes the same JSON store the app uses (var/auth/users.json). Once
 * the Postgres migration lands this becomes a thin wrapper over an UPDATE.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DB = join(process.env.VAR_DIR || join(ROOT, 'var'), 'auth', 'users.json');
const ROLES = ['customer', 'staff', 'admin', 'owner'];

async function load() {
  if (!existsSync(DB)) return { users: [], sessions: [] };
  return JSON.parse(await readFile(DB, 'utf8'));
}
async function save(db) {
  await mkdir(dirname(DB), { recursive: true });
  await writeFile(DB, JSON.stringify(db, null, 2));
}

const [cmd, email, role] = process.argv.slice(2);
const db = await load();

if (cmd === 'list') {
  if (db.users.length === 0) {
    console.log('No accounts yet. The first person to register becomes the owner.');
  } else {
    for (const u of db.users) {
      console.log(`  ${u.role.padEnd(9)} ${u.email}${u.fullName ? `  (${u.fullName})` : ''}`);
    }
  }
} else if (cmd === 'promote' || cmd === 'set') {
  if (!email) {
    console.error('Usage: node scripts/admin.mjs promote <email>');
    process.exit(1);
  }
  const target = cmd === 'promote' ? 'owner' : role;
  if (!ROLES.includes(target)) {
    console.error(`Role must be one of: ${ROLES.join(', ')}`);
    process.exit(1);
  }
  const u = db.users.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u) {
    console.error(`No account with email ${email}. Register it first at /register.`);
    process.exit(1);
  }
  u.role = target;
  await save(db);
  console.log(`${u.email} is now ${target}.`);
} else {
  console.log('Commands:');
  console.log('  list                     show all accounts and roles');
  console.log('  promote <email>          make an account the owner');
  console.log('  set <email> <role>       set a specific role (customer|staff|admin|owner)');
}
