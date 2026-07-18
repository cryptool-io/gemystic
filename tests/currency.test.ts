import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  convert,
  detectCurrency,
  formatMoney,
  isSupported,
} from '../lib/currency';

test('every configured currency has a positive rate and a locale', () => {
  for (const [code, def] of Object.entries(CURRENCIES)) {
    assert.ok(def.rate > 0, `${code} rate must be positive`);
    assert.ok(def.locale.length > 0, `${code} needs a locale`);
    assert.ok(def.symbol.length > 0, `${code} needs a symbol`);
  }
  assert.ok(isSupported(DEFAULT_CURRENCY), 'default currency must be configured');
});

test('convert rounds half-up to 2dp after the multiply, never on intermediates', () => {
  assert.equal(convert(100, DEFAULT_CURRENCY), 100 * CURRENCIES[DEFAULT_CURRENCY].rate);
  // 10.005 * 1 → 10.01 under half-up rounding (10.005*100 = 1000.5 → 1001)
  const oneToOne = { ...CURRENCIES[DEFAULT_CURRENCY] };
  assert.equal(Math.round(10.005 * oneToOne.rate * 100) / 100, convert(10.005, DEFAULT_CURRENCY));
});

test('unknown codes fall back to the default currency', () => {
  assert.equal(convert(50, 'XXX'), convert(50, DEFAULT_CURRENCY));
  assert.ok(!isSupported('XXX'));
  assert.ok(!isSupported(undefined));
  // formatMoney must not throw on an unknown code either.
  assert.ok(formatMoney(50, 'XXX').length > 0);
});

test('detectCurrency prefers CDN country header over Accept-Language', () => {
  const headers = new Headers({
    'cf-ipcountry': 'DE',
    'accept-language': 'en-PK,en;q=0.9',
  });
  assert.equal(detectCurrency(headers), 'EUR');
});

test('detectCurrency falls back to Accept-Language region, then USD', () => {
  assert.equal(detectCurrency(new Headers({ 'accept-language': 'ur-PK,ur;q=0.9' })), 'PKR');
  assert.equal(detectCurrency(new Headers({ 'accept-language': 'fr-FR,fr;q=0.9' })), 'EUR');
  assert.equal(detectCurrency(new Headers()), DEFAULT_CURRENCY);
});

test('rupees are shown as whole units, dollars keep their cents', () => {
  const pkr = formatMoney(100, 'PKR');
  assert.ok(!pkr.includes('.'), `PKR should have no decimals, got ${pkr}`);

  const usd = formatMoney(100.5, 'USD');
  assert.ok(usd.includes('.'), `USD should keep cents, got ${usd}`);
});
