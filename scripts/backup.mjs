/**
 * Backup. Local-first, with AWS as an opt-in destination.
 *
 *   node scripts/backup.mjs            # write a local archive
 *   BACKUP_DRIVER=s3 node scripts/backup.mjs
 *
 * What gets captured is the state that cannot be rebuilt from source control:
 * the scraped catalogue, the gemmological knowledge base, runtime uploads, and
 * the mail outbox. Node modules and .next are excluded — they are reproducible.
 *
 * Uses zlib + tar-free framing via Node built-ins only, so it runs on a bare box
 * with no extra packages.
 */
import { createGzip } from 'node:zlib';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readdir, readFile, stat, writeFile, unlink } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCES = ['data', 'var/uploads', 'var/outbox'];
const BACKUP_DIR = process.env.BACKUP_DIR || join(ROOT, 'var/backups');
const DRIVER = process.env.BACKUP_DRIVER || 'local';
const RETAIN_DAYS = Number(process.env.BACKUP_RETAIN_DAYS || '30');

async function walk(dir, base, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, base, out);
    else out.push({ full, rel: relative(base, full).replace(/\\/g, '/') });
  }
  return out;
}

/**
 * A JSON envelope of base64 file contents rather than real tar. Restore is a
 * plain script (see restore.mjs), the format is inspectable, and it avoids
 * shelling out to a tar binary that may not exist on Windows hosts.
 */
async function buildArchive() {
  const files = [];
  for (const src of SOURCES) {
    files.push(...(await walk(join(ROOT, src), ROOT)));
  }

  const entries = [];
  let bytes = 0;
  for (const f of files) {
    const buf = await readFile(f.full);
    const info = await stat(f.full);
    bytes += buf.length;
    entries.push({
      path: f.rel,
      mtime: info.mtime.toISOString(),
      size: buf.length,
      base64: buf.toString('base64'),
    });
  }

  return {
    manifest: {
      createdAt: new Date().toISOString(),
      host: process.env.HOSTNAME || 'unknown',
      fileCount: entries.length,
      rawBytes: bytes,
      sources: SOURCES,
    },
    entries,
  };
}

async function pruneLocal() {
  if (!existsSync(BACKUP_DIR)) return 0;
  const cutoff = Date.now() - RETAIN_DAYS * 86400_000;
  let removed = 0;
  for (const name of await readdir(BACKUP_DIR)) {
    if (!name.endsWith('.json.gz')) continue;
    const p = join(BACKUP_DIR, name);
    const info = await stat(p);
    if (info.mtimeMs < cutoff) {
      await unlink(p);
      removed++;
    }
  }
  return removed;
}

async function uploadToS3(filePath, key) {
  let s3;
  try {
    s3 = await import('@aws-sdk/client-s3');
  } catch {
    console.error(
      '\n  BACKUP_DRIVER=s3 requires the AWS SDK, which is not installed.\n' +
        '  Run: npm install @aws-sdk/client-s3\n' +
        '  The local archive was still written, so nothing is lost.\n',
    );
    process.exitCode = 1;
    return false;
  }

  const bucket = process.env.BACKUP_S3_BUCKET;
  if (!bucket) {
    console.error('  BACKUP_S3_BUCKET is not set. Local archive kept.');
    process.exitCode = 1;
    return false;
  }

  const client = new s3.S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  await client.send(
    new s3.PutObjectCommand({
      Bucket: bucket,
      Key: `${process.env.BACKUP_S3_PREFIX || 'backups/'}${key}`,
      Body: await readFile(filePath),
      ContentType: 'application/gzip',
      // Cheap storage for something read only in a disaster.
      StorageClass: 'STANDARD_IA',
    }),
  );
  return true;
}

async function main() {
  const started = Date.now();
  await mkdir(BACKUP_DIR, { recursive: true });

  const archive = await buildArchive();
  if (archive.entries.length === 0) {
    console.error('Nothing to back up — no files found in: ' + SOURCES.join(', '));
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `gemystic-${stamp}.json.gz`;
  const dest = join(BACKUP_DIR, name);

  await pipeline(Readable.from([JSON.stringify(archive)]), createGzip({ level: 9 }), createWriteStream(dest));

  const out = await stat(dest);
  const ratio = ((1 - out.size / archive.manifest.rawBytes) * 100).toFixed(0);

  console.log(`Backup written: ${dest}`);
  console.log(`  files      : ${archive.manifest.fileCount}`);
  console.log(`  raw        : ${(archive.manifest.rawBytes / 1e6).toFixed(2)} MB`);
  console.log(`  compressed : ${(out.size / 1e6).toFixed(2)} MB (${ratio}% smaller)`);
  console.log(`  took       : ${Date.now() - started} ms`);

  const pruned = await pruneLocal();
  if (pruned) console.log(`  pruned     : ${pruned} archive(s) older than ${RETAIN_DAYS} days`);

  if (DRIVER === 's3') {
    const ok = await uploadToS3(dest, name);
    console.log(ok ? `  uploaded   : s3://${process.env.BACKUP_S3_BUCKET}/${name}` : '  uploaded   : FAILED');
  } else {
    console.log('  driver     : local (set BACKUP_DRIVER=s3 to also push offsite)');
  }

  // A manifest that is readable without decompressing the archive.
  await writeFile(
    join(BACKUP_DIR, 'latest.json'),
    JSON.stringify({ ...archive.manifest, file: name, compressedBytes: out.size }, null, 2),
  );
}

main().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
