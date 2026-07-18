import { createRequire } from 'node:module';

/**
 * Loads a package that is only needed for one deployment mode.
 *
 * `nodemailer` and the AWS SDKs are deliberately NOT dependencies, a self-hosted
 * install should not have to download the AWS SDK to send a contact form. Using
 * `createRequire` at runtime rather than a static import keeps the bundler from
 * trying to resolve these at build time, so the project compiles whether or not
 * they are installed.
 */
export function optionalRequire<T = unknown>(specifier: string): T | null {
  try {
    const require = createRequire(import.meta.url);
    return require(specifier) as T;
  } catch {
    return null;
  }
}

export class MissingDependencyError extends Error {
  constructor(pkg: string, driver: string) {
    super(
      `The "${driver}" driver needs the "${pkg}" package, which is not installed. ` +
        `Run: npm install ${pkg}`,
    );
    this.name = 'MissingDependencyError';
  }
}
