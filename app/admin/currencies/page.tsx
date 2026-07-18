import { requireRole } from '@/lib/auth/guard';
import { activeCurrencies } from '@/lib/currency-server';
import { RATES_UPDATED_AT } from '@/lib/currency';
import { hasDatabase } from '@/lib/prisma';
import { CurrencyManager, type RateRow } from '@/components/admin/CurrencyManager';

export const dynamic = 'force-dynamic';

export default async function AdminCurrencies() {
  await requireRole('admin', '/admin/currencies');
  const currencies = await activeCurrencies();

  const rates: RateRow[] = Object.entries(currencies).map(([code, def]) => ({
    code,
    label: def.label,
    symbol: def.symbol,
    rate: def.rate,
    locale: def.locale,
    isBase: code === 'USD',
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Currencies</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Every price is stored in US dollars and converted for display, so these rates change
          what visitors see and never what an order recorded. Rates shipped with the build were
          last set {RATES_UPDATED_AT}; edits made here take over immediately.
        </p>
      </div>

      {!hasDatabase() ? (
        <div className="card p-6 text-sm text-muted">
          DATABASE_URL is not set, so rate edits cannot be saved.
        </div>
      ) : (
        <CurrencyManager rates={rates} />
      )}

      <div className="card p-5 text-sm text-muted">
        <h2 className="font-display text-lg text-fg">Keeping rates honest</h2>
        <p className="mt-2 leading-relaxed">
          These are manual rates, not a live feed. Check them monthly, or after any sharp move in
          the rupee, so a buyer paying in their own currency is never quoted a figure that has
          drifted from what the card issuer will charge. Rupee prices are shown as whole rupees,
          since no stone is priced to the paisa.
        </p>
      </div>
    </div>
  );
}
