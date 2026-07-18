import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { config } from '../config';
import { optionalRequire, MissingDependencyError } from './optional';

export interface PutResult {
  key: string;
  url: string;
  driver: string;
}

/** Minimal structural type so the project typechecks without the AWS SDK installed. */
interface S3Module {
  S3Client: new (cfg: { region: string }) => { send(cmd: unknown): Promise<unknown> };
  PutObjectCommand: new (input: Record<string, unknown>) => unknown;
}

export interface Storage {
  readonly name: string;
  put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<PutResult>;
  urlFor(key: string): string;
}

/**
 * Writes into the local `var/uploads` tree, served back through a route handler.
 *
 * Deliberately not `public/`. Next only picks up `public/` at build time, so
 * runtime uploads written there would be invisible until the next deploy.
 */
class LocalStorage implements Storage {
  readonly name = 'local';

  async put(key: string, body: Buffer | Uint8Array, _contentType: string): Promise<PutResult> {
    const path = join(config.paths.uploads, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    return { key, url: this.urlFor(key), driver: this.name };
  }

  urlFor(key: string) {
    return `/media/${key}`;
  }
}

/** S3 for media. Phase 3, only worth it once traffic or multi-node hosting demands it. */
class S3Storage implements Storage {
  readonly name = 's3';

  async put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<PutResult> {
    const s3 = optionalRequire<S3Module>('@aws-sdk/client-s3');
    if (!s3) throw new MissingDependencyError('@aws-sdk/client-s3', 's3');

    const client = new s3.S3Client({ region: config.storage.s3.region });
    const fullKey = `${config.storage.s3.prefix}${key}`;

    await client.send(
      new s3.PutObjectCommand({
        Bucket: config.storage.s3.bucket,
        Key: fullKey,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return { key: fullKey, url: this.urlFor(key), driver: this.name };
  }

  urlFor(key: string) {
    const base = config.storage.s3.publicBaseUrl;
    if (base) return `${base.replace(/\/$/, '')}/${config.storage.s3.prefix}${key}`;
    return `https://${config.storage.s3.bucket}.s3.${config.storage.s3.region}.amazonaws.com/${config.storage.s3.prefix}${key}`;
  }
}

let instance: Storage | null = null;

export function storage(): Storage {
  if (instance) return instance;
  instance = config.storage.driver === 's3' ? new S3Storage() : new LocalStorage();
  return instance;
}
