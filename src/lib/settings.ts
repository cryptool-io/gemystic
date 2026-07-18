import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { config } from './config';

/**
 * Small operational settings the admin edits at runtime (var/settings.json).
 * Read synchronously with a short cache because the catalogue query path is
 * synchronous; writes go through the async saver and clear the cache.
 */
export interface Settings {
  /** Days a sold stone stays visible (with its SOLD banner) before it drops out of listings. */
  soldDisplayDays: number;
}

const DEFAULTS: Settings = { soldDisplayDays: 14 };
const PATH = join(config.paths.var, 'settings.json');

let cache: { at: number; value: Settings } | null = null;

export function getSettings(): Settings {
  if (cache && Date.now() - cache.at < 5000) return cache.value;
  let value = DEFAULTS;
  try {
    if (existsSync(PATH)) {
      value = { ...DEFAULTS, ...JSON.parse(readFileSync(PATH, 'utf8')) };
    }
  } catch {
    value = DEFAULTS;
  }
  cache = { at: Date.now(), value };
  return value;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...getSettings(), ...patch };
  // Sanity bounds: 0 hides sold stones immediately; a year is plainly a mistake.
  next.soldDisplayDays = Math.min(90, Math.max(0, Math.round(next.soldDisplayDays)));
  await mkdir(dirname(PATH), { recursive: true });
  await writeFile(PATH, JSON.stringify(next, null, 2), 'utf8');
  cache = null;
  return next;
}
