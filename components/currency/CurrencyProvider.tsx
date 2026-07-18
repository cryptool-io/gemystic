'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { CURRENCIES, DEFAULT_CURRENCY, CURRENCY_COOKIE, type CurrencyMap } from '@/lib/currency';

interface Ctx {
  currency: string;
  setCurrency: (code: string) => void;
  /** The live table, including anything the owner added in admin. */
  currencies: CurrencyMap;
}

const CurrencyContext = createContext<Ctx>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
  currencies: CURRENCIES,
});

/**
 * Client currency state. The server always renders the USD default (keeping the
 * root layout static so the catalogue prerenders); the real currency resolves
 * on mount from (1) the visitor's saved cookie, then (2) their browser locale.
 *
 * `currencies` comes from the server so owner-managed rates reach every price
 * without each component querying anything.
 */
export function CurrencyProvider({
  children,
  currencies = CURRENCIES,
}: {
  children: React.ReactNode;
  currencies?: CurrencyMap;
}) {
  const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);

  useEffect(() => {
    const fromCookie = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${CURRENCY_COOKIE}=`))
      ?.split('=')[1];
    if (fromCookie && fromCookie in currencies) {
      setCurrencyState(fromCookie);
      return;
    }
    const region = navigator.language.match(/[a-z]{2}-([A-Z]{2})/)?.[1];
    const EUR = ['AT','BE','CY','DE','EE','ES','FI','FR','GR','HR','IE','IT','LT','LU','LV','MT','NL','PT','SI','SK'];
    if (region && EUR.includes(region)) setCurrencyState('EUR');
    else if (region === 'PK') setCurrencyState('PKR');
  }, []);

  function setCurrency(code: string) {
    if (!(code in currencies)) return;
    setCurrencyState(code);
    // A year: the visitor's explicit choice should outlive the session.
    document.cookie = `${CURRENCY_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, currencies }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): Ctx {
  return useContext(CurrencyContext);
}
