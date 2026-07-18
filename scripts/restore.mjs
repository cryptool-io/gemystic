/**
 * Restores an archive produced by backup.mjs.
 *
 *   node scripts/restore.mjs var/backups/gemystic-2026-07-18T....json.gz
 *   node scripts/restore.mjs <file> --dry-run
 *
 * A backup you have never restored is a hope, not a backup. This is deliberately
 * simple enough to run under pressure.
 */
import { createReadStream, existsSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [, , file, ...flags] = process.argv;
const dryRun = flags.includes('--dry-run');

if (!file) {
  console.error('Usage: node scripts/restore.mjs <archive.json.gz> [--dry-run]');
  process.exit(1);
}
if (!existsSync(file)) {
  console.error(`No such archive: ${file}`);
  process.exit(1);
}

async function read() {
  const chunks = [];
  const stream = createReadStream(file).pipe(createGunzip());
  for await (const c of stream) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const archive = await read();
console.log(`Archive from ${archive.manifest.createdAt} — ${archive.manifest.fileCount} files`);

if (dryRun) {
  for (const e of archive.entries) console.log(`  would write ${e.path} (${e.size} bytes)`);
  console.log('\nDry run — nothing written.');
  process.exit(0);
}

let written = 0;
for (const e of archive.entries) {
  const dest = join(ROOT, e.path);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(e.base64, 'base64'));
  written++;
}

console.log(`Restored ${written} files into ${ROOT}`);
console.log('Run `npm run normalize` if data/etsy-raw.txt or data/species.json changed.');
