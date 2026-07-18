import currenciesJson from '@/data/currencies.json';

/**
 * Multi-currency display.
 *
 * Design rule: prices are STORED in USD only. Conversion happens at the last
 * moment, in one function, from one rates table, so "all calcs must be
 * correct" reduces to one auditable code path. Adding a currency is a new entry
 * in data/currencies.json (admin UI later), nothing else.
 */
export interface CurrencyDef {
  label: string;
  symbol: string;
  rate: number; // units per 1 USD
  locale: string;
}

const file = currenciesJson as unknown as {
  base: string;
  currencies: Record<string, CurrencyDef>;
  ratesUpdatedAt: string;
};

export const CURRENCIES = file.currencies;
export const CURRENCY_CODES = Object.keys(file.currencies);
export const RATES_UPDATED_AT = file.ratesUpdatedAt;
export const DEFAULT_CURRENCY = 'USD';
export const CURRENCY_COOKIE = 'gem_currency';

export type CurrencyMap = Record<string, CurrencyDef>;

export function isSupported(
  code: string | undefined | null,
  rates: CurrencyMap = CURRENCIES,
): code is string {
  return !!code && code in rates;
}

/**
 * Convert a USD amount for display. Half-up rounding to 2dp AFTER the multiply,
 * never on intermediates.
 *
 * `rates` defaults to the shipped table; the provider passes the owner-edited
 * set from the database when one exists. Either way this stays the single
 * conversion path, so an added currency cannot introduce a second rounding rule.
 */
export function convert(usd: number, code: string, rates: CurrencyMap = CURRENCIES): number {
  const def = rates[code] ?? rates[DEFAULT_CURRENCY] ?? CURRENCIES[DEFAULT_CURRENCY];
  return Math.round(usd * def.rate * 100) / 100;
}

/**
 * Currencies whose smallest unit is not worth showing. A rupee price with two
 * decimals reads as a mistake to a Pakistani buyer: nothing costs Rs 284.36.
 */
const WHOLE_UNIT_CURRENCIES = new Set(['PKR', 'JPY', 'KRW', 'VND', 'IDR']);

export function formatMoney(
  usd: number,
  code: string,
  rates: CurrencyMap = CURRENCIES,
): string {
  const resolved = code in rates ? code : DEFAULT_CURRENCY;
  const def = rates[resolved] ?? CURRENCIES[DEFAULT_CURRENCY];
  const whole = WHOLE_UNIT_CURRENCIES.has(resolved);

  return new Intl.NumberFormat(def.locale, {
    style: 'currency',
    currency: resolved,
    ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
  }).format(convert(usd, code, rates));
}

/**
 * Best-guess default currency from the request when no cookie is set yet.
 * Priority: CDN/proxy country header (real IP geolocation when deployed behind
 * Cloudflare/Vercel) → Accept-Language region → USD. The visitor can always
 * override via the header switcher, and the override wins forever after.
 */
const EUR_COUNTRIES = new Set([
  'AT','BE','CY','DE','EE','ES','FI','FR','GR','HR','IE','IT','LT','LU','LV',
  'MT','NL','PT','SI','SK',
]);

export function detectCurrency(headers: Headers): string {
  const country =
    headers.get('cf-ipcountry') ??
    headers.get('x-vercel-ip-country') ??
    headers.get('x-country-code');
  if (country) {
    const c = country.toUpperCase();
    if (EUR_COUNTRIES.has(c)) return 'EUR';
    if (c === 'PK') return 'PKR';
    return 'USD';
  }

  const lang = headers.get('accept-language') ?? '';
  const region = lang.match(/[a-z]{2}-([A-Z]{2})/)?.[1];
  if (region && EUR_COUNTRIES.has(region)) return 'EUR';
  if (region === 'PK') return 'PKR';
  return DEFAULT_CURRENCY;
}
